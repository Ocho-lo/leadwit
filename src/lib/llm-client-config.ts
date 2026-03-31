export type LlmClientConfig = {
  apiKey: string;
  baseURL?: string;
  model?: string;
};

const PLACEHOLDER_KEY = 'sk-your-key-here';

export function isValidClientLlmApiKey(key: string | undefined | null): boolean {
  if (!key || typeof key !== 'string') return false;
  const t = key.trim();
  return t.length > 10 && t !== PLACEHOLDER_KEY;
}

export function sanitizeLlmClientFromBody(raw: unknown): LlmClientConfig | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const apiKey = typeof o.apiKey === 'string' ? o.apiKey.trim().slice(0, 512) : '';
  if (!isValidClientLlmApiKey(apiKey)) return null;
  const baseURL =
    typeof o.baseURL === 'string' && o.baseURL.trim() ? o.baseURL.trim().slice(0, 2048) : undefined;
  const model =
    typeof o.model === 'string' && o.model.trim() ? o.model.trim().slice(0, 256) : undefined;
  return { apiKey, ...(baseURL ? { baseURL } : {}), ...(model ? { model } : {}) };
}

export function hasValidEnvLlmKey(): boolean {
  return isValidClientLlmApiKey(process.env.OPENAI_API_KEY);
}
