import { AdRecord } from '@/types';
import {
  PlatformConnector,
  PlatformConfig,
  PlatformCredentials,
  PlatformReportParams,
  PlatformCampaign,
  CreateCampaignParams,
  UpdateCampaignParams,
  PLATFORM_CONFIGS,
} from './types';

const CONFIG = PLATFORM_CONFIGS.ocean_engine;

async function apiRequest(
  path: string,
  credentials: PlatformCredentials,
  options: { method?: string; body?: unknown; params?: Record<string, string> } = {}
) {
  const url = new URL(`${CONFIG.apiBase}${path}`);
  if (options.params) {
    Object.entries(options.params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const res = await fetch(url.toString(), {
    method: options.method || (options.body ? 'POST' : 'GET'),
    headers: {
      'Content-Type': 'application/json',
      'Access-Token': credentials.accessToken,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await res.json() as { code: number; message: string; data: unknown };
  if (data.code !== 0) {
    throw new Error(`巨量引擎 API 错误 [${data.code}]: ${data.message}`);
  }
  return data.data;
}

const STATUS_MAP: Record<string, PlatformCampaign['status']> = {
  CAMPAIGN_STATUS_ENABLE: 'active',
  CAMPAIGN_STATUS_DISABLE: 'paused',
  CAMPAIGN_STATUS_DELETE: 'deleted',
  CAMPAIGN_STATUS_ALL: 'active',
  CAMPAIGN_STATUS_NOT_DELETE: 'active',
};

export const oceanEngineConnector: PlatformConnector = {
  config: CONFIG,

  getOAuthUrl(redirectUri: string, state: string): string {
    const appId = process.env.OCEAN_ENGINE_APP_ID || '';
    const params = new URLSearchParams({
      app_id: appId,
      state,
      scope: '[\"report_service\",\"ad_manage\"]',
      redirect_uri: redirectUri,
      rid: crypto.randomUUID(),
    });
    return `${CONFIG.oauthUrl}?${params}`;
  },

  async exchangeToken(code: string, _redirectUri: string): Promise<PlatformCredentials> {
    const res = await fetch(CONFIG.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_id: process.env.OCEAN_ENGINE_APP_ID,
        secret: process.env.OCEAN_ENGINE_SECRET,
        grant_type: 'auth_code',
        auth_code: code,
      }),
    });

    const result = await res.json() as { code: number; data: { access_token: string; refresh_token: string; expires_in: number; advertiser_ids: number[] }; message: string };
    if (result.code !== 0) throw new Error(`Token exchange failed: ${result.message}`);

    return {
      platformId: 'ocean_engine',
      accessToken: result.data.access_token,
      refreshToken: result.data.refresh_token,
      expiresAt: Date.now() + result.data.expires_in * 1000,
      advertiserId: result.data.advertiser_ids?.[0]?.toString(),
    };
  },

  async refreshAccessToken(credentials: PlatformCredentials): Promise<PlatformCredentials> {
    const res = await fetch(`${CONFIG.apiBase}/oauth2/refresh_token/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_id: process.env.OCEAN_ENGINE_APP_ID,
        secret: process.env.OCEAN_ENGINE_SECRET,
        grant_type: 'refresh_token',
        refresh_token: credentials.refreshToken,
      }),
    });

    const result = await res.json() as { code: number; data: { access_token: string; refresh_token: string; expires_in: number }; message: string };
    if (result.code !== 0) throw new Error(`Token refresh failed: ${result.message}`);

    return {
      ...credentials,
      accessToken: result.data.access_token,
      refreshToken: result.data.refresh_token,
      expiresAt: Date.now() + result.data.expires_in * 1000,
    };
  },

  async fetchReportData(credentials: PlatformCredentials, params: PlatformReportParams): Promise<AdRecord[]> {
    interface ReportRow {
      dimensions: { stat_datetime: string };
      metrics: {
        stat_cost: number;
        show_cnt: number;
        click_cnt: number;
        convert_cnt: number;
        attribution_convert_cost?: number;
      };
    }

    const result = await apiRequest('/v3.0/report/ad/get/', credentials, {
      body: {
        advertiser_id: params.advertiserId,
        start_date: params.startDate,
        end_date: params.endDate,
        page_size: 1000,
        group_by: ['STAT_GROUP_BY_FIELD_STAT_TIME', 'STAT_GROUP_BY_FIELD_ID'],
        time_granularity: params.granularity === 'HOUR' ? 'STAT_TIME_GRANULARITY_HOURLY' : 'STAT_TIME_GRANULARITY_DAILY',
        fields: ['stat_cost', 'show_cnt', 'click_cnt', 'convert_cnt', 'attribution_convert_cost'],
      },
    }) as { list: ReportRow[] };

    return (result.list || []).map((row: ReportRow) => ({
      date: row.dimensions.stat_datetime?.split(' ')[0] || params.startDate,
      channel: '抖音',
      campaign_name: `巨量引擎广告`,
      spend: row.metrics.stat_cost || 0,
      impressions: row.metrics.show_cnt || 0,
      clicks: row.metrics.click_cnt || 0,
      conversions: row.metrics.convert_cnt || 0,
      revenue: 0,
      new_users: 0,
      retained_d7: 0,
    }));
  },

  async listCampaigns(credentials: PlatformCredentials, advertiserId: string): Promise<PlatformCampaign[]> {
    interface CampaignRow {
      campaign_id: number;
      campaign_name: string;
      status: string;
      budget: number;
      budget_mode: string;
    }

    const result = await apiRequest('/v3.0/campaign/get/', credentials, {
      body: {
        advertiser_id: advertiserId,
        page_size: 100,
        fields: ['campaign_id', 'campaign_name', 'status', 'budget', 'budget_mode'],
      },
    }) as { list: CampaignRow[] };

    return (result.list || []).map((c: CampaignRow) => ({
      id: c.campaign_id.toString(),
      name: c.campaign_name,
      status: STATUS_MAP[c.status] || 'pending',
      budget: c.budget,
      budgetMode: c.budget_mode === 'BUDGET_MODE_DAY' ? 'daily' as const : 'total' as const,
      platform: 'ocean_engine' as const,
      rawData: c as unknown as Record<string, unknown>,
    }));
  },

  async createCampaign(credentials: PlatformCredentials, params: CreateCampaignParams): Promise<PlatformCampaign> {
    const result = await apiRequest('/v3.0/campaign/create/', credentials, {
      body: {
        advertiser_id: params.advertiserId,
        campaign_name: params.name,
        budget: params.budget,
        budget_mode: params.budgetMode === 'daily' ? 'BUDGET_MODE_DAY' : 'BUDGET_MODE_TOTAL',
        marketing_goal: params.objective || 'CONVERSION',
        landing_type: 'LINK',
      },
    }) as { campaign_id: number };

    return {
      id: result.campaign_id.toString(),
      name: params.name,
      status: 'active',
      budget: params.budget,
      budgetMode: params.budgetMode,
      platform: 'ocean_engine',
    };
  },

  async updateCampaign(credentials: PlatformCredentials, params: UpdateCampaignParams): Promise<PlatformCampaign> {
    const body: Record<string, unknown> = {
      advertiser_id: params.advertiserId,
      campaign_id: params.campaignId,
    };
    if (params.name) body.campaign_name = params.name;
    if (params.budget) body.budget = params.budget;
    if (params.status) {
      body.operation_status = params.status === 'active' ? 'ENABLE' : 'DISABLE';
    }

    await apiRequest('/v3.0/campaign/update/', credentials, { body });

    return {
      id: params.campaignId,
      name: params.name || '',
      status: params.status || 'active',
      budget: params.budget || 0,
      budgetMode: 'daily',
      platform: 'ocean_engine',
    };
  },

  async toggleCampaignStatus(credentials: PlatformCredentials, advertiserId: string, campaignId: string, status: 'active' | 'paused'): Promise<void> {
    await apiRequest('/v3.0/campaign/update/status/', credentials, {
      body: {
        advertiser_id: advertiserId,
        campaign_ids: [campaignId],
        operation_status: status === 'active' ? 'ENABLE' : 'DISABLE',
      },
    });
  },
};
