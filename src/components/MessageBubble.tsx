'use client';

import { Message } from '@/types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion } from 'framer-motion';
import { Bot, User, Wrench, CheckCircle2, ChevronDown, ChevronUp, BookOpen } from 'lucide-react';
import { useState } from 'react';

export default function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  const [showCitations, setShowCitations] = useState(false);
  const [expandedTools, setExpandedTools] = useState<Set<number>>(new Set());

  const toggleTool = (idx: number) => {
    setExpandedTools(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      <div className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center ${
        isUser
          ? 'bg-gradient-to-br from-brand-500 to-brand-600'
          : 'bg-gradient-to-br from-surface-3 to-surface-4 border border-brand-500/20'
      }`}>
        {isUser ? <User size={16} className="text-white" /> : <Bot size={16} className="text-brand-400" />}
      </div>

      <div className={`flex flex-col gap-2 max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="w-full space-y-1.5">
            {message.toolCalls.map((tool, idx) => (
              <div key={idx} className="rounded-lg bg-surface-2/50 border border-surface-4/50 overflow-hidden">
                <button
                  onClick={() => toggleTool(idx)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-surface-3/30 transition-colors"
                >
                  {tool.status === 'completed' ? (
                    <CheckCircle2 size={13} className="text-emerald-400 flex-shrink-0" />
                  ) : (
                    <Wrench size={13} className="text-brand-400 animate-spin flex-shrink-0" />
                  )}
                  <span className="text-brand-300 font-medium">{tool.displayName}</span>
                  <span className="text-slate-500 ml-auto">
                    {expandedTools.has(idx) ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </span>
                </button>
                {expandedTools.has(idx) && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    className="px-3 pb-2 text-xs"
                  >
                    <div className="bg-surface-1 rounded p-2 font-mono text-[11px] text-slate-400 max-h-32 overflow-auto">
                      <div className="text-brand-400/60 mb-1">// 调用参数</div>
                      <pre>{JSON.stringify(tool.args, null, 2) || '{}'}</pre>
                      <div className="text-emerald-400/60 mt-2 mb-1">// 计算结果</div>
                      <pre>{JSON.stringify(tool.result, null, 2)}</pre>
                    </div>
                  </motion.div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className={`rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-gradient-to-br from-brand-600 to-brand-700 text-white'
            : 'bg-surface-2 border border-surface-4/50'
        }`}>
          {message.isStreaming ? (
            <div className="flex items-center gap-2 py-1">
              <div className="flex items-center gap-1.5">
                <span className="typing-dot w-1.5 h-1.5 rounded-full bg-brand-400" />
                <span className="typing-dot w-1.5 h-1.5 rounded-full bg-brand-400" />
                <span className="typing-dot w-1.5 h-1.5 rounded-full bg-brand-400" />
              </div>
              <span className="text-xs text-slate-500">正在分析...</span>
            </div>
          ) : (
            <div className={`markdown-body text-sm leading-relaxed ${isUser ? '' : 'text-slate-200'}`}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>

        {message.citations && message.citations.length > 0 && (
          <div className="w-full">
            <button
              onClick={() => setShowCitations(!showCitations)}
              className="flex items-center gap-1.5 text-xs text-brand-400/70 hover:text-brand-400 transition-colors"
            >
              <BookOpen size={12} />
              <span>{message.citations.length} 个数据来源</span>
              {showCitations ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            {showCitations && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-1.5 space-y-1"
              >
                {message.citations.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 text-[11px] px-2 py-1 rounded bg-surface-2/50 border border-surface-4/30">
                    <span className="text-brand-400/50 font-mono">[{i + 1}]</span>
                    <span className="text-slate-400">{c.text}</span>
                    {c.value && <span className="ml-auto text-emerald-400/80 font-medium">{c.value}</span>}
                  </div>
                ))}
              </motion.div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
