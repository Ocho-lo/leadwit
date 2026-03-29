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

const CONFIG = PLATFORM_CONFIGS.kuaishou;

async function apiRequest(
  path: string,
  credentials: PlatformCredentials,
  options: { method?: string; body?: unknown } = {}
) {
  const res = await fetch(`${CONFIG.apiBase}${path}`, {
    method: options.method || (options.body ? 'POST' : 'GET'),
    headers: {
      'Content-Type': 'application/json',
      'Access-Token': credentials.accessToken,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await res.json() as { code: number; message: string; data: unknown };
  if (data.code !== 0) {
    throw new Error(`磁力引擎 API 错误 [${data.code}]: ${data.message}`);
  }
  return data.data;
}

const STATUS_MAP: Record<number, PlatformCampaign['status']> = {
  1: 'active',
  2: 'paused',
  3: 'deleted',
};

export const kuaishouConnector: PlatformConnector = {
  config: CONFIG,

  getOAuthUrl(redirectUri: string, state: string): string {
    const appId = process.env.KUAISHOU_APP_ID || '';
    const params = new URLSearchParams({
      app_id: appId,
      state,
      scope: 'ad_query,ad_manage,report_query',
      redirect_uri: redirectUri,
    });
    return `${CONFIG.oauthUrl}?${params}`;
  },

  async exchangeToken(code: string, _redirectUri: string): Promise<PlatformCredentials> {
    const res = await fetch(CONFIG.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_id: process.env.KUAISHOU_APP_ID,
        secret: process.env.KUAISHOU_SECRET,
        auth_code: code,
        grant_type: 'code',
      }),
    });

    const result = await res.json() as { code: number; data: { access_token: string; refresh_token: string; expires_in: number; advertiser_id: number }; message: string };
    if (result.code !== 0) throw new Error(`Token exchange failed: ${result.message}`);

    return {
      platformId: 'kuaishou',
      accessToken: result.data.access_token,
      refreshToken: result.data.refresh_token,
      expiresAt: Date.now() + result.data.expires_in * 1000,
      advertiserId: result.data.advertiser_id?.toString(),
    };
  },

  async refreshAccessToken(credentials: PlatformCredentials): Promise<PlatformCredentials> {
    const res = await fetch(`${CONFIG.apiBase}/oauth2/authorize/refresh_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_id: process.env.KUAISHOU_APP_ID,
        secret: process.env.KUAISHOU_SECRET,
        refresh_token: credentials.refreshToken,
        grant_type: 'refresh_token',
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
      date: string;
      charge: number;
      show: number;
      click: number;
      conversion: number;
      campaign_name?: string;
    }

    const result = await apiRequest('/v2/report/campaign/query', credentials, {
      body: {
        advertiser_id: Number(params.advertiserId),
        start_date: params.startDate,
        end_date: params.endDate,
        page_size: 500,
        page: 1,
        temporal_granularity: 'DAILY',
        data_fields: ['charge', 'show', 'click', 'conversion'],
      },
    }) as { details: ReportRow[] };

    return (result.details || []).map((row: ReportRow) => ({
      date: row.date || params.startDate,
      channel: '快手',
      campaign_name: row.campaign_name || '快手广告',
      spend: row.charge / 1000 || 0,
      impressions: row.show || 0,
      clicks: row.click || 0,
      conversions: row.conversion || 0,
      revenue: 0,
      new_users: 0,
      retained_d7: 0,
    }));
  },

  async listCampaigns(credentials: PlatformCredentials, advertiserId: string): Promise<PlatformCampaign[]> {
    interface CampaignRow {
      campaign_id: number;
      campaign_name: string;
      status: number;
      day_budget: number;
    }

    const result = await apiRequest('/v2/campaign/list', credentials, {
      body: {
        advertiser_id: Number(advertiserId),
        page_size: 100,
        page: 1,
      },
    }) as { details: CampaignRow[] };

    return (result.details || []).map((c: CampaignRow) => ({
      id: c.campaign_id.toString(),
      name: c.campaign_name,
      status: STATUS_MAP[c.status] || 'pending',
      budget: c.day_budget / 1000,
      budgetMode: 'daily' as const,
      platform: 'kuaishou' as const,
      rawData: c as unknown as Record<string, unknown>,
    }));
  },

  async createCampaign(credentials: PlatformCredentials, params: CreateCampaignParams): Promise<PlatformCampaign> {
    const result = await apiRequest('/v2/campaign/create', credentials, {
      body: {
        advertiser_id: Number(params.advertiserId),
        campaign_name: params.name,
        type: 2,
        day_budget: params.budget * 1000,
      },
    }) as { campaign_id: number };

    return {
      id: result.campaign_id.toString(),
      name: params.name,
      status: 'active',
      budget: params.budget,
      budgetMode: params.budgetMode,
      platform: 'kuaishou',
    };
  },

  async updateCampaign(credentials: PlatformCredentials, params: UpdateCampaignParams): Promise<PlatformCampaign> {
    const body: Record<string, unknown> = {
      advertiser_id: Number(params.advertiserId),
      campaign_id: Number(params.campaignId),
    };
    if (params.name) body.campaign_name = params.name;
    if (params.budget) body.day_budget = params.budget * 1000;

    await apiRequest('/v2/campaign/update', credentials, { body });

    if (params.status) {
      await apiRequest('/v2/campaign/update/status', credentials, {
        body: {
          advertiser_id: Number(params.advertiserId),
          campaign_id: Number(params.campaignId),
          put_status: params.status === 'active' ? 1 : 2,
        },
      });
    }

    return {
      id: params.campaignId,
      name: params.name || '',
      status: params.status || 'active',
      budget: params.budget || 0,
      budgetMode: 'daily',
      platform: 'kuaishou',
    };
  },

  async toggleCampaignStatus(credentials: PlatformCredentials, advertiserId: string, campaignId: string, status: 'active' | 'paused'): Promise<void> {
    await apiRequest('/v2/campaign/update/status', credentials, {
      body: {
        advertiser_id: Number(advertiserId),
        campaign_id: Number(campaignId),
        put_status: status === 'active' ? 1 : 2,
      },
    });
  },
};
