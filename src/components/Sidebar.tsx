'use client';

import { useMemo, useState } from 'react';
import { AdRecord } from '@/types';
import DataUploader from './DataUploader';
import Dashboard from './Dashboard';
import PlatformPanel from './PlatformPanel';
import LlmSettingsPanel from './LlmSettingsPanel';
import SnapshotLibrary from './SnapshotLibrary';
import type { LlmClientConfig } from '@/lib/llm-client-config';
import { Bot, Shield, Wrench, BookOpen, X } from 'lucide-react';
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
  onDataReplace: (data: AdRecord[]) => void;
  onDataAppend: (data: AdRecord[]) => void;
  onDataClear: () => void;
  onPlatformDataSynced?: (data: AdRecord[], platformName: string) => void;
  onPlatformCredentialsChange?: (credentials: Record<string, StoredCredentials>) => void;
  onLlmClientChange?: (config: LlmClientConfig | null) => void;
  className?: string;
  onClose?: () => void;
}

export default function Sidebar({
  data,
  onDataReplace,
  onDataAppend,
  onDataClear,
  onPlatformDataSynced,
  onPlatformCredentialsChange,
  onLlmClientChange,
  className = '',
  onClose,
}: SidebarProps) {
  const [activeTab, setActiveTab] = useState<'workspace' | 'platforms' | 'model'>('workspace');
  const dataSummary = useMemo(() => {
    if (data.length === 0) return null;
    const channels = new Set(data.map((item) => item.channel)).size;
    const days = new Set(data.map((item) => item.date)).size;
    return `${data.length} 条记录 · ${channels} 个渠道 · ${days} 天`;
  }, [data]);

  return (
    <aside className={`w-[340px] flex-shrink-0 h-full bg-surface-1 border-r border-surface-3/50 flex flex-col overflow-hidden ${className}`}>
      <div className="p-4 pb-3 border-b border-surface-3/50">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center glow">
              <Bot size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold gradient-text">AdPilot AI</h1>
              <p className="text-[11px] text-slate-500">智能广告投放策略助手</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-surface-2"
              aria-label="关闭侧栏"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      <div className="px-4 pt-3 pb-2 border-b border-surface-3/50">
        <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-surface-2/60 border border-surface-4/30">
          <button
            onClick={() => setActiveTab('workspace')}
            className={`px-2 py-1.5 rounded-md text-[11px] transition-colors ${
              activeTab === 'workspace' ? 'bg-brand-500/20 text-brand-200' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            数据工作台
          </button>
          <button
            onClick={() => setActiveTab('platforms')}
            className={`px-2 py-1.5 rounded-md text-[11px] transition-colors ${
              activeTab === 'platforms' ? 'bg-brand-500/20 text-brand-200' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            平台连接
          </button>
          <button
            onClick={() => setActiveTab('model')}
            className={`px-2 py-1.5 rounded-md text-[11px] transition-colors ${
              activeTab === 'model' ? 'bg-brand-500/20 text-brand-200' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            模型设置
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'workspace' && (
          <>
            <section>
              <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2.5">数据源</h2>
              <DataUploader
                data={data}
                onDataReplace={onDataReplace}
                onDataAppend={onDataAppend}
                onDataClear={onDataClear}
              />
              {dataSummary && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-[11px] text-slate-500 mt-1.5"
                >
                  {dataSummary}
                </motion.p>
              )}
            </section>

            {data.length > 0 && (
              <section>
                <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2.5">数据看板</h2>
                <Dashboard data={data} />
              </section>
            )}
            <section>
              <SnapshotLibrary data={data} />
            </section>
          </>
        )}

        {activeTab === 'platforms' && (
          <section>
            <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2.5">平台接入</h2>
            <PlatformPanel
              onDataSynced={onPlatformDataSynced}
              onCredentialsChange={onPlatformCredentialsChange}
            />
          </section>
        )}

        {activeTab === 'model' && (
          <>
            <section>
              <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2.5">大模型</h2>
              <LlmSettingsPanel onLlmClientChange={onLlmClientChange} />
            </section>

            <section>
              <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2.5">结果可信机制</h2>
              <div className="space-y-2">
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-surface-2/50 border border-surface-4/30">
                  <Wrench size={14} className="text-brand-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-slate-300">工具计算</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">数字由代码执行计算，不依赖模型臆测。</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-surface-2/50 border border-surface-4/30">
                  <Shield size={14} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-slate-300">数据校验</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">每个回答数字均可回溯到计算来源。</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-surface-2/50 border border-surface-4/30">
                  <BookOpen size={14} className="text-amber-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-slate-300">来源引用</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">结果附带引用信息，便于复核和归档。</p>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </div>

      <div className="p-3 border-t border-surface-3/50 text-center">
        <p className="text-[10px] text-slate-600">Built with Next.js · 工具计算 · Recharts</p>
      </div>
    </aside>
  );
}
