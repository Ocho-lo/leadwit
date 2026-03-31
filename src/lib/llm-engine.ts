import OpenAI from 'openai';
import { AdRecord, ToolCallInfo, Citation } from '@/types';
import { TOOL_DEFINITIONS, executeTool } from './tools';
import { PLATFORM_TOOL_DEFINITIONS, executePlatformTool } from './platform-tools';
import type { PlatformId, PlatformCredentials } from './platforms';
import type { LlmClientConfig } from './llm-client-config';

const SYSTEM_PROMPT = `你是 AdPilot AI，一个专业的广告投放策略分析师。你的任务是基于真实投放数据为用户提供精准分析和策略建议。

## 核心规则

1. **禁止编造数字**：涉及任何数据分析时，必须先调用工具获取精确数据。你绝不能自己猜测或编造任何数值。
2. **工具优先**：面对用户问题，先思考需要调用哪些工具获取数据，拿到数据后再进行分析。
3. **来源标注**：回答中引用的每一个数字，都应说明"根据 [工具名称] 计算"。

## 严格输出格式

你的每次回答必须严格按照以下模板结构输出，不要遗漏任何部分：

### 模板

\`\`\`
## [标题：一句话概括分析主题]

> **结论**：[1-2 句话核心结论，用加粗标出关键数字]

---

### 渠道表现一览

| 渠道 | 花费 | 转化数 | CPA | ROI | CTR | CVR |
|------|------|--------|-----|-----|-----|-----|
| [渠道名] | ¥[数字] | [数字] | ¥[数字] | [数字]% | [数字]% | [数字]% |

> 📊 数据来源：[工具名称]

---

### 关键发现

1. **[发现标题]**：[具体描述，引用数据]
2. **[发现标题]**：[具体描述，引用数据]
3. **[发现标题]**：[具体描述，引用数据]

---

### 策略建议

#### 1. [建议标题]
- **当前问题**：[描述现状和问题]
- **优化方案**：[具体可执行的操作步骤]
- **预期效果**：[量化预期，如"预计 CPA 可降低 X%"]

#### 2. [建议标题]
- **当前问题**：[描述]
- **优化方案**：[操作步骤]
- **预期效果**：[量化预期]

#### 3. [建议标题]
- **当前问题**：[描述]
- **优化方案**：[操作步骤]
- **预期效果**：[量化预期]

---

### 风险提示

- ⚠️ [风险1]
- ⚠️ [风险2]
\`\`\`

### 格式要求
- 渠道表现必须用表格呈现，包含上述所有列
- 如果用户的问题只涉及部分渠道，表格只展示相关渠道，但仍需有表格
- 每条策略建议必须包含"当前问题→优化方案→预期效果"三部分
- 策略建议至少 3 条
- 不要输出思考过程，直接输出最终结果

## 策略知识库

你可以结合以下广告投放领域知识给出专业建议：
- 预算分配：基于 ROI 和边际效益的预算再分配
- 素材优化：素材疲劳度周期（通常 3-7 天需要换素材）、A/B 测试方案
- 出价策略：CPA 出价 vs oCPM 的适用场景
- 人群定向：lookalike 扩量、RTA 实时竞价、DMP 人群包
- 时段优化：分时段出价系数调整
- 留存优化：7 日留存率与 LTV 的关系、用户分层运营

回答请使用中文。不要输出任何 <think> 标签或思考过程。

## 平台管理能力

你还可以通过工具直接操作已连接的广告投放平台：
- **sync_platform_data**：从平台拉取真实投放数据
- **list_campaigns**：查看平台上的广告计划列表
- **create_campaign**：在平台上创建新广告计划（⚠️ 涉及真实资金，操作前必须向用户确认具体参数）
- **update_campaign**：修改广告计划的名称、预算或状态（⚠️ 涉及真实资金，操作前必须确认）

**安全规则**：
- 创建或修改广告计划前，必须先向用户确认所有参数（平台、名称、预算、状态等）
- 收到用户明确确认后才能调用创建/修改工具
- 预算金额单位为"元"`;

const PLATFORM_TOOL_NAMES = new Set(PLATFORM_TOOL_DEFINITIONS.map(t => t.name));

function buildOpenAITools(hasPlatformCredentials: boolean): OpenAI.Chat.Completions.ChatCompletionTool[] {
  const allTools = hasPlatformCredentials
    ? [...TOOL_DEFINITIONS, ...PLATFORM_TOOL_DEFINITIONS]
    : TOOL_DEFINITIONS;

  return allTools.map(t => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters as OpenAI.FunctionParameters,
    },
  }));
}

interface LLMResponse {
  content: string;
  toolCalls: ToolCallInfo[];
  citations: Citation[];
  mode: 'llm';
}

function resolveConfig(clientOverride?: LlmClientConfig | null): {
  apiKey: string;
  baseURL: string;
  model: string;
  provider: string;
  usedBrowserKey: boolean;
} {
  const envKey = (process.env.OPENAI_API_KEY || '').trim();
  const userKey = clientOverride?.apiKey?.trim() || '';
  const apiKey = userKey || envKey;
  const isGoogleKey = apiKey.startsWith('AIzaSy');

  const envBase = process.env.OPENAI_BASE_URL?.trim();
  const envModel = process.env.OPENAI_MODEL?.trim();
  const overrideBase = clientOverride?.baseURL?.trim();
  const overrideModel = clientOverride?.model?.trim();

  if (isGoogleKey) {
    return {
      apiKey,
      baseURL:
        overrideBase ||
        envBase ||
        'https://generativelanguage.googleapis.com/v1beta/openai/',
      model: overrideModel || envModel || 'gemini-2.0-flash',
      provider: 'google',
      usedBrowserKey: !!userKey,
    };
  }

  return {
    apiKey,
    baseURL: overrideBase || envBase || 'https://api.openai.com/v1',
    model: overrideModel || envModel || 'gpt-4o-mini',
    provider: 'openai',
    usedBrowserKey: !!userKey,
  };
}

const PER_REQUEST_TIMEOUT_MS = 60_000;

export async function generateLLMResponse(
  userMessage: string,
  data: AdRecord[],
  history: Array<{ role: 'user' | 'assistant'; content: string }> = [],
  platformCredentials?: Record<PlatformId, PlatformCredentials>,
  clientOverride?: LlmClientConfig | null,
): Promise<LLMResponse> {
  const config = resolveConfig(clientOverride);
  if (!config.apiKey) {
    throw new Error('LLM API Key 未配置（请在页面「大模型」中填写，或配置服务器环境变量 OPENAI_API_KEY）');
  }

  console.log(
    `[AdPilot] Using provider: ${config.provider}, model: ${config.model}, baseURL: ${config.baseURL}, keySource: ${config.usedBrowserKey ? 'browser' : 'env'}`,
  );

  const client = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
    timeout: PER_REQUEST_TIMEOUT_MS,
    maxRetries: 0,
    fetch: globalThis.fetch.bind(globalThis),
  });

  const hasPlatformCreds = !!platformCredentials && Object.keys(platformCredentials).length > 0;
  const tools = buildOpenAITools(hasPlatformCreds);
  const allToolCalls: ToolCallInfo[] = [];
  const allCitations: Citation[] = [];

  const dataContext = summarizeData(data);

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT + `\n\n## 当前数据概况\n${dataContext}` },
  ];

  for (const h of history) {
    messages.push({ role: h.role, content: h.content });
  }

  messages.push({ role: 'user', content: userMessage });

  const MAX_TOOL_ROUNDS = 5;

  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const completion = await client.chat.completions.create({
        model: config.model,
        messages,
        tools,
        temperature: 0.3,
        max_tokens: 2048,
      });

      const choice = completion.choices[0];

      if (choice.finish_reason === 'tool_calls' || choice.message.tool_calls?.length) {
        messages.push(choice.message);

        for (const tc of choice.message.tool_calls || []) {
          const fnName = tc.function.name;
          const fnArgs = JSON.parse(tc.function.arguments || '{}');

          const isPlatformTool = PLATFORM_TOOL_NAMES.has(fnName);
          const allDefs = [...TOOL_DEFINITIONS, ...PLATFORM_TOOL_DEFINITIONS];
          const def = allDefs.find(t => t.name === fnName);

          let result: unknown;
          let citations: Array<{ text: string; source: string; value?: string | number }>;

          if (isPlatformTool) {
            const toolResult = await executePlatformTool(fnName, fnArgs, { platformCredentials });
            result = toolResult.result;
            citations = toolResult.citations;
          } else {
            const toolResult = executeTool(fnName, fnArgs, data);
            result = toolResult.result;
            citations = toolResult.citations;
          }

          allToolCalls.push({
            name: fnName,
            displayName: def?.displayName || fnName,
            args: fnArgs,
            result,
            status: 'completed',
          });
          allCitations.push(...citations);

          messages.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: JSON.stringify(result),
          });
        }

        continue;
      }

      return {
        content: stripThinkTags(choice.message.content || '分析完成，但未生成回答内容。'),
        toolCalls: allToolCalls,
        citations: allCitations,
        mode: 'llm',
      };
    }
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const isTimeout = errMsg.includes('timed out') || errMsg.includes('ETIMEDOUT') || errMsg.includes('timeout');
    const isAuth = errMsg.includes('401') || errMsg.includes('403') || errMsg.includes('Unauthorized') || errMsg.includes('API key');

    console.error(`[AdPilot] LLM error (${config.provider}):`, errMsg);

    let userHint: string;
    if (isTimeout) {
      userHint = `**API 连接超时**（${config.provider} / ${config.baseURL}）\n\n` +
        `当前网络无法正常访问该 API 地址。建议：\n\n` +
        `1. **使用国内可直连的 API**（推荐）：在左侧栏 **大模型** 中填写 Base URL 与模型，或在服务器配置：\n` +
        `   - DeepSeek：Base URL \`https://api.deepseek.com\` + 模型 \`deepseek-chat\`\n` +
        `   - 智谱：\`https://open.bigmodel.cn/api/paas/v4\` + 模型 \`glm-4-flash\`\n` +
        `2. **使用代理**：将 Base URL 改为你的代理地址\n` +
        `3. **继续使用 Demo 模式**：清除页面中的 LLM Key`;
    } else if (isAuth) {
      userHint =
        `**API Key 认证失败**\n\n请检查：\n` +
        (config.usedBrowserKey
          ? `- 左侧栏 **大模型** 里填写的 API Key、API 地址、模型名是否与服务商一致\n`
          : `- 服务器环境变量 \`OPENAI_API_KEY\` 是否正确\n`) +
        `- 或在左侧栏 **大模型** 中使用你自己的 Key（BYOK）`;
    } else {
      userHint = `**API 调用出错**：${errMsg}\n\n请检查网络连接和 API 配置。`;
    }

    return {
      content: userHint,
      toolCalls: allToolCalls,
      citations: allCitations,
      mode: 'llm',
    };
  }

  return {
    content: '分析过程超过最大轮次限制，请尝试简化你的问题。',
    toolCalls: allToolCalls,
    citations: allCitations,
    mode: 'llm',
  };
}

function stripThinkTags(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}

function summarizeData(data: AdRecord[]): string {
  if (data.length === 0) return '暂无数据';

  const channels = [...new Set(data.map(r => r.channel))];
  const dates = [...new Set(data.map(r => r.date))].sort();
  const campaigns = [...new Set(data.map(r => r.campaign_name))];

  return [
    `- 数据量：${data.length} 条记录`,
    `- 时间范围：${dates[0]} 至 ${dates[dates.length - 1]}（${dates.length} 天）`,
    `- 渠道：${channels.join('、')}`,
    `- 活动数量：${campaigns.length} 个`,
    `- 可用工具：${TOOL_DEFINITIONS.map(t => t.displayName).join('、')}`,
  ].join('\n');
}
