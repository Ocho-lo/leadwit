'use client';

import { useState, useEffect, useCallback } from 'react';
import { AdRecord } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Link2, Unlink, RefreshCw, ChevronDown, ChevronUp,
  Calendar, Download, AlertCircle, CheckCircle2,
} from 'lucide-react';

interface PlatformInfo {
  id: string;
  name: string;
  shortName: string;
  color: string;
  channels: string[];
}

const PLATFORMS: PlatformInfo[] = [
  { id: 'ocean_engine', name: '巨量引擎', shortName: '巨量', color: '#fe2c55', channels: ['抖音', '今日头条'] },
  { id: 'kuaishou', name: '磁力引擎', shortName: '快手', color: '#ff6600', channels: ['快手'] },
  { id: 'tencent_ads', name: '腾讯广告', shortName: '腾讯', color: '#07c160', channels: ['微信朋友圈'] },
];

interface StoredCredentials {
  platformId: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  advertiserId?: string;
}

interface PlatformPanelProps {
  onDataSynced?: (data: AdRecord[], platformName: string) => void;
  onCredentialsChange?: (credentials: Record<string, StoredCredentials>) => void;
}

export default function PlatformPanel({ onDataSynced, onCredentialsChange }: PlatformPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [connections, setConnections] = useState<Record<string, StoredCredentials>>({});
  const [syncing, setSyncing] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncSuccess, setSyncSuccess] = useState<string | null>(null);
  const [tokenInput, setTokenInput] = useState<{ platformId: string; token: string; advertiserId: string } | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('adpilot_platform_credentials');
      if (saved) {
        const parsed = JSON.parse(saved);
        setConnections(parsed);
        onCredentialsChange?.(parsed);
      }
    } catch { /* ignore */ }
  }, []);

  const saveConnections = useCallback((newConnections: Record<string, StoredCredentials>) => {
    setConnections(newConnections);
    localStorage.setItem('adpilot_platform_credentials', JSON.stringify(newConnections));
    onCredentialsChange?.(newConnections);
  }, [onCredentialsChange]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const platformConnected = params.get('platform_connected');
    const credJson = params.get('credentials');
    if (platformConnected && credJson) {
      try {
        const creds = JSON.parse(decodeURIComponent(credJson)) as StoredCredentials;
        const newConns = { ...connections, [platformConnected]: creds };
        saveConnections(newConns);
        window.history.replaceState({}, '', '/');
      } catch { /* ignore */ }
    }
  }, []);

  const connectViaOAuth = async (platformId: string) => {
    try {
      const res = await fetch(`/api/platforms/oauth?platform=${platformId}&action=url`);
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch {
      setSyncError('无法生成授权链接，请检查平台应用配置');
    }
  };

  const connectViaToken = (platformId: string) => {
    setTokenInput({ platformId, token: '', advertiserId: '' });
  };

  const saveToken = () => {
    if (!tokenInput?.token) return;
    const creds: StoredCredentials = {
      platformId: tokenInput.platformId,
      accessToken: tokenInput.token,
      advertiserId: tokenInput.advertiserId || undefined,
    };
    const newConns = { ...connections, [tokenInput.platformId]: creds };
    saveConnections(newConns);
    setTokenInput(null);
    setSyncSuccess(`已保存 Access Token`);
    setTimeout(() => setSyncSuccess(null), 3000);
  };

  const disconnect = (platformId: string) => {
    const newConns = { ...connections };
    delete newConns[platformId];
    saveConnections(newConns);
  };

  const syncData = async (platformId: string) => {
    const creds = connections[platformId];
    if (!creds) return;

    setSyncing(platformId);
    setSyncError(null);

    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

    try {
      const res = await fetch('/api/platforms/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platformId,
          credentials: creds,
          startDate,
          endDate,
          advertiserId: creds.advertiserId,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      if (result.data?.length > 0) {
        onDataSynced?.(result.data, result.platform);
        setSyncSuccess(`已同步 ${result.count} 条数据`);
        setTimeout(() => setSyncSuccess(null), 3000);
      } else {
        setSyncError('未获取到数据，请检查广告账户是否有投放记录');
      }
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : '同步失败');
    } finally {
      setSyncing(null);
    }
  };

  const connectedCount = Object.keys(connections).length;

  return (
    <div className="space-y-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-surface-2/50 border border-surface-4/30 hover:border-brand-500/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Link2 size={14} className="text-brand-400" />
          <span className="text-xs font-medium text-slate-300">广告平台</span>
          {connectedCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {connectedCount} 已连接
            </span>
          )}
        </div>
        {expanded ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden space-y-2"
          >
            {PLATFORMS.map(platform => {
              const isConnected = !!connections[platform.id];
              const isSyncing = syncing === platform.id;

              return (
                <div
                  key={platform.id}
                  className="p-2.5 rounded-lg bg-surface-2/30 border border-surface-4/20"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: isConnected ? '#10b981' : platform.color + '40' }}
                      />
                      <span className="text-xs font-medium text-slate-300">{platform.name}</span>
                      <span className="text-[10px] text-slate-600">{platform.channels.join(' · ')}</span>
                    </div>
                  </div>

                  <div className="flex gap-1.5">
                    {isConnected ? (
                      <>
                        <button
                          onClick={() => syncData(platform.id)}
                          disabled={isSyncing}
                          className="flex items-center gap-1 px-2 py-1 rounded text-[11px] bg-brand-500/10 text-brand-300 border border-brand-500/20 hover:bg-brand-500/20 transition-colors disabled:opacity-50"
                        >
                          <RefreshCw size={10} className={isSyncing ? 'animate-spin' : ''} />
                          {isSyncing ? '同步中...' : '同步数据'}
                        </button>
                        <button
                          onClick={() => disconnect(platform.id)}
                          className="flex items-center gap-1 px-2 py-1 rounded text-[11px] text-slate-500 hover:text-rose-400 transition-colors"
                        >
                          <Unlink size={10} />
                          断开
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => connectViaOAuth(platform.id)}
                          className="flex items-center gap-1 px-2 py-1 rounded text-[11px] bg-surface-3/50 text-slate-400 border border-surface-4/30 hover:text-brand-300 hover:border-brand-500/30 transition-colors"
                        >
                          <Link2 size={10} />
                          OAuth 授权
                        </button>
                        <button
                          onClick={() => connectViaToken(platform.id)}
                          className="flex items-center gap-1 px-2 py-1 rounded text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
                        >
                          Token 接入
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            {tokenInput && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-2.5 rounded-lg bg-surface-2/50 border border-brand-500/30 space-y-2"
              >
                <p className="text-[11px] text-slate-400">
                  输入 {PLATFORMS.find(p => p.id === tokenInput.platformId)?.name} 的 Access Token
                </p>
                <input
                  type="password"
                  placeholder="Access Token"
                  value={tokenInput.token}
                  onChange={e => setTokenInput({ ...tokenInput, token: e.target.value })}
                  className="w-full px-2 py-1.5 rounded bg-surface-1 border border-surface-4/50 text-xs text-slate-300 placeholder-slate-600 outline-none focus:border-brand-500/40"
                />
                <input
                  placeholder="广告主 ID（可选）"
                  value={tokenInput.advertiserId}
                  onChange={e => setTokenInput({ ...tokenInput, advertiserId: e.target.value })}
                  className="w-full px-2 py-1.5 rounded bg-surface-1 border border-surface-4/50 text-xs text-slate-300 placeholder-slate-600 outline-none focus:border-brand-500/40"
                />
                <div className="flex gap-1.5">
                  <button
                    onClick={saveToken}
                    disabled={!tokenInput.token}
                    className="px-2.5 py-1 rounded text-[11px] bg-brand-500/20 text-brand-300 border border-brand-500/30 hover:bg-brand-500/30 transition-colors disabled:opacity-30"
                  >
                    保存
                  </button>
                  <button
                    onClick={() => setTokenInput(null)}
                    className="px-2.5 py-1 rounded text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    取消
                  </button>
                </div>
              </motion.div>
            )}

            <AnimatePresence>
              {syncError && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20"
                >
                  <AlertCircle size={12} className="text-rose-400 flex-shrink-0" />
                  <span className="text-[11px] text-rose-300">{syncError}</span>
                </motion.div>
              )}
              {syncSuccess && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20"
                >
                  <CheckCircle2 size={12} className="text-emerald-400 flex-shrink-0" />
                  <span className="text-[11px] text-emerald-300">{syncSuccess}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="px-1">
              <p className="text-[10px] text-slate-600 leading-relaxed">
                <Calendar size={9} className="inline mr-0.5 -mt-0.5" />
                同步默认拉取最近 7 天数据。连接后可通过对话让 AI 拉取任意日期范围的数据。
              </p>
              <p className="text-[10px] text-slate-600 leading-relaxed mt-1">
                <Download size={9} className="inline mr-0.5 -mt-0.5" />
                Token 接入：从各平台开发者后台获取 Access Token 后直接粘贴使用。
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
