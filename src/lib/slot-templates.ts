export type SlotKind = 'platform' | 'metric' | 'date_range' | 'text' | 'number';

export interface SlotSegmentText {
  type: 'text';
  value: string;
}

export interface SlotSegmentInput {
  type: 'slot';
  key: string;
  label: string;
  kind: SlotKind;
  options?: string[];
}

export interface SlotTemplate {
  id: string;
  label: string;
  segments: Array<SlotSegmentText | SlotSegmentInput>;
}

export const SLOT_TEMPLATES: SlotTemplate[] = [
  {
    id: 'trend',
    label: '趋势分析',
    segments: [
      { type: 'text', value: '请分析' },
      { type: 'slot', key: 'platform', label: '平台', kind: 'platform' },
      { type: 'text', value: '在' },
      { type: 'slot', key: 'date_range', label: '日期范围', kind: 'date_range' },
      { type: 'text', value: '的' },
      { type: 'slot', key: 'metric', label: '指标', kind: 'metric' },
      { type: 'text', value: '趋势，并给出优化建议。' },
    ],
  },
  {
    id: 'compare',
    label: '跨平台对比',
    segments: [
      { type: 'text', value: '请对比' },
      { type: 'slot', key: 'platform_a', label: '平台A', kind: 'platform' },
      { type: 'text', value: '与' },
      { type: 'slot', key: 'platform_b', label: '平台B', kind: 'platform' },
      { type: 'text', value: '在' },
      { type: 'slot', key: 'date_range', label: '日期范围', kind: 'date_range' },
      { type: 'text', value: '的' },
      { type: 'slot', key: 'metric', label: '指标', kind: 'metric' },
      { type: 'text', value: '表现，指出优先加预算的平台。' },
    ],
  },
  {
    id: 'budget',
    label: '预算建议',
    segments: [
      { type: 'text', value: '请为' },
      { type: 'slot', key: 'platform', label: '平台', kind: 'platform' },
      { type: 'text', value: '在下周给出总预算' },
      { type: 'slot', key: 'budget', label: '预算金额', kind: 'number' },
      { type: 'text', value: '元的分配方案，并说明依据。' },
    ],
  },
  {
    id: 'anomaly',
    label: '异常扫描',
    segments: [
      { type: 'text', value: '请找出' },
      { type: 'slot', key: 'date_range', label: '日期范围', kind: 'date_range' },
      { type: 'text', value: '里' },
      { type: 'slot', key: 'platform', label: '平台', kind: 'platform' },
      { type: 'text', value: '的 CPA 异常计划，并按优先级排序。' },
    ],
  },
];

export const DEFAULT_METRIC_OPTIONS = ['CPA', 'ROI', 'CTR', 'CVR', 'spend', 'conversions'];
export const DEFAULT_DATE_RANGE_OPTIONS = ['最近7天', '最近14天', '最近30天', '本月'];
