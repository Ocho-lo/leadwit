export interface AdRecord {
  date: string;
  channel: string;
  campaign_name: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  new_users: number;
  retained_d7: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  toolCalls?: ToolCallInfo[];
  citations?: Citation[];
  isStreaming?: boolean;
}

export interface ToolCallInfo {
  name: string;
  displayName: string;
  args: Record<string, unknown>;
  result: unknown;
  status: 'running' | 'completed' | 'error';
}

export interface Citation {
  text: string;
  source: string;
  value?: string | number;
}

export interface DashboardMetrics {
  totalSpend: number;
  totalRevenue: number;
  totalConversions: number;
  totalNewUsers: number;
  overallROI: number;
  overallCPA: number;
  avgCTR: number;
  avgCVR: number;
}

export interface ChannelMetrics {
  channel: string;
  spend: number;
  revenue: number;
  conversions: number;
  newUsers: number;
  roi: number;
  cpa: number;
  ctr: number;
  cvr: number;
}

export interface TrendDataPoint {
  date: string;
  spend: number;
  revenue: number;
  conversions: number;
  cpa: number;
  roi: number;
}

export interface BudgetRecommendation {
  channel: string;
  currentSpend: number;
  recommendedSpend: number;
  changePercent: number;
  reason: string;
}
