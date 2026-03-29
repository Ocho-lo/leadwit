import { AdRecord } from '@/types';
import {
  calculateChannelMetrics,
  calculateTrend,
  getTopCampaigns,
  generateBudgetRecommendation,
  detectAnomalies,
  calculateDashboardMetrics,
} from './analysis';

export interface ToolDefinition {
  name: string;
  displayName: string;
  description: string;
  parameters: Record<string, unknown>;
}

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'calculate_channel_metrics',
    displayName: '渠道指标计算',
    description: '计算各渠道的核心投放指标（CPA、ROI、CTR、CVR等）',
    parameters: {
      type: 'object',
      properties: {
        channel: { type: 'string', description: '渠道名称（可选），不传则返回所有渠道' },
      },
    },
  },
  {
    name: 'get_trend_data',
    displayName: '趋势数据分析',
    description: '获取投放数据的时间趋势，包括花费、收入、转化、CPA、ROI 的每日变化',
    parameters: {
      type: 'object',
      properties: {
        channel: { type: 'string', description: '渠道名称（可选），不传则返回汇总趋势' },
      },
    },
  },
  {
    name: 'get_top_campaigns',
    displayName: '广告活动排名',
    description: '获取表现最好或最差的广告活动排名',
    parameters: {
      type: 'object',
      properties: {
        metric: { type: 'string', enum: ['roi', 'cpa', 'ctr', 'conversions'], description: '排序指标' },
        order: { type: 'string', enum: ['best', 'worst'], description: '排序方向' },
        limit: { type: 'number', description: '返回数量' },
      },
    },
  },
  {
    name: 'generate_budget_recommendation',
    displayName: '预算分配建议',
    description: '基于各渠道的历史表现，生成下一周期的预算分配建议',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'detect_anomalies',
    displayName: '异常检测',
    description: '检测投放数据中的异常波动（如 CPA 突增、转化率骤降等）',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'get_overview',
    displayName: '数据概览',
    description: '获取投放数据的整体概览指标',
    parameters: { type: 'object', properties: {} },
  },
];

export function executeTool(
  name: string,
  args: Record<string, unknown>,
  data: AdRecord[]
): { result: unknown; citations: Array<{ text: string; source: string; value?: string | number }> } {
  const citations: Array<{ text: string; source: string; value?: string | number }> = [];

  switch (name) {
    case 'calculate_channel_metrics': {
      const metrics = calculateChannelMetrics(data);
      const filtered = args.channel
        ? metrics.filter(m => m.channel === args.channel)
        : metrics;

      filtered.forEach(m => {
        citations.push({ text: `${m.channel} CPA`, source: '工具计算: calculate_channel_metrics', value: `¥${m.cpa}` });
        citations.push({ text: `${m.channel} ROI`, source: '工具计算: calculate_channel_metrics', value: `${m.roi}%` });
      });

      return { result: filtered, citations };
    }

    case 'get_trend_data': {
      const trend = calculateTrend(data, args.channel as string | undefined);
      citations.push({ text: '趋势数据', source: '工具计算: get_trend_data', value: `${trend.length} 个数据点` });
      return { result: trend, citations };
    }

    case 'get_top_campaigns': {
      const campaigns = getTopCampaigns(
        data,
        (args.metric as 'roi' | 'cpa' | 'ctr' | 'conversions') || 'roi',
        (args.order as 'best' | 'worst') || 'best',
        (args.limit as number) || 5
      );
      campaigns.forEach(c => {
        citations.push({ text: c.campaign_name, source: '工具计算: get_top_campaigns', value: `ROI ${c.roi}%` });
      });
      return { result: campaigns, citations };
    }

    case 'generate_budget_recommendation': {
      const recommendations = generateBudgetRecommendation(data);
      recommendations.forEach(r => {
        citations.push({
          text: `${r.channel} 预算建议`,
          source: '工具计算: generate_budget_recommendation',
          value: `¥${r.currentSpend} → ¥${r.recommendedSpend}`,
        });
      });
      return { result: recommendations, citations };
    }

    case 'detect_anomalies': {
      const anomalies = detectAnomalies(data);
      anomalies.forEach(a => {
        citations.push({
          text: `${a.date} ${a.channel} ${a.metric} 异常`,
          source: '工具计算: detect_anomalies',
          value: `实际 ¥${a.value} vs 预期 ¥${a.expected}`,
        });
      });
      return { result: anomalies, citations };
    }

    case 'get_overview': {
      const overview = calculateDashboardMetrics(data);
      citations.push({ text: '总花费', source: '工具计算: get_overview', value: `¥${overview.totalSpend.toLocaleString()}` });
      citations.push({ text: '总收入', source: '工具计算: get_overview', value: `¥${overview.totalRevenue.toLocaleString()}` });
      citations.push({ text: '整体 ROI', source: '工具计算: get_overview', value: `${overview.overallROI}%` });
      return { result: overview, citations };
    }

    default:
      return { result: { error: `未知工具: ${name}` }, citations: [] };
  }
}
