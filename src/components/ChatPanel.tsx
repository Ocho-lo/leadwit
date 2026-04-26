'use client';

import { useState, useRef, useEffect } from 'react';
import { Message, AdRecord } from '@/types';
import MessageBubble from './MessageBubble';
import SlotComposer from './SlotComposer';
import { SHORTCUTS } from '@/lib/shortcuts';
import { calcDataSnapshot, saveSnapshot } from '@/lib/snapshots';
import { Send, Sparkles, Zap, PlayCircle, RotateCcw, Download, Trash2, AlertCircle, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { LlmClientConfig } from '@/lib/llm-client-config';
import { isValidClientLlmApiKey } from '@/lib/llm-client-config';

const QUICK_QUESTIONS = [
  '先给我一份跨平台总览',
  '帮我找出本周异常并排序',
  '给我下周预算建议',
];

interface ChatPanelProps {
  data: AdRecord[];
  onModeDetected?: (mode: 'demo' | 'llm') => void;
  platformCredentials?: Record<string, unknown>;
  llmClient?: LlmClientConfig | null;
}

export default function ChatPanel({ data, onModeDetected, platformCredentials, llmClient }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [lastRequest, setLastRequest] = useState<{ userMessage: string; uploadData?: AdRecord[] } | null>(null);
  const [shortcutIndex, setShortcutIndex] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const platformCredsRef = useRef(platformCredentials);
  const llmClientRef = useRef(llmClient);

  useEffect(() => {
    platformCredsRef.current = platformCredentials;
  }, [platformCredentials]);

  useEffect(() => {
    llmClientRef.current = llmClient;
  }, [llmClient]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    setShortcutIndex(0);
  }, [input]);

  const buildHistory = (): Array<{ role: 'user' | 'assistant'; content: string }> => {
    return messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .filter(m => m.content && !m.isStreaming)
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));
  };

  const sendToAPI = async (userMessage: string, uploadData?: AdRecord[]) => {
    setIsLoading(true);
    setApiError(null);
    setLastRequest({ userMessage, uploadData });

    const streamingId = `msg-${Date.now()}-assistant`;
    setMessages(prev => [...prev, {
      id: streamingId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
    }]);

    try {
      const body: Record<string, unknown> = { message: userMessage };
      body.data = uploadData || (data.length > 0 ? data : undefined);
      body.history = buildHistory();
      const creds = platformCredsRef.current;
      if (creds && Object.keys(creds).length > 0) {
        body.platformCredentials = creds;
      }

      const lc = llmClientRef.current;
      if (lc && isValidClientLlmApiKey(lc.apiKey)) {
        body.llmClient = {
          apiKey: lc.apiKey,
          ...(lc.baseURL ? { baseURL: lc.baseURL } : {}),
          ...(lc.model ? { model: lc.model } : {}),
        };
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await res.json();
      if (!res.ok) {
        const errorCode = typeof result.code === 'string' ? `（${result.code}）` : '';
        const errorMessage = result.message || result.error || result.content || '请求失败';
        throw new Error(`${errorMessage}${errorCode}`);
      }

      if (result.mode && onModeDetected) {
        onModeDetected(result.mode);
      }

      setMessages(prev => prev.map(m =>
        m.id === streamingId ? {
          ...m,
          content: result.content,
          toolCalls: result.toolCalls,
          citations: result.citations,
          isStreaming: false,
        } : m
      ));
    } catch (err) {
      const errorText = err instanceof Error ? err.message : '抱歉，发生了错误，请重试。';
      setApiError(errorText);
      setMessages(prev => prev.map(m =>
        m.id === streamingId ? {
          ...m,
          content: `抱歉，本次分析失败：${errorText}\n\n你可以点击“重试上次请求”再次尝试。`,
          isStreaming: false,
        } : m
      ));
    }

    setIsLoading(false);
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMsg: Message = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');

    await sendToAPI(trimmed);
  };

  const handleQuickQuestion = (q: string) => {
    if (isLoading) return;
    const userMsg: Message = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: q,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMsg]);
    sendToAPI(q);
  };

  const handleStartAnalysis = () => {
    if (isLoading || data.length === 0) return;
    const prompt = '请先基于当前数据，输出一份整体投放概览，并给出 3 条优先优化建议。';
    const userMsg: Message = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: prompt,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    sendToAPI(prompt, data);
  };

  const handleClearChat = () => {
    setMessages([]);
    setApiError(null);
    setLastRequest(null);
    setInput('');
  };

  const handleExportChat = () => {
    if (messages.length === 0) return;
    const markdown = messages
      .filter((msg) => !msg.isStreaming)
      .map((msg) => `## ${msg.role === 'user' ? '用户' : '助手'}\n\n${msg.content}`)
      .join('\n\n');
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `adpilot-chat-${new Date().toISOString().replace(/[:.]/g, '-')}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleRetry = () => {
    if (!lastRequest || isLoading) return;
    sendToAPI(lastRequest.userMessage, lastRequest.uploadData);
  };

  const handlePinSnapshot = () => {
    if (data.length === 0) return;
    const snapshot = calcDataSnapshot(data, { pinnedMessages: messages });
    saveSnapshot(snapshot);
  };

  const handleInsertSlotPrompt = (prompt: string) => {
    if (!prompt || isLoading) return;
    setInput(prompt);
    inputRef.current?.focus();
  };

  const filteredShortcuts = input.startsWith('/')
    ? SHORTCUTS.filter((s) => s.cmd.includes(input.toLowerCase()) || s.label.includes(input.slice(1)))
    : [];

  const applyShortcut = (prompt: string) => {
    setInput(prompt);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (filteredShortcuts.length > 0 && e.key === 'ArrowDown') {
      e.preventDefault();
      setShortcutIndex((prev) => (prev + 1) % filteredShortcuts.length);
      return;
    }
    if (filteredShortcuts.length > 0 && e.key === 'ArrowUp') {
      e.preventDefault();
      setShortcutIndex((prev) => (prev - 1 + filteredShortcuts.length) % filteredShortcuts.length);
      return;
    }
    if (filteredShortcuts.length > 0 && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      applyShortcut(filteredShortcuts[shortcutIndex]?.prompt || filteredShortcuts[0].prompt);
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const showWelcomeNoData = messages.length === 0 && data.length === 0;
  const showReadyToStart = messages.length === 0 && data.length > 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length > 0 && (
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={handlePinSnapshot}
              disabled={data.length === 0}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-amber-200 border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 disabled:opacity-50 transition-colors"
            >
              <Camera size={12} />
              钉住快照
            </button>
            <button
              onClick={handleExportChat}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-slate-300 border border-surface-4/50 bg-surface-2/50 hover:border-brand-500/30 transition-colors"
            >
              <Download size={12} />
              导出对话
            </button>
            <button
              onClick={handleClearChat}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-rose-300 border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 transition-colors"
            >
              <Trash2 size={12} />
              清空对话
            </button>
          </div>
        )}

        {apiError && (
          <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
            <div className="flex items-center gap-1.5 min-w-0">
              <AlertCircle size={13} className="text-rose-300 flex-shrink-0" />
              <p className="text-xs text-rose-200 truncate">{apiError}</p>
            </div>
            <button
              onClick={handleRetry}
              disabled={!lastRequest || isLoading}
              className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] text-rose-100 border border-rose-400/30 hover:bg-rose-500/20 disabled:opacity-40"
            >
              <RotateCcw size={11} />
              重试
            </button>
          </div>
        )}

        {showWelcomeNoData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full text-center px-6"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500/20 to-brand-600/10 border border-brand-500/20 flex items-center justify-center mb-4 glow">
              <Sparkles className="text-brand-400" size={28} />
            </div>
            <h2 className="text-xl font-bold text-slate-100 mb-2">AdPilot AI 策略助手</h2>
            <p className="text-sm text-slate-400 max-w-md mb-4">
              上传广告投放数据或加载示例数据，我会先进行工具计算，再生成策略建议，结果可追溯。
            </p>

            <div className="grid grid-cols-3 gap-3 max-w-lg mb-6">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-surface-2/50 border border-surface-4/30"
              >
                <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center">
                  <Zap size={16} className="text-brand-400" />
                </div>
                <span className="text-[11px] text-slate-400 leading-tight">工具计算<br/>精确分析</span>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-surface-2/50 border border-surface-4/30"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Sparkles size={16} className="text-emerald-400" />
                </div>
                <span className="text-[11px] text-slate-400 leading-tight">数据校验<br/>防幻觉</span>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-surface-2/50 border border-surface-4/30"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Send size={16} className="text-amber-400" />
                </div>
                <span className="text-[11px] text-slate-400 leading-tight">来源引用<br/>可追溯</span>
              </motion.div>
            </div>

            <p className="text-[11px] text-slate-600">点击左侧「加载示例数据」开始体验</p>
          </motion.div>
        )}

        {showReadyToStart && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="h-full flex items-center justify-center px-6"
          >
            <div className="w-full max-w-xl rounded-2xl border border-surface-4/40 bg-surface-2/40 p-5 text-center">
              <h2 className="text-lg font-semibold text-slate-100">数据已就绪，开始分析</h2>
              <p className="text-sm text-slate-400 mt-2">
                你可以先生成一份整体概览，或直接点击下方快捷问题开始提问。
              </p>
              <button
                onClick={handleStartAnalysis}
                disabled={isLoading}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 text-white text-sm hover:from-brand-500 hover:to-brand-600 disabled:opacity-50"
              >
                <PlayCircle size={14} />
                开始分析
              </button>
              <div className="mt-4 flex gap-2 overflow-x-auto pb-1 justify-center">
                {QUICK_QUESTIONS.slice(0, 3).map((q) => (
                  <button
                    key={q}
                    onClick={() => handleQuickQuestion(q)}
                    className="flex-shrink-0 px-3 py-1.5 text-xs rounded-full bg-surface-2 border border-surface-4/50 text-slate-400 hover:text-brand-300 hover:border-brand-500/30 transition-all"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        <AnimatePresence>
          {messages.map(msg => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {messages.length > 0 && data.length > 0 && !isLoading && (
        <div className="px-4 pb-2">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            {QUICK_QUESTIONS.map((q, i) => (
              <button
                key={i}
                onClick={() => handleQuickQuestion(q)}
                className="flex-shrink-0 px-3 py-1.5 text-xs rounded-full bg-surface-2 border border-surface-4/50 text-slate-400 hover:text-brand-300 hover:border-brand-500/30 transition-all"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="p-4 pt-2">
        {data.length > 0 && (
          <div className="mb-2">
            <SlotComposer
              data={data}
              connectedPlatforms={Object.keys(platformCredentials || {})}
              onInsert={handleInsertSlotPrompt}
              disabled={isLoading}
            />
          </div>
        )}
        <div className="flex items-end gap-2 bg-surface-2 border border-surface-4/50 rounded-2xl p-2 focus-within:border-brand-500/40 transition-colors">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => {
              setInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
            }}
            onKeyDown={handleKeyDown}
            placeholder={data.length > 0 ? '输入你的问题，例如"哪个渠道的 CPA 最高？"' : '请先加载数据...'}
            disabled={data.length === 0}
            aria-label="对话输入框"
            rows={1}
            className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-500 resize-none outline-none px-2 py-1.5 max-h-32"
            style={{ minHeight: '36px' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading || data.length === 0}
            className="flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 text-white flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:from-brand-400 hover:to-brand-500 transition-all"
          >
            <Send size={16} />
          </button>
        </div>
        {filteredShortcuts.length > 0 && (
          <div className="mt-1.5 rounded-lg border border-surface-4/50 bg-surface-2/80 overflow-hidden">
            {filteredShortcuts.slice(0, 6).map((shortcut, idx) => (
              <button
                key={shortcut.cmd}
                onClick={() => applyShortcut(shortcut.prompt)}
                className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                  idx === shortcutIndex ? 'bg-brand-500/20 text-brand-100' : 'text-slate-300 hover:bg-surface-3/50'
                }`}
              >
                <span className="mr-2 text-brand-300">{shortcut.cmd}</span>
                <span className="text-slate-400">{shortcut.label}</span>
              </button>
            ))}
          </div>
        )}
        <p className="text-[11px] text-slate-600 text-center mt-2">
          Enter 发送，Shift+Enter 换行，输入 / 可快速调用分析命令
        </p>
      </div>
    </div>
  );
}
