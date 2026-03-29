import { AdRecord } from '@/types';
import {
  PlatformConnector,
  PlatformCredentials,
  PlatformReportParams,
  PlatformCampaign,
  CreateCampaignParams,
  UpdateCampaignParams,
  PLATFORM_CONFIGS,
} from './types';

const CONFIG = PLATFORM_CONFIGS.tencent_ads;

async function apiRequest(
  path: string,
  credentials: PlatformCredentials,
  options: { method?: string; body?: unknown; params?: Record<string, string> } = {}
) {
  const url = new URL(`${CONFIG.apiBase}${path}`);
  url.searchParams.set('access_token', credentials.accessToken);
  url.searchParams.set('timestamp', Math.floor(Date.now() / 1000).toString());
  url.searchParams.set('nonce', crypto.randomUUID());
  if (options.params) {
    Object.entries(options.params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const res = await fetch(url.toString(), {
    method: options.method || (options.body ? 'POST' : 'GET'),
    headers: { 'Content-Type': 'application/json' },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await res.json() as { code: number; message: string; data: unknown };
  if (data.code !== 0) {
    throw new Error(`腾讯广告 API 错误 [${data.code}]: ${data.message}`);
  }
  return data.data;
}

const STATUS_MAP: Record<string, PlatformCampaign['status']> = {
  AD_STATUS_NORMAL: 'active',
  AD_STATUS_SUSPEND: 'paused',
  AD_STATUS_DELETED: 'deleted',
  AD_STATUS_PENDING: 'pending',
};

export const tencentAdsConnector: PlatformConnector = {
  config: CONFIG,

  getOAuthUrl(redirectUri: string, state: string): string {
    const clientId = process.env.TENCENT_ADS_CLIENT_ID || '';
    const params = new URLSearchParams({
      client_id: clientId,
      state,
      redirect_uri: redirectUri,
      scope: 'ads_management,ads_reporting',
      response_type: 'code',
    });
    return `${CONFIG.oauthUrl}?${params}`;
  },

  async exchangeToken(code: string, redirectUri: string): Promise<PlatformCredentials> {
    const params = new URLSearchParams({
      client_id: process.env.TENCENT_ADS_CLIENT_ID || '',
      client_secret: process.env.TENCENT_ADS_SECRET || '',
      grant_type: 'authorization_code',
      authorization_code: code,
      redirect_uri: redirectUri,
    });

    const res = await fetch(`${CONFIG.tokenUrl}?${params}`, { method: 'GET' });
    const result = await res.json() as { code: number; data: { access_token: string; refresh_token: string; access_token_expires_in: number; authorizer_info: { account_id: number } }; message: string };
    if (result.code !== 0) throw new Error(`Token exchange failed: ${result.message}`);

    return {
      platformId: 'tencent_ads',
      accessToken: result.data.access_token,
      refreshToken: result.data.refresh_token,
      expiresAt: Date.now() + result.data.access_token_expires_in * 1000,
      advertiserId: result.data.authorizer_info?.account_id?.toString(),
    };
  },

  async refreshAccessToken(credentials: PlatformCredentials): Promise<PlatformCredentials> {
    const params = new URLSearchParams({
      client_id: process.env.TENCENT_ADS_CLIENT_ID || '',
      client_secret: process.env.TENCENT_ADS_SECRET || '',
      grant_type: 'refresh_token',
      refresh_token: credentials.refreshToken || '',
    });

    const res = await fetch(`${CONFIG.tokenUrl}?${params}`, { method: 'GET' });
    const result = await res.json() as { code: number; data: { access_token: string; refresh_token: string; access_token_expires_in: number }; message: string };
    if (result.code !== 0) throw new Error(`Token refresh failed: ${result.message}`);

    return {
      ...credentials,
      accessToken: result.data.access_token,
      refreshToken: result.data.refresh_token,
      expiresAt: Date.now() + result.data.access_token_expires_in * 1000,
    };
  },

  async fetchReportData(credentials: PlatformCredentials, params: PlatformReportParams): Promise<AdRecord[]> {
    interface ReportRow {
      date: string;
      campaign_name?: string;
      cost: number;
      impression: number;
      click: number;
      conversion_count: number;
    }

    const result = await apiRequest('/daily_reports/get', credentials, {
      params: {
        account_id: params.advertiserId,
        level: 'REPORT_LEVEL_CAMPAIGN',
        date_range: JSON.stringify({ start_date: params.startDate, end_date: params.endDate }),
        fields: JSON.stringify(['date', 'campaign_name', 'cost', 'impression', 'click', 'conversion_count']),
        page: '1',
        page_size: '1000',
      },
    }) as { list: ReportRow[] };

    return (result.list || []).map((row: ReportRow) => ({
      date: row.date || params.startDate,
      channel: '微信朋友圈',
      campaign_name: row.campaign_name || '腾讯广告',
      spend: row.cost / 100 || 0,
      impressions: row.impression || 0,
      clicks: row.click || 0,
      conversions: row.conversion_count || 0,
      revenue: 0,
      new_users: 0,
      retained_d7: 0,
    }));
  },

  async listCampaigns(credentials: PlatformCredentials, advertiserId: string): Promise<PlatformCampaign[]> {
    interface CampaignRow {
      campaign_id: number;
      campaign_name: string;
      configured_status: string;
      daily_budget: number;
      budget: number;
    }

    const result = await apiRequest('/campaigns/get', credentials, {
      params: {
        account_id: advertiserId,
        fields: JSON.stringify(['campaign_id', 'campaign_name', 'configured_status', 'daily_budget', 'budget']),
        page: '1',
        page_size: '100',
      },
    }) as { list: CampaignRow[] };

    return (result.list || []).map((c: CampaignRow) => ({
      id: c.campaign_id.toString(),
      name: c.campaign_name,
      status: STATUS_MAP[c.configured_status] || 'pending',
      budget: (c.daily_budget || c.budget) / 100,
      budgetMode: c.daily_budget > 0 ? 'daily' as const : 'total' as const,
      platform: 'tencent_ads' as const,
      rawData: c as unknown as Record<string, unknown>,
    }));
  },

  async createCampaign(credentials: PlatformCredentials, params: CreateCampaignParams): Promise<PlatformCampaign> {
    const result = await apiRequest('/campaigns/add', credentials, {
      body: {
        account_id: Number(params.advertiserId),
        campaign_name: params.name,
        campaign_type: 'CAMPAIGN_TYPE_NORMAL',
        daily_budget: params.budgetMode === 'daily' ? params.budget * 100 : 0,
        total_budget: params.budgetMode === 'total' ? params.budget * 100 : 0,
        promoted_object_type: params.objective || 'PROMOTED_OBJECT_TYPE_LINK',
      },
    }) as { campaign_id: number };

    return {
      id: result.campaign_id.toString(),
      name: params.name,
      status: 'active',
      budget: params.budget,
      budgetMode: params.budgetMode,
      platform: 'tencent_ads',
    };
  },

  async updateCampaign(credentials: PlatformCredentials, params: UpdateCampaignParams): Promise<PlatformCampaign> {
    const body: Record<string, unknown> = {
      account_id: Number(params.advertiserId),
      campaign_id: Number(params.campaignId),
    };
    if (params.name) body.campaign_name = params.name;
    if (params.budget) body.daily_budget = params.budget * 100;
    if (params.status) {
      body.configured_status = params.status === 'active' ? 'AD_STATUS_NORMAL' : 'AD_STATUS_SUSPEND';
    }

    await apiRequest('/campaigns/update', credentials, { body });

    return {
      id: params.campaignId,
      name: params.name || '',
      status: params.status || 'active',
      budget: params.budget || 0,
      budgetMode: 'daily',
      platform: 'tencent_ads',
    };
  },

  async toggleCampaignStatus(credentials: PlatformCredentials, advertiserId: string, campaignId: string, status: 'active' | 'paused'): Promise<void> {
    await apiRequest('/campaigns/update', credentials, {
      body: {
        account_id: Number(advertiserId),
        campaign_id: Number(campaignId),
        configured_status: status === 'active' ? 'AD_STATUS_NORMAL' : 'AD_STATUS_SUSPEND',
      },
    });
  },
};
