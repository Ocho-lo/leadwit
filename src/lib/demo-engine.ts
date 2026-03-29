import { AdRecord, Message, ToolCallInfo, Citation } from '@/types';
import { executeTool, TOOL_DEFINITIONS } from './tools';

interface IntentMatch {
  tools: Array<{ name: string; args: Record<string, unknown> }>;
  responseTemplate: (results: unknown[], data: AdRecord[]) => string;
}

function matchIntent(query: string): IntentMatch | null {
  const q = query.toLowerCase();

  if (q.includes('cpa') && (q.includes('高') || q.includes('最') || q.includes('哪'))) {
    return {
      tools: [{ name: 'calculate_channel_metrics', args: {} }],
      responseTemplate: (results) => {
        const metrics = results[0] as Array<{ channel: string; cpa: number; roi: number; spend: number }>;
        const sorted = [...metrics].sort((a, b) => b.cpa - a.cpa);
        const highest = sorted[0];
        const lowest = sorted[sorted.length - 1];
        return `## 各渠道 CPA 分析\n\n` +
          `经过对投放数据的精确计算，**${highest.channel}** 的 CPA 最高，为 **¥${highest.cpa}**，` +
          `而 **${lowest.channel}** 的 CPA 最低，仅为 **¥${lowest.cpa}**。\n\n` +
          `### 各渠道 CPA 排名\n\n` +
          `| 渠道 | CPA | ROI | 花费 |\n|------|-----|-----|------|\n` +
          sorted.map(m => `| ${m.channel} | ¥${m.cpa} | ${m.roi}% | ¥${m.spend.toLocaleString()} |`).join('\n') +
          `\n\n> 💡 **建议**：关注 ${highest.channel} 的投放效率，其 CPA 是 ${lowest.channel} 的 ${(highest.cpa / lowest.cpa).toFixed(1)} 倍，可考虑优化素材或调整出价策略。`;
      },
    };
  }

  if (q.includes('预算') || q.includes('分配') || q.includes('下周')) {
    return {
      tools: [
        { name: 'calculate_channel_metrics', args: {} },
        { name: 'generate_budget_recommendation', args: {} },
      ],
      responseTemplate: (results) => {
        const recs = results[1] as Array<{ channel: string; currentSpend: number; recommendedSpend: number; changePercent: number; reason: string }>;
        return `## 预算分配优化建议\n\n` +
          `基于各渠道历史表现的综合评分（ROI 权重 40%、CPA 效率权重 30%、转化率权重 30%），以下是优化后的预算分配方案：\n\n` +
          `| 渠道 | 当前预算 | 建议预算 | 调整幅度 |\n|------|---------|---------|----------|\n` +
          recs.map(r => `| ${r.channel} | ¥${r.currentSpend.toLocaleString()} | ¥${r.recommendedSpend.toLocaleString()} | ${r.changePercent > 0 ? '+' : ''}${r.changePercent}% |`).join('\n') +
          `\n\n### 调整理由\n\n` +
          recs.map(r => `- **${r.channel}**：${r.reason}`).join('\n') +
          `\n\n> ⚠️ 以上建议基于历史数据计算得出，实际调整时请结合业务目标和市场环境综合判断。`;
      },
    };
  }

  if (q.includes('趋势') || q.includes('变化') || q.includes('走势')) {
    const channelMatch = extractChannel(q);
    return {
      tools: [{ name: 'get_trend_data', args: channelMatch ? { channel: channelMatch } : {} }],
      responseTemplate: (results) => {
        const trend = results[0] as Array<{ date: string; spend: number; revenue: number; cpa: number; roi: number }>;
        if (trend.length === 0) return '暂无趋势数据。';
        const first = trend[0];
        const last = trend[trend.length - 1];
        const cpaChange = first.cpa > 0 ? ((last.cpa - first.cpa) / first.cpa * 100).toFixed(1) : '0';
        const roiChange = first.roi > 0 ? ((last.roi - first.roi) / first.roi * 100).toFixed(1) : '0';
        return `## 投放趋势分析${channelMatch ? ` - ${channelMatch}` : ''}\n\n` +
          `分析期间共 **${trend.length}** 天的数据：\n\n` +
          `- CPA 变化：¥${first.cpa} → ¥${last.cpa}（${+cpaChange > 0 ? '上升' : '下降'} ${Math.abs(+cpaChange)}%）\n` +
          `- ROI 变化：${first.roi}% → ${last.roi}%（${+roiChange > 0 ? '上升' : '下降'} ${Math.abs(+roiChange)}%）\n\n` +
          `> 📈 整体来看，${+cpaChange < 0 ? '获客成本呈下降趋势，投放效率在改善' : '获客成本有所上升，建议关注素材疲劳度和竞争环境变化'}。`;
      },
    };
  }

  if (q.includes('排名') || q.includes('最好') || q.includes('最差') || q.includes('top') || q.includes('表现')) {
    const isWorst = q.includes('最差') || q.includes('差') || q.includes('worst');
    return {
      tools: [{ name: 'get_top_campaigns', args: { metric: 'roi', order: isWorst ? 'worst' : 'best', limit: 5 } }],
      responseTemplate: (results) => {
        const campaigns = results[0] as Array<{ campaign_name: string; channel: string; roi: number; cpa: number; spend: number; revenue: number }>;
        const label = isWorst ? '表现最差' : '表现最佳';
        return `## ${label}的广告活动 TOP 5\n\n` +
          `| 排名 | 活动名称 | 渠道 | ROI | CPA | 花费 | 收入 |\n|------|---------|------|-----|-----|------|------|\n` +
          campaigns.map((c, i) => `| ${i + 1} | ${c.campaign_name} | ${c.channel} | ${c.roi}% | ¥${c.cpa} | ¥${c.spend.toLocaleString()} | ¥${c.revenue.toLocaleString()} |`).join('\n') +
          `\n\n> 🎯 ${isWorst ? '建议重点关注以上低效活动，考虑暂停或优化后重新投放。' : '以上活动表现优异，可考虑追加预算扩大投放规模。'}`;
      },
    };
  }

  if (q.includes('异常') || q.includes('波动') || q.includes('问题')) {
    return {
      tools: [{ name: 'detect_anomalies', args: {} }],
      responseTemplate: (results) => {
        const anomalies = results[0] as Array<{ date: string; channel: string; metric: string; value: number; expected: number; severity: string }>;
        if (anomalies.length === 0) return '## 异常检测结果\n\n未检测到显著异常，各项指标波动均在合理范围内。';
        return `## 异常检测结果\n\n共检测到 **${anomalies.length}** 个异常数据点：\n\n` +
          `| 日期 | 渠道 | 指标 | 实际值 | 预期值 | 严重程度 |\n|------|------|------|--------|--------|----------|\n` +
          anomalies.map(a => `| ${a.date} | ${a.channel} | ${a.metric} | ¥${a.value} | ¥${a.expected} | ${a.severity === '严重' ? '🔴 严重' : '🟡 警告'} |`).join('\n') +
          `\n\n> 🔍 建议排查以上异常日期的投放情况，可能存在竞品竞价加剧或素材审核延迟等问题。`;
      },
    };
  }

  if (q.includes('概览') || q.includes('总体') || q.includes('整体') || q.includes('汇总') || q.includes('报告')) {
    return {
      tools: [
        { name: 'get_overview', args: {} },
        { name: 'calculate_channel_metrics', args: {} },
      ],
      responseTemplate: (results) => {
        const overview = results[0] as { totalSpend: number; totalRevenue: number; totalConversions: number; totalNewUsers: number; overallROI: number; overallCPA: number; avgCTR: number; avgCVR: number };
        const channels = results[1] as Array<{ channel: string; spend: number; roi: number; cpa: number }>;
        const bestChannel = [...channels].sort((a, b) => b.roi - a.roi)[0];
        return `## 投放数据总览\n\n` +
          `| 指标 | 数值 |\n|------|------|\n` +
          `| 总花费 | ¥${overview.totalSpend.toLocaleString()} |\n` +
          `| 总收入 | ¥${overview.totalRevenue.toLocaleString()} |\n` +
          `| 总转化数 | ${overview.totalConversions.toLocaleString()} |\n` +
          `| 新增用户 | ${overview.totalNewUsers.toLocaleString()} |\n` +
          `| 整体 ROI | ${overview.overallROI}% |\n` +
          `| 平均 CPA | ¥${overview.overallCPA} |\n` +
          `| 平均 CTR | ${overview.avgCTR}% |\n` +
          `| 平均 CVR | ${overview.avgCVR}% |\n\n` +
          `**${bestChannel.channel}** 是当前 ROI 最高的渠道（${bestChannel.roi}%），建议作为核心投放渠道。`;
      },
    };
  }

  return null;
}

function extractChannel(query: string): string | null {
  const channels = ['抖音', '快手', '微信', '头条', '微信朋友圈', '今日头条'];
  for (const ch of channels) {
    if (query.includes(ch)) return ch.includes('微信') ? '微信朋友圈' : ch.includes('头条') ? '今日头条' : ch;
  }
  return null;
}

export async function generateDemoResponse(
  query: string,
  data: AdRecord[]
): Promise<{ content: string; toolCalls: ToolCallInfo[]; citations: Citation[] }> {
  const intent = matchIntent(query);
  const toolCalls: ToolCallInfo[] = [];
  const allCitations: Citation[] = [];

  if (!intent) {
    const fallback = matchIntent(query + ' 概览');
    if (fallback) {
      return generateFromIntent(fallback, data);
    }

    return {
      content: `我可以帮你分析广告投放数据。试试这些问题：\n\n` +
        `- "哪个渠道的 CPA 最高？"\n` +
        `- "帮我制定下周的预算分配方案"\n` +
        `- "投放趋势如何？"\n` +
        `- "哪些活动表现最好？"\n` +
        `- "检测有没有异常数据"\n` +
        `- "给我一份整体投放报告"`,
      toolCalls: [],
      citations: [],
    };
  }

  return generateFromIntent(intent, data);
}

async function generateFromIntent(
  intent: IntentMatch,
  data: AdRecord[]
): Promise<{ content: string; toolCalls: ToolCallInfo[]; citations: Citation[] }> {
  const toolCalls: ToolCallInfo[] = [];
  const allCitations: Citation[] = [];
  const results: unknown[] = [];

  for (const tool of intent.tools) {
    const def = TOOL_DEFINITIONS.find(t => t.name === tool.name);
    const { result, citations } = executeTool(tool.name, tool.args, data);

    toolCalls.push({
      name: tool.name,
      displayName: def?.displayName || tool.name,
      args: tool.args,
      result,
      status: 'completed',
    });

    allCitations.push(...citations);
    results.push(result);
  }

  const content = intent.responseTemplate(results, data);
  return { content, toolCalls, citations: allCitations };
}
