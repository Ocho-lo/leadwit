import { AdRecord } from '@/types';

export type PlatformId = 'ocean_engine' | 'kuaishou' | 'tencent_ads' | 'xiaohongshu';

export interface PlatformConfig {
  id: PlatformId;
  name: string;
  shortName: string;
  channels: string[];
  color: string;
  oauthUrl: string;
  tokenUrl: string;
  apiBase: string;
  scopes: string[];
}

export interface PlatformCredentials {
  platformId: PlatformId;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  advertiserId?: string;
}

export interface PlatformReportParams {
  startDate: string;
  endDate: string;
  advertiserId: string;
  granularity?: 'DAY' | 'HOUR';
}

export interface PlatformCampaign {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'deleted' | 'pending';
  budget: number;
  budgetMode: 'daily' | 'total';
  startDate?: string;
  endDate?: string;
  bidType?: string;
  bidAmount?: number;
  platform: PlatformId;
  rawData?: Record<string, unknown>;
}

export interface CreateCampaignParams {
  advertiserId: string;
  name: string;
  budget: number;
  budgetMode: 'daily' | 'total';
  objective?: string;
  startDate?: string;
  endDate?: string;
  bidType?: string;
  bidAmount?: number;
}

export interface UpdateCampaignParams {
  advertiserId: string;
  campaignId: string;
  name?: string;
  budget?: number;
  status?: 'active' | 'paused';
}

export interface PlatformConnector {
  config: PlatformConfig;
  getOAuthUrl(redirectUri: string, state: string): string;
  exchangeToken(code: string, redirectUri: string): Promise<PlatformCredentials>;
  refreshAccessToken(credentials: PlatformCredentials): Promise<PlatformCredentials>;
  fetchReportData(credentials: PlatformCredentials, params: PlatformReportParams): Promise<AdRecord[]>;
  listCampaigns(credentials: PlatformCredentials, advertiserId: string): Promise<PlatformCampaign[]>;
  createCampaign(credentials: PlatformCredentials, params: CreateCampaignParams): Promise<PlatformCampaign>;
  updateCampaign(credentials: PlatformCredentials, params: UpdateCampaignParams): Promise<PlatformCampaign>;
  toggleCampaignStatus(credentials: PlatformCredentials, advertiserId: string, campaignId: string, status: 'active' | 'paused'): Promise<void>;
}

export const PLATFORM_CONFIGS: Record<PlatformId, PlatformConfig> = {
  ocean_engine: {
    id: 'ocean_engine',
    name: '巨量引擎',
    shortName: '巨量',
    channels: ['抖音', '今日头条', '西瓜视频', '番茄小说'],
    color: '#fe2c55',
    oauthUrl: 'https://open.oceanengine.com/audit/oauth.html',
    tokenUrl: 'https://ad.oceanengine.com/open_api/oauth2/access_token/',
    apiBase: 'https://ad.oceanengine.com/open_api',
    scopes: ['report', 'ad_manage'],
  },
  kuaishou: {
    id: 'kuaishou',
    name: '磁力引擎',
    shortName: '快手',
    channels: ['快手'],
    color: '#ff6600',
    oauthUrl: 'https://developers.e.kuaishou.com/tools/authorize',
    tokenUrl: 'https://ad.e.kuaishou.com/rest/openapi/oauth2/authorize/access_token',
    apiBase: 'https://ad.e.kuaishou.com/rest/openapi',
    scopes: ['report', 'ad_manage'],
  },
  tencent_ads: {
    id: 'tencent_ads',
    name: '腾讯广告',
    shortName: '腾讯',
    channels: ['微信朋友圈', '腾讯新闻', 'QQ空间'],
    color: '#07c160',
    oauthUrl: 'https://developers.e.qq.com/oauth/authorize',
    tokenUrl: 'https://api.e.qq.com/oauth/token',
    apiBase: 'https://api.e.qq.com/v1.3',
    scopes: ['ads_management', 'ads_reporting'],
  },
  xiaohongshu: {
    id: 'xiaohongshu',
    name: '小红书 · 聚光平台',
    shortName: '小红书',
    channels: ['xiaohongshu', 'red_search', 'red_feed'],
    color: '#ff2442',
    oauthUrl: 'https://ad.xiaohongshu.com/open/oauth/authorize',
    tokenUrl: 'https://ad.xiaohongshu.com/open/oauth/token',
    apiBase: 'https://ad.xiaohongshu.com/api/open',
    scopes: ['report', 'campaign_manage'],
  },
};
