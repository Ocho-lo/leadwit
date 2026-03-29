import { NextRequest, NextResponse } from 'next/server';
import { getConnector, PlatformId } from '@/lib/platforms';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const platformId = searchParams.get('platform') as PlatformId;
  const action = searchParams.get('action');

  if (!platformId) {
    return NextResponse.json({ error: '缺少 platform 参数' }, { status: 400 });
  }

  try {
    const connector = getConnector(platformId);

    if (action === 'url') {
      const origin = new URL(req.url).origin;
      const redirectUri = `${origin}/api/platforms/oauth?action=callback&platform=${platformId}`;
      const state = crypto.randomUUID();
      const oauthUrl = connector.getOAuthUrl(redirectUri, state);
      return NextResponse.json({ url: oauthUrl, state });
    }

    if (action === 'callback') {
      const code = searchParams.get('code');
      const error = searchParams.get('error');

      if (error) {
        return NextResponse.redirect(new URL(`/?platform_error=${encodeURIComponent(error)}`, req.url));
      }

      if (!code) {
        return NextResponse.redirect(new URL('/?platform_error=missing_code', req.url));
      }

      const origin = new URL(req.url).origin;
      const redirectUri = `${origin}/api/platforms/oauth?action=callback&platform=${platformId}`;
      const credentials = await connector.exchangeToken(code, redirectUri);

      const credJson = encodeURIComponent(JSON.stringify(credentials));
      return NextResponse.redirect(new URL(`/?platform_connected=${platformId}&credentials=${credJson}`, req.url));
    }

    return NextResponse.json({ error: '无效的 action 参数' }, { status: 400 });
  } catch (error) {
    console.error('OAuth error:', error);
    const message = error instanceof Error ? error.message : 'OAuth 流程出错';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
