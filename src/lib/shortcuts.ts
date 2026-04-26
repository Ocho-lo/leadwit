export interface ShortcutCommand {
  cmd: string;
  label: string;
  prompt: string;
}

export const SHORTCUTS: ShortcutCommand[] = [
  {
    cmd: '/diagnose',
    label: '整体诊断',
    prompt: '请基于当前数据做整体诊断：先调用 get_overview，再 detect_anomalies；输出问题清单与三条最优先动作。',
  },
  {
    cmd: '/compare',
    label: '跨平台对比',
    prompt: '请横向对比所有渠道的 ROI、CPA、CTR 与 CVR，指出最值得加预算和最应该降预算的平台，并说明原因。',
  },
  {
    cmd: '/budget',
    label: '预算优化',
    prompt: '请调用 generate_budget_recommendation，并输出各渠道具体预算调整金额与理由。',
  },
  {
    cmd: '/anomaly',
    label: '异常扫描',
    prompt: '请调用 detect_anomalies，给出 Top 5 异常计划、异常类型、可能原因和修复建议。',
  },
  {
    cmd: '/trend',
    label: '指标趋势',
    prompt: '请调用 get_trend_data，分析近 7/14/30 日花费、转化、ROI 的趋势与拐点。',
  },
  {
    cmd: '/top',
    label: 'Top 计划',
    prompt: '请调用 get_top_campaigns(metric="roi")，输出 Top 10 计划并总结共性。',
  },
];
