'use client';

import { useState, useCallback } from 'react';
import { AdRecord } from '@/types';
import Sidebar from '@/components/Sidebar';
import ChatPanel from '@/components/ChatPanel';
import { Shield, GitBranch, Brain, Link2 } from 'lucide-react';

interface StoredCredentials {
  platformId: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  advertiserId?: string;
}

export default function Home() {
  const [data, setData] = useState<AdRecord[]>([]);
  const [agentMode, setAgentMode] = useState<'demo' | 'llm'>('demo');
  const [platformCredentials, setPlatformCredentials] = useState<Record<string, StoredCredentials>>({});

  const handleModeDetected = useCallback((mode: 'demo' | 'llm') => {
    setAgentMode(mode);
  }, []);

  const handlePlatformDataSynced = useCallback((syncedData: AdRecord[], _platformName: string) => {
    setData(prev => {
      const existingKeys = new Set(prev.map(r => `${r.date}_${r.channel}_${r.campaign_name}`));
      const newRecords = syncedData.filter(r => !existingKeys.has(`${r.date}_${r.channel}_${r.campaign_name}`));
      return [...prev, ...newRecords];
    });
  }, []);

  const handlePlatformCredentialsChange = useCallback((credentials: Record<string, StoredCredentials>) => {
    setPlatformCredentials(credentials);
  }, []);

  const connectedPlatformCount = Object.keys(platformCredentials).length;

  return (
    <div className="flex h-screen bg-surface-0">
      <Sidebar
        data={data}
        onDataLoaded={setData}
        onPlatformDataSynced={handlePlatformDataSynced}
        onPlatformCredentialsChange={handlePlatformCredentialsChange}
      />
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between px-6 py-3 border-b border-surface-3/50 bg-surface-1/50 backdrop-blur-sm">
          <div>
            <h1 className="text-sm font-semibold text-slate-200">AI 对话分析</h1>
            <p className="text-[11px] text-slate-500">
              {agentMode === 'llm'
                ? '由 GPT 驱动的智能策略分析，数据由代码精确计算'
                : '通过自然语言与投放数据交互，获取精准分析和优化建议'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] text-slate-500 bg-surface-2/50 border border-surface-4/30">
              <GitBranch size={11} />
              <span>Tool Use + {agentMode === 'llm' ? 'Function Calling' : 'RAG'} + 数据校验</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] bg-brand-500/10 text-brand-300 border border-brand-500/20">
              <Shield size={11} />
              <span>防幻觉模式</span>
            </div>
            {connectedPlatformCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] bg-blue-500/10 text-blue-300 border border-blue-500/20">
                <Link2 size={11} />
                {connectedPlatformCount} 平台
              </span>
            )}
            {agentMode === 'llm' ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] bg-violet-500/10 text-violet-300 border border-violet-500/20">
                <Brain size={11} />
                GPT
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Demo
              </span>
            )}
          </div>
        </header>
        <div className="flex-1 overflow-hidden">
          <ChatPanel data={data} onModeDetected={handleModeDetected} platformCredentials={platformCredentials} />
        </div>
      </main>
    </div>
  );
}
