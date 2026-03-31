'use client';

import { useState, useEffect, useCallback } from 'react';
import { KeyRound, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react';
import { isValidClientLlmApiKey, type LlmClientConfig } from '@/lib/llm-client-config';

const STORAGE_KEY = 'adpilot_llm_client_v1';

interface LlmSettingsPanelProps {
  onLlmClientChange?: (config: LlmClientConfig | null) => void;
}

function parseStored(raw: string): LlmClientConfig | null {
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    const apiKey = typeof o.apiKey === 'string' ? o.apiKey.trim() : '';
    if (!isValidClientLlmApiKey(apiKey)) return null;
    const baseURL =
      typeof o.baseURL === 'string' && o.baseURL.trim() ? o.baseURL.trim() : undefined;
    const model = typeof o.model === 'string' && o.model.trim() ? o.model.trim() : undefined;
    return { apiKey, ...(baseURL ? { baseURL } : {}), ...(model ? { model } : {}) };
  } catch {
    return null;
  }
}

export default function LlmSettingsPanel({ onLlmClientChange }: LlmSettingsPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const [apiKey, setApiKey] = useState('');
  const [baseURL, setBaseURL] = useState('');
  const [model, setModel] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [savedHint, setSavedHint] = useState<string | null>(null);

  const emitConfig = useCallback(
    (cfg: LlmClientConfig | null) => {
      onLlmClientChange?.(cfg);
    },
    [onLlmClientChange],
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        emitConfig(null);
        return;
      }
      const parsed = parseStored(raw);
      if (parsed) {
        setApiKey(parsed.apiKey);
        setBaseURL(parsed.baseURL || '');
        setModel(parsed.model || '');
        emitConfig(parsed);
      } else {
        emitConfig(null);
      }
    } catch {
      emitConfig(null);
    }
  }, [emitConfig]);

  const handleSave = () => {
    const key = apiKey.trim();
    if (!isValidClientLlmApiKey(key)) {
      setSavedHint('请填写有效的 API Key（长度需大于 10 个字符）');
      return;
    }
    const b = baseURL.trim();
    const m = model.trim();
    const cfg: LlmClientConfig = {
      apiKey: key,
      ...(b ? { baseURL: b } : {}),
      ...(m ? { model: m } : {}),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
    emitConfig(cfg);
    setSavedHint('已保存（仅保存在本机浏览器）');
    window.setTimeout(() => setSavedHint(null), 2500);
  };

  const handleClear = () => {
    setApiKey('');
    setBaseURL('');
    setModel('');
    localStorage.removeItem(STORAGE_KEY);
    emitConfig(null);
    setSavedHint('已清除');
    window.setTimeout(() => setSavedHint(null), 2000);
  };

  return (
    <section className="rounded-xl border border-surface-4/40 bg-surface-2/40 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-surface-2/60 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-violet-500/15 flex items-center justify-center flex-shrink-0">
            <KeyRound size={15} className="text-violet-300" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-200">大模型（BYOK）</p>
            <p className="text-[10px] text-slate-500 truncate">自带 API Key，兼容 OpenAI 协议</p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp size={16} className="text-slate-500 flex-shrink-0" />
        ) : (
          <ChevronDown size={16} className="text-slate-500 flex-shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2.5 border-t border-surface-4/30 pt-3">
          <p className="text-[10px] text-slate-500 leading-relaxed">
            Key 仅保存在本机浏览器；请求会经由此站点服务端转发至模型 API，请勿在公共设备上保存。
          </p>

          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-wide">API Key</label>
            <div className="mt-1 flex rounded-lg border border-surface-4/50 bg-surface-1/80 focus-within:border-brand-500/35">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="sk-… 或服务商提供的 Key"
                autoComplete="off"
                className="flex-1 min-w-0 bg-transparent text-xs text-slate-200 placeholder:text-slate-600 px-2.5 py-2 outline-none"
              />
              <button
                type="button"
                onClick={() => setShowKey(s => !s)}
                className="px-2 text-slate-500 hover:text-slate-300"
                aria-label={showKey ? '隐藏密钥' : '显示密钥'}
              >
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-wide">
              API Base URL（可选）
            </label>
            <input
              type="url"
              value={baseURL}
              onChange={e => setBaseURL(e.target.value)}
              placeholder="默认 https://api.openai.com/v1"
              autoComplete="off"
              className="mt-1 w-full rounded-lg border border-surface-4/50 bg-surface-1/80 text-xs text-slate-200 placeholder:text-slate-600 px-2.5 py-2 outline-none focus:border-brand-500/35"
            />
          </div>

          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-wide">
              模型名（可选）
            </label>
            <input
              type="text"
              value={model}
              onChange={e => setModel(e.target.value)}
              placeholder="如 gpt-4o-mini、deepseek-chat"
              autoComplete="off"
              className="mt-1 w-full rounded-lg border border-surface-4/50 bg-surface-1/80 text-xs text-slate-200 placeholder:text-slate-600 px-2.5 py-2 outline-none focus:border-brand-500/35"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 py-2 rounded-lg text-xs font-medium bg-gradient-to-br from-violet-500 to-brand-600 text-white hover:from-violet-400 hover:to-brand-500 transition-all"
            >
              保存设置
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="px-3 py-2 rounded-lg text-xs font-medium border border-surface-4/50 text-slate-400 hover:text-slate-200 hover:bg-surface-2/80 transition-all"
            >
              清除
            </button>
          </div>

          {savedHint && <p className="text-[10px] text-emerald-400/90">{savedHint}</p>}
        </div>
      )}
    </section>
  );
}
