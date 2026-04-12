'use client';

import { useMemo, useState, useCallback } from 'react';
import { AdRecord } from '@/types';
import Sidebar from '@/components/Sidebar';
import ChatPanel from '@/components/ChatPanel';
import Dashboard from '@/components/Dashboard';
import { Shield, GitBranch, Brain, Link2, Menu, LayoutPanelLeft, LayoutPanelTop } from 'lucide-react';
import type { LlmClientConfig } from '@/lib/llm-client-config';
import { isValidClientLlmApiKey } from '@/lib/llm-client-config';

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
  const [llmClient, setLlmClient] = useState<LlmClientConfig | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showDashboardPane, setShowDashboardPane] = useState(false);

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

  const handleDataReplace = useCallback((nextData: AdRecord[]) => {
    setData(nextData);
  }, []);

  const handleDataAppend = useCallback((nextData: AdRecord[]) => {
    setData((prev) => {
      const existingKeys = new Set(prev.map((row) => `${row.date}_${row.channel}_${row.campaign_name}`));
      const uniqueIncoming = nextData.filter((row) => !existingKeys.has(`${row.date}_${row.channel}_${row.campaign_name}`));
      return [...prev, ...uniqueIncoming];
    });
  }, []);

  const handleDataClear = useCallback(() => {
    setData([]);
  }, []);

  const handlePlatformCredentialsChange = useCallback((credentials: Record<string, StoredCredentials>) => {
    setPlatformCredentials(credentials);
  }, []);

  const handleLlmClientChange = useCallback((config: LlmClientConfig | null) => {
    setLlmClient(config);
    if (!isValidClientLlmApiKey(config?.apiKey)) {
      setAgentMode('demo');
    }
  }, []);

  const connectedPlatformCount = Object.keys(platformCredentials).length;
  const browserLlmEnabled = isValidClientLlmApiKey(llmClient?.apiKey);
  const showLlmHeader = browserLlmEnabled || agentMode === 'llm';
  const dataRange = useMemo(() => {
    if (data.length === 0) return null;
    const uniqueDates = [...new Set(data.map((row) => row.date))].sort();
    if (uniqueDates.length === 0) return null;
    return `${uniqueDates[0]} ~ ${uniqueDates[uniqueDates.length - 1]}`;
  }, [data]);

  return (
    <div className="flex h-screen bg-surface-0 relative">
      <div className="hidden lg:block h-full">
        <Sidebar
          data={data}
          onDataReplace={handleDataReplace}
          onDataAppend={handleDataAppend}
          onDataClear={handleDataClear}
          onPlatformDataSynced={handlePlatformDataSynced}
          onPlatformCredentialsChange={handlePlatformCredentialsChange}
          onLlmClientChange={handleLlmClientChange}
        />
      </div>
      {mobileSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="flex-1 bg-black/50"
            aria-label="关闭侧栏遮罩"
          />
          <Sidebar
            className="relative z-50"
            data={data}
            onDataReplace={handleDataReplace}
            onDataAppend={handleDataAppend}
            onDataClear={handleDataClear}
            onPlatformDataSynced={handlePlatformDataSynced}
            onPlatformCredentialsChange={handlePlatformCredentialsChange}
            onLlmClientChange={handleLlmClientChange}
            onClose={() => setMobileSidebarOpen(false)}
          />
        </div>
      )}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between px-6 py-3 border-b border-surface-3/50 bg-surface-1/50 backdrop-blur-sm">
          <div className="flex items-start gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden mt-0.5 p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-surface-2"
              aria-label="打开侧栏"
            >
              <Menu size={16} />
            </button>
            <div>
              <h1 className="text-sm font-semibold text-slate-200">AI 对话分析</h1>
              <p className="text-[11px] text-slate-500">
                {showLlmHeader
                  ? browserLlmEnabled
                    ? '使用你在侧栏填写的 LLM API Key（请求由本站服务端转发）'
                    : '由模型生成策略表达，核心数据由工具计算'
                  : '通过自然语言与投放数据交互，获取可验证的优化建议'}
                {data.length > 0 && ` · ${data.length} 条记录${dataRange ? ` · ${dataRange}` : ''}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {data.length > 0 && (
              <button
                onClick={() => setShowDashboardPane((prev) => !prev)}
                className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] text-slate-400 bg-surface-2/50 border border-surface-4/30 hover:border-brand-500/30 hover:text-brand-300"
              >
                {showDashboardPane ? <LayoutPanelTop size={11} /> : <LayoutPanelLeft size={11} />}
                {showDashboardPane ? '收起看板' : '展开看板'}
              </button>
            )}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] text-slate-500 bg-surface-2/50 border border-surface-4/30">
              <GitBranch size={11} />
              <span>工具计算 + {showLlmHeader ? '模型推理' : '规则分析'} + 数据校验</span>
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
            {showLlmHeader ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] bg-violet-500/10 text-violet-300 border border-violet-500/20">
                <Brain size={11} />
                {browserLlmEnabled ? 'LLM' : 'GPT'}
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
          <div className={`h-full ${showDashboardPane && data.length > 0 ? 'xl:grid xl:grid-cols-[minmax(320px,38%)_1fr]' : ''}`}>
            {showDashboardPane && data.length > 0 && (
              <div className="hidden xl:block h-full overflow-y-auto p-4 border-r border-surface-3/50">
                <div className="mb-3">
                  <h2 className="text-sm font-semibold text-slate-200">主区看板</h2>
                  <p className="text-[11px] text-slate-500 mt-1">先看趋势和渠道指标，再发起追问更高效。</p>
                </div>
                <Dashboard data={data} />
              </div>
            )}
            <ChatPanel
              data={data}
              onModeDetected={handleModeDetected}
              platformCredentials={platformCredentials}
              llmClient={llmClient}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
