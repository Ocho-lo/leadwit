import { PlatformConnector, PlatformId, PLATFORM_CONFIGS } from './types';
import { oceanEngineConnector } from './ocean-engine';
import { kuaishouConnector } from './kuaishou';
import { tencentAdsConnector } from './tencent-ads';

const CONNECTORS: Record<PlatformId, PlatformConnector> = {
  ocean_engine: oceanEngineConnector,
  kuaishou: kuaishouConnector,
  tencent_ads: tencentAdsConnector,
};

export function getConnector(platformId: PlatformId): PlatformConnector {
  const connector = CONNECTORS[platformId];
  if (!connector) throw new Error(`未知平台: ${platformId}`);
  return connector;
}

export function getAllPlatformConfigs() {
  return Object.values(PLATFORM_CONFIGS);
}

export { PLATFORM_CONFIGS } from './types';
export type { PlatformId, PlatformCredentials, PlatformCampaign, PlatformReportParams, CreateCampaignParams, UpdateCampaignParams } from './types';
