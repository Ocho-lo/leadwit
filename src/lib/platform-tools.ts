import { getConnector, PlatformId, PlatformCredentials, PlatformCampaign } from './platforms';
import type { ToolDefinition } from './tools';

export const PLATFORM_TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'sync_platform_data',
    displayName: '同步平台数据',
    description: '从已连接的广告平台拉取投放报表数据。需要指定平台、日期范围。',
    parameters: {
      type: 'object',
      properties: {
        platform: { type: 'string', enum: ['ocean_engine', 'kuaishou', 'tencent_ads'], description: '广告平台 ID' },
        start_date: { type: 'string', description: '开始日期 (YYYY-MM-DD)' },
        end_date: { type: 'string', description: '结束日期 (YYYY-MM-DD)' },
      },
      required: ['platform', 'start_date', 'end_date'],
    },
  },
  {
    name: 'list_campaigns',
    displayName: '查看广告计划',
    description: '列出指定广告平台上的所有广告计划/推广计划，查看名称、状态、预算等信息。',
    parameters: {
      type: 'object',
      properties: {
        platform: { type: 'string', enum: ['ocean_engine', 'kuaishou', 'tencent_ads'], description: '广告平台 ID' },
      },
      required: ['platform'],
    },
  },
  {
    name: 'create_campaign',
    displayName: '创建广告计划',
    description: '在指定广告平台上创建新的广告计划/推广计划。需要指定名称、预算等参数。此操作涉及真实资金，请先确认用户意图。',
    parameters: {
      type: 'object',
      properties: {
        platform: { type: 'string', enum: ['ocean_engine', 'kuaishou', 'tencent_ads'], description: '广告平台 ID' },
        name: { type: 'string', description: '广告计划名称' },
        budget: { type: 'number', description: '预算金额（元）' },
        budget_mode: { type: 'string', enum: ['daily', 'total'], description: '预算类型：daily=日预算, total=总预算' },
      },
      required: ['platform', 'name', 'budget'],
    },
  },
  {
    name: 'update_campaign',
    displayName: '修改广告计划',
    description: '修改已有广告计划的名称、预算或状态。此操作涉及真实资金，请先确认。',
    parameters: {
      type: 'object',
      properties: {
        platform: { type: 'string', enum: ['ocean_engine', 'kuaishou', 'tencent_ads'], description: '广告平台 ID' },
        campaign_id: { type: 'string', description: '广告计划 ID' },
        name: { type: 'string', description: '新名称（可选）' },
        budget: { type: 'number', description: '新预算金额（元，可选）' },
        status: { type: 'string', enum: ['active', 'paused'], description: '新状态（可选）' },
      },
      required: ['platform', 'campaign_id'],
    },
  },
];

interface PlatformToolContext {
  platformCredentials?: Record<PlatformId, PlatformCredentials>;
}

function getCredentials(
  ctx: PlatformToolContext,
  platformId: PlatformId
): PlatformCredentials {
  const creds = ctx.platformCredentials?.[platformId];
  if (!creds?.accessToken) {
    throw new Error(`未连接${getConnector(platformId).config.name}，请先在左侧面板连接该平台`);
  }
  return creds;
}

export async function executePlatformTool(
  name: string,
  args: Record<string, unknown>,
  ctx: PlatformToolContext,
): Promise<{ result: unknown; citations: Array<{ text: string; source: string; value?: string | number }> }> {
  const citations: Array<{ text: string; source: string; value?: string | number }> = [];

  switch (name) {
    case 'sync_platform_data': {
      const platformId = args.platform as PlatformId;
      const creds = getCredentials(ctx, platformId);
      const connector = getConnector(platformId);

      const data = await connector.fetchReportData(creds, {
        startDate: args.start_date as string,
        endDate: args.end_date as string,
        advertiserId: creds.advertiserId || '',
      });

      citations.push({
        text: `${connector.config.name}数据同步`,
        source: `平台API: ${connector.config.name}`,
        value: `${data.length} 条记录`,
      });

      return { result: { data, count: data.length, platform: connector.config.name }, citations };
    }

    case 'list_campaigns': {
      const platformId = args.platform as PlatformId;
      const creds = getCredentials(ctx, platformId);
      const connector = getConnector(platformId);

      const campaigns = await connector.listCampaigns(creds, creds.advertiserId || '');

      const summary = campaigns.map((c: PlatformCampaign) => ({
        id: c.id,
        name: c.name,
        status: c.status,
        budget: c.budget,
        budgetMode: c.budgetMode,
      }));

      citations.push({
        text: `${connector.config.name}广告计划`,
        source: `平台API: ${connector.config.name}`,
        value: `${campaigns.length} 个计划`,
      });

      return { result: summary, citations };
    }

    case 'create_campaign': {
      const platformId = args.platform as PlatformId;
      const creds = getCredentials(ctx, platformId);
      const connector = getConnector(platformId);

      const campaign = await connector.createCampaign(creds, {
        advertiserId: creds.advertiserId || '',
        name: args.name as string,
        budget: args.budget as number,
        budgetMode: (args.budget_mode as 'daily' | 'total') || 'daily',
      });

      citations.push({
        text: `新建广告计划`,
        source: `平台API: ${connector.config.name}`,
        value: `${campaign.name} (ID: ${campaign.id})`,
      });

      return { result: campaign, citations };
    }

    case 'update_campaign': {
      const platformId = args.platform as PlatformId;
      const creds = getCredentials(ctx, platformId);
      const connector = getConnector(platformId);

      const campaign = await connector.updateCampaign(creds, {
        advertiserId: creds.advertiserId || '',
        campaignId: args.campaign_id as string,
        name: args.name as string | undefined,
        budget: args.budget as number | undefined,
        status: args.status as 'active' | 'paused' | undefined,
      });

      citations.push({
        text: `修改广告计划`,
        source: `平台API: ${connector.config.name}`,
        value: `计划 ${args.campaign_id}`,
      });

      return { result: campaign, citations };
    }

    default:
      return { result: { error: `未知平台工具: ${name}` }, citations: [] };
  }
}
