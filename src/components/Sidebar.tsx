'use client';

import { AdRecord } from '@/types';
import DataUploader from './DataUploader';
import Dashboard from './Dashboard';
import PlatformPanel from './PlatformPanel';
import LlmSettingsPanel from './LlmSettingsPanel';
import type { LlmClientConfig } from '@/lib/llm-client-config';
import { Bot, Shield, Wrench, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';

interface StoredCredentials {
  platformId: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  advertiserId?: string;
}

interface SidebarProps {
  data: AdRecord[];
  onDataLoaded: (data: AdRecord[]) => void;
  onPlatformDataSynced?: (data: AdRecord[], platformName: string) => void;
  onPlatformCredentialsChange?: (credentials: Record<string, StoredCredentials>) => void;
  onLlmClientChange?: (config: LlmClientConfig | null) => void;
}

export default function Sidebar({
  data,
  onDataLoaded,
  onPlatformDataSynced,
  onPlatformCredentialsChange,
  onLlmClientChange,
}: SidebarProps) {
  return (
    <aside className="w-[340px] flex-shrink-0 h-screen bg-surface-1 border-r border-surface-3/50 flex flex-col overflow-hidden">
      <div className="p-4 pb-3 border-b border-surface-3/50">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center glow">
            <Bot size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold gradient-text">AdPilot AI</h1>
            <p className="text-[11px] text-slate-500">智能广告投放策略助手</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <section>
          <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2.5">大模型</h2>
          <LlmSettingsPanel onLlmClientChange={onLlmClientChange} />
        </section>

        <section>
          <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2.5">数据源</h2>
          <DataUploader onDataLoaded={onDataLoaded} hasData={data.length > 0} />
          {data.length > 0 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-[11px] text-slate-500 mt-1.5"
            >
              {data.length} 条记录 · {[...new Set(data.map(r => r.channel))].length} 个渠道 · {[...new Set(data.map(r => r.date))].length} 天
            </motion.p>
          )}
        </section>

        <section>
          <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2.5">平台接入</h2>
          <PlatformPanel
            onDataSynced={onPlatformDataSynced}
            onCredentialsChange={onPlatformCredentialsChange}
          />
        </section>

        {data.length > 0 && (
          <section>
            <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2.5">数据看板</h2>
            <Dashboard data={data} />
          </section>
        )}

        <section>
          <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2.5">防幻觉机制</h2>
          <div className="space-y-2">
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-surface-2/50 border border-surface-4/30">
              <Wrench size={14} className="text-brand-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-slate-300">Tool Use</p>
                <p className="text-[11px] text-slate-500 mt-0.5">所有数据计算通过代码精确执行，不依赖 LLM 生成数字</p>
              </div>
            </div>
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-surface-2/50 border border-surface-4/30">
              <Shield size={14} className="text-emerald-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-slate-300">数据校验</p>
                <p className="text-[11px] text-slate-500 mt-0.5">每个回答的数字都有对应的计算来源，可追溯验证</p>
              </div>
            </div>
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-surface-2/50 border border-surface-4/30">
              <BookOpen size={14} className="text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-slate-300">来源引用</p>
                <p className="text-[11px] text-slate-500 mt-0.5">回答中附带数据来源，让用户可以验证每一个结论</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="p-3 border-t border-surface-3/50 text-center">
        <p className="text-[10px] text-slate-600">Built with Next.js · OpenAI Function Calling · Recharts</p>
      </div>
    </aside>
  );
}
