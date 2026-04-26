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

const CONFIG = PLATFORM_CONFIGS.xiaohongshu;

const XHS_PENDING_MSG = '小红书聚光接入需商务审核，请暂用 CSV 上传';

export const xiaohongshuConnector: PlatformConnector = {
  config: CONFIG,

  getOAuthUrl(redirectUri: string, state: string): string {
    const appId = process.env.XIAOHONGSHU_APP_ID || '';
    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: CONFIG.scopes.join(' '),
      state,
    });
    return `${CONFIG.oauthUrl}?${params.toString()}`;
  },

  async exchangeToken(_code: string, _redirectUri: string): Promise<PlatformCredentials> {
    throw new Error(XHS_PENDING_MSG);
  },

  async refreshAccessToken(_credentials: PlatformCredentials): Promise<PlatformCredentials> {
    throw new Error(XHS_PENDING_MSG);
  },

  async fetchReportData(_credentials: PlatformCredentials, _params: PlatformReportParams): Promise<AdRecord[]> {
    throw new Error(XHS_PENDING_MSG);
  },

  async listCampaigns(_credentials: PlatformCredentials, _advertiserId: string): Promise<PlatformCampaign[]> {
    throw new Error(XHS_PENDING_MSG);
  },

  async createCampaign(_credentials: PlatformCredentials, _params: CreateCampaignParams): Promise<PlatformCampaign> {
    throw new Error(XHS_PENDING_MSG);
  },

  async updateCampaign(_credentials: PlatformCredentials, _params: UpdateCampaignParams): Promise<PlatformCampaign> {
    throw new Error(XHS_PENDING_MSG);
  },

  async toggleCampaignStatus(
    _credentials: PlatformCredentials,
    _advertiserId: string,
    _campaignId: string,
    _status: 'active' | 'paused'
  ): Promise<void> {
    throw new Error(XHS_PENDING_MSG);
  },
};
