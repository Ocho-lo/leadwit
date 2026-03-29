import { NextRequest, NextResponse } from 'next/server';
import { getConnector, PlatformId, PlatformCredentials } from '@/lib/platforms';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { platformId, credentials, startDate, endDate, advertiserId } = body as {
      platformId: PlatformId;
      credentials: PlatformCredentials;
      startDate: string;
      endDate: string;
      advertiserId: string;
    };

    if (!platformId || !credentials?.accessToken) {
      return NextResponse.json({ error: '缺少平台凭证' }, { status: 400 });
    }

    if (!startDate || !endDate) {
      return NextResponse.json({ error: '缺少日期范围' }, { status: 400 });
    }

    const connector = getConnector(platformId);
    const data = await connector.fetchReportData(credentials, {
      startDate,
      endDate,
      advertiserId: advertiserId || credentials.advertiserId || '',
    });

    return NextResponse.json({
      success: true,
      data,
      count: data.length,
      platform: connector.config.name,
    });
  } catch (error) {
    console.error('Platform sync error:', error);
    const message = error instanceof Error ? error.message : '数据同步失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
