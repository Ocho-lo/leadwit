import { NextRequest, NextResponse } from 'next/server';
import { getConnector, PlatformId, PlatformCredentials } from '@/lib/platforms';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, platformId, credentials, advertiserId, ...params } = body as {
      action: 'list' | 'create' | 'update' | 'toggle';
      platformId: PlatformId;
      credentials: PlatformCredentials;
      advertiserId: string;
      [key: string]: unknown;
    };

    if (!platformId || !credentials?.accessToken) {
      return NextResponse.json({ error: '缺少平台凭证' }, { status: 400 });
    }

    const connector = getConnector(platformId);
    const advId = advertiserId || credentials.advertiserId || '';

    switch (action) {
      case 'list': {
        const campaigns = await connector.listCampaigns(credentials, advId);
        return NextResponse.json({ success: true, campaigns });
      }

      case 'create': {
        const campaign = await connector.createCampaign(credentials, {
          advertiserId: advId,
          name: params.name as string,
          budget: params.budget as number,
          budgetMode: (params.budgetMode as 'daily' | 'total') || 'daily',
          objective: params.objective as string | undefined,
        });
        return NextResponse.json({ success: true, campaign });
      }

      case 'update': {
        const campaign = await connector.updateCampaign(credentials, {
          advertiserId: advId,
          campaignId: params.campaignId as string,
          name: params.name as string | undefined,
          budget: params.budget as number | undefined,
          status: params.status as 'active' | 'paused' | undefined,
        });
        return NextResponse.json({ success: true, campaign });
      }

      case 'toggle': {
        await connector.toggleCampaignStatus(
          credentials,
          advId,
          params.campaignId as string,
          params.status as 'active' | 'paused',
        );
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: '无效的操作类型' }, { status: 400 });
    }
  } catch (error) {
    console.error('Campaign API error:', error);
    const message = error instanceof Error ? error.message : '广告计划操作失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
