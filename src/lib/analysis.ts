import {
  AdRecord,
  DashboardMetrics,
  ChannelMetrics,
  TrendDataPoint,
  BudgetRecommendation,
} from '@/types';

export function calculateDashboardMetrics(data: AdRecord[]): DashboardMetrics {
  const totalSpend = data.reduce((sum, r) => sum + r.spend, 0);
  const totalRevenue = data.reduce((sum, r) => sum + r.revenue, 0);
  const totalConversions = data.reduce((sum, r) => sum + r.conversions, 0);
  const totalNewUsers = data.reduce((sum, r) => sum + r.new_users, 0);
  const totalImpressions = data.reduce((sum, r) => sum + r.impressions, 0);
  const totalClicks = data.reduce((sum, r) => sum + r.clicks, 0);

  return {
    totalSpend,
    totalRevenue,
    totalConversions,
    totalNewUsers,
    overallROI: totalSpend > 0 ? +((totalRevenue - totalSpend) / totalSpend * 100).toFixed(1) : 0,
    overallCPA: totalConversions > 0 ? +(totalSpend / totalConversions).toFixed(2) : 0,
    avgCTR: totalImpressions > 0 ? +(totalClicks / totalImpressions * 100).toFixed(2) : 0,
    avgCVR: totalClicks > 0 ? +(totalConversions / totalClicks * 100).toFixed(2) : 0,
  };
}

export function calculateChannelMetrics(data: AdRecord[]): ChannelMetrics[] {
  const channelMap = new Map<string, AdRecord[]>();
  data.forEach(r => {
    const arr = channelMap.get(r.channel) || [];
    arr.push(r);
    channelMap.set(r.channel, arr);
  });

  return Array.from(channelMap.entries()).map(([channel, records]) => {
    const spend = records.reduce((s, r) => s + r.spend, 0);
    const revenue = records.reduce((s, r) => s + r.revenue, 0);
    const conversions = records.reduce((s, r) => s + r.conversions, 0);
    const newUsers = records.reduce((s, r) => s + r.new_users, 0);
    const impressions = records.reduce((s, r) => s + r.impressions, 0);
    const clicks = records.reduce((s, r) => s + r.clicks, 0);

    return {
      channel,
      spend,
      revenue,
      conversions,
      newUsers,
      roi: spend > 0 ? +((revenue - spend) / spend * 100).toFixed(1) : 0,
      cpa: conversions > 0 ? +(spend / conversions).toFixed(2) : 0,
      ctr: impressions > 0 ? +(clicks / impressions * 100).toFixed(2) : 0,
      cvr: clicks > 0 ? +(conversions / clicks * 100).toFixed(2) : 0,
    };
  });
}

export function calculateTrend(data: AdRecord[], channel?: string): TrendDataPoint[] {
  let filtered = channel ? data.filter(r => r.channel === channel) : data;
  const dateMap = new Map<string, AdRecord[]>();
  filtered.forEach(r => {
    const arr = dateMap.get(r.date) || [];
    arr.push(r);
    dateMap.set(r.date, arr);
  });

  return Array.from(dateMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, records]) => {
      const spend = records.reduce((s, r) => s + r.spend, 0);
      const revenue = records.reduce((s, r) => s + r.revenue, 0);
      const conversions = records.reduce((s, r) => s + r.conversions, 0);
      return {
        date: date.slice(5),
        spend,
        revenue,
        conversions,
        cpa: conversions > 0 ? +(spend / conversions).toFixed(2) : 0,
        roi: spend > 0 ? +((revenue - spend) / spend * 100).toFixed(1) : 0,
      };
    });
}

export function getTopCampaigns(
  data: AdRecord[],
  metric: 'roi' | 'cpa' | 'ctr' | 'conversions' = 'roi',
  order: 'best' | 'worst' = 'best',
  limit: number = 5
) {
  const campaignMap = new Map<string, AdRecord[]>();
  data.forEach(r => {
    const arr = campaignMap.get(r.campaign_name) || [];
    arr.push(r);
    campaignMap.set(r.campaign_name, arr);
  });

  const campaignMetrics = Array.from(campaignMap.entries()).map(([name, records]) => {
    const spend = records.reduce((s, r) => s + r.spend, 0);
    const revenue = records.reduce((s, r) => s + r.revenue, 0);
    const conversions = records.reduce((s, r) => s + r.conversions, 0);
    const impressions = records.reduce((s, r) => s + r.impressions, 0);
    const clicks = records.reduce((s, r) => s + r.clicks, 0);

    return {
      campaign_name: name,
      channel: records[0].channel,
      spend,
      revenue,
      conversions,
      roi: spend > 0 ? +((revenue - spend) / spend * 100).toFixed(1) : 0,
      cpa: conversions > 0 ? +(spend / conversions).toFixed(2) : 0,
      ctr: impressions > 0 ? +(clicks / impressions * 100).toFixed(2) : 0,
    };
  });

  const sorted = campaignMetrics.sort((a, b) => {
    const va = a[metric] as number;
    const vb = b[metric] as number;
    if (metric === 'cpa') return order === 'best' ? va - vb : vb - va;
    return order === 'best' ? vb - va : va - vb;
  });

  return sorted.slice(0, limit);
}

export function generateBudgetRecommendation(data: AdRecord[]): BudgetRecommendation[] {
  const channelMetrics = calculateChannelMetrics(data);
  const totalBudget = channelMetrics.reduce((s, c) => s + c.spend, 0);

  const scored = channelMetrics.map(c => ({
    ...c,
    score: c.roi * 0.4 + (1 / Math.max(c.cpa, 1)) * 1000 * 0.3 + c.cvr * 0.3,
  }));

  const totalScore = scored.reduce((s, c) => s + c.score, 0);

  return scored.map(c => {
    const idealShare = totalScore > 0 ? c.score / totalScore : 1 / scored.length;
    const recommended = +(totalBudget * idealShare).toFixed(0);
    const change = c.spend > 0 ? +((recommended - c.spend) / c.spend * 100).toFixed(1) : 0;

    let reason = '';
    if (change > 10) {
      reason = `${c.channel}的 ROI(${c.roi}%) 和转化率(${c.cvr}%) 表现优秀，建议增加预算以获取更多转化`;
    } else if (change < -10) {
      reason = `${c.channel}的 CPA(¥${c.cpa}) 偏高，ROI(${c.roi}%) 低于平均水平，建议适当缩减并优化投放策略`;
    } else {
      reason = `${c.channel}当前预算分配合理，维持现有水平`;
    }

    return {
      channel: c.channel,
      currentSpend: c.spend,
      recommendedSpend: recommended,
      changePercent: +change,
      reason,
    };
  });
}

export function detectAnomalies(data: AdRecord[]): Array<{ date: string; channel: string; metric: string; value: number; expected: number; severity: string }> {
  const anomalies: Array<{ date: string; channel: string; metric: string; value: number; expected: number; severity: string }> = [];
  const channels = [...new Set(data.map(r => r.channel))];

  channels.forEach(channel => {
    const records = data.filter(r => r.channel === channel).sort((a, b) => a.date.localeCompare(b.date));
    if (records.length < 3) return;

    const cpas = records.map(r => r.conversions > 0 ? r.spend / r.conversions : 0);
    const avgCPA = cpas.reduce((s, v) => s + v, 0) / cpas.length;
    const stdCPA = Math.sqrt(cpas.reduce((s, v) => s + (v - avgCPA) ** 2, 0) / cpas.length);

    records.forEach((r, i) => {
      const cpa = cpas[i];
      if (cpa > 0 && Math.abs(cpa - avgCPA) > 1.5 * stdCPA) {
        anomalies.push({
          date: r.date,
          channel,
          metric: 'CPA',
          value: +cpa.toFixed(2),
          expected: +avgCPA.toFixed(2),
          severity: Math.abs(cpa - avgCPA) > 2 * stdCPA ? '严重' : '警告',
        });
      }
    });
  });

  return anomalies;
}
