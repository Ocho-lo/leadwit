import { NextRequest, NextResponse } from 'next/server';
import { AdRecord } from '@/types';
import { generateDemoResponse } from '@/lib/demo-engine';
import { generateLLMResponse } from '@/lib/llm-engine';
import type { PlatformId, PlatformCredentials } from '@/lib/platforms';
import {
  hasValidEnvLlmKey,
  sanitizeLlmClientFromBody,
  type LlmClientConfig,
} from '@/lib/llm-client-config';

function resolveLlmClient(body: Record<string, unknown>): LlmClientConfig | null {
  return sanitizeLlmClientFromBody(body.llmClient);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, data, history, platformCredentials } = body as {
      message: string;
      data?: AdRecord[];
      history?: Array<{ role: 'user' | 'assistant'; content: string }>;
      platformCredentials?: Record<PlatformId, PlatformCredentials>;
      llmClient?: unknown;
    };

    if (typeof message !== 'string') {
      return NextResponse.json(
        { code: 'INVALID_MESSAGE', message: '消息格式错误，请输入文本问题。', content: '消息格式错误，请输入文本问题。', toolCalls: [], citations: [], mode: 'demo' },
        { status: 400 }
      );
    }

    const clientLlm = resolveLlmClient(body as Record<string, unknown>);
    const mode = hasValidEnvLlmKey() || clientLlm ? 'llm' : 'demo';
    const currentData = data && data.length > 0 ? data : [];

    if (!message && currentData.length > 0) {
      const connectedPlatforms = platformCredentials ? Object.keys(platformCredentials) : [];
      const platformHint = connectedPlatforms.length > 0
        ? `\n\n已连接广告平台：${connectedPlatforms.length} 个。你还可以：\n- "从抖音同步最近7天的投放数据"\n- "查看巨量引擎上的广告计划"\n- "帮我创建一个新的广告计划"`
        : '';

      return NextResponse.json({
        content: `已成功加载 **${currentData.length}** 条广告投放数据！\n\n数据涵盖以下渠道：${[...new Set(currentData.map(r => r.channel))].join('、')}\n\n你可以开始提问了，例如：\n- "哪个渠道的 CPA 最高？"\n- "帮我制定下周的预算分配方案"\n- "各渠道的投放趋势如何？"\n- "我应该怎么优化投放策略？"${platformHint}`,
        toolCalls: [],
        citations: [],
        mode,
      });
    }

    if (currentData.length === 0) {
      const hasConnectedPlatforms = platformCredentials && Object.keys(platformCredentials).length > 0;
      return NextResponse.json({
        content: hasConnectedPlatforms
          ? '你已连接广告平台。可以说"从平台同步数据"来拉取投放数据，或上传 CSV / 加载示例数据。'
          : '请先上传广告投放数据，或点击"加载示例数据"来开始体验。也可以在左侧连接广告平台直接导入数据。',
        toolCalls: [],
        citations: [],
        mode,
      });
    }

    if (mode === 'llm') {
      const response = await generateLLMResponse(
        message,
        currentData,
        history || [],
        platformCredentials,
        clientLlm ?? undefined,
      );
      return NextResponse.json(response);
    }

    const response = await generateDemoResponse(message, currentData);
    return NextResponse.json({ ...response, mode });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      {
        code: 'CHAT_INTERNAL_ERROR',
        message: '处理请求时发生错误，请重试。',
        content: '处理请求时发生错误，请重试。',
        toolCalls: [],
        citations: [],
        mode: 'demo',
      },
      { status: 500 }
    );
  }
}
