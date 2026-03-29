'use client';

import { useState, useRef, useEffect } from 'react';
import { Message, AdRecord } from '@/types';
import MessageBubble from './MessageBubble';
import { Send, Sparkles, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const QUICK_QUESTIONS = [
  '哪个渠道的 CPA 最高？',
  '帮我制定下周的预算分配方案',
  '各渠道投放趋势如何？',
  '哪些活动表现最好？',
  '检测有没有异常数据',
  '给我一份整体投放报告',
];

interface ChatPanelProps {
  data: AdRecord[];
  onModeDetected?: (mode: 'demo' | 'llm') => void;
  platformCredentials?: Record<string, unknown>;
}

export default function ChatPanel({ data, onModeDetected, platformCredentials }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const platformCredsRef = useRef(platformCredentials);

  useEffect(() => {
    platformCredsRef.current = platformCredentials;
  }, [platformCredentials]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (data.length > 0 && messages.length === 0) {
      sendToAPI('', data);
    }
  }, [data]);

  const buildHistory = (): Array<{ role: 'user' | 'assistant'; content: string }> => {
    return messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .filter(m => m.content && !m.isStreaming)
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));
  };

  const sendToAPI = async (userMessage: string, uploadData?: AdRecord[]) => {
    setIsLoading(true);

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

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await res.json();

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
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === streamingId ? {
          ...m,
          content: '抱歉，发生了错误，请重试。',
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const showWelcome = messages.length === 0 && data.length === 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {showWelcome && (
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
              上传广告投放数据或加载示例数据，我将通过<span className="text-brand-400"> Function Calling </span>
              进行精确计算分析，杜绝 AI 幻觉。
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
                <span className="text-[11px] text-slate-400 leading-tight">Tool Use<br/>精确计算</span>
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
        <p className="text-[11px] text-slate-600 text-center mt-2">
          AdPilot AI 通过 Tool Use 机制调用代码执行精确计算 · 所有数据可追溯验证
        </p>
      </div>
    </div>
  );
}
