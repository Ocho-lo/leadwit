'use client';

import { useEffect, useMemo, useState } from 'react';
import { AdRecord } from '@/types';
import { calcDataSnapshot, diffSnapshots, listSnapshots, removeSnapshot, saveSnapshot, Snapshot } from '@/lib/snapshots';
import { Camera, GitCompare, Trash2 } from 'lucide-react';

interface SnapshotLibraryProps {
  data: AdRecord[];
}

export default function SnapshotLibrary({ data }: SnapshotLibraryProps) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [leftId, setLeftId] = useState<string>('');
  const [rightId, setRightId] = useState<string>('');

  const refresh = () => {
    const next = listSnapshots();
    setSnapshots(next);
    if (!leftId && next[0]) setLeftId(next[0].id);
    if (!rightId && next[1]) setRightId(next[1].id);
  };

  useEffect(() => {
    refresh();
  }, []);

  const takeSnapshot = () => {
    if (data.length === 0) return;
    saveSnapshot(calcDataSnapshot(data));
    refresh();
  };

  const handleRemove = (id: string) => {
    removeSnapshot(id);
    refresh();
  };

  const left = snapshots.find((s) => s.id === leftId);
  const right = snapshots.find((s) => s.id === rightId);
  const diff = useMemo(() => diffSnapshots(left, right), [left, right]);

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider">快照</h3>
        <button
          onClick={takeSnapshot}
          disabled={data.length === 0}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] bg-brand-500/10 text-brand-300 border border-brand-500/20 hover:bg-brand-500/20 disabled:opacity-50"
        >
          <Camera size={10} />
          钉住当前数据
        </button>
      </div>

      {snapshots.length === 0 ? (
        <p className="text-[11px] text-slate-600">还没有快照，先在有数据时点击“钉住当前数据”。</p>
      ) : (
        <div className="space-y-1.5">
          {snapshots.slice(0, 6).map((snap) => (
            <div key={snap.id} className="p-2 rounded-lg bg-surface-2/40 border border-surface-4/30">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs text-slate-300">{snap.name}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {new Date(snap.createdAt).toLocaleString('zh-CN', { hour12: false })} · {snap.recordCount} 条
                  </p>
                </div>
                <button
                  onClick={() => handleRemove(snap.id)}
                  className="p-1 rounded text-slate-500 hover:text-rose-300"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {snapshots.length >= 2 && (
        <div className="rounded-lg bg-surface-2/30 border border-surface-4/30 p-2.5 space-y-2">
          <div className="flex items-center gap-1 text-[11px] text-slate-400">
            <GitCompare size={11} />
            快照对比
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={leftId}
              onChange={(e) => setLeftId(e.target.value)}
              className="bg-surface-1 border border-surface-4/50 rounded px-2 py-1 text-[11px] text-slate-300"
            >
              {snapshots.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select
              value={rightId}
              onChange={(e) => setRightId(e.target.value)}
              className="bg-surface-1 border border-surface-4/50 rounded px-2 py-1 text-[11px] text-slate-300"
            >
              {snapshots.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          {diff && (
            <div className="text-[11px] text-slate-400 space-y-1">
              <p>花费变化：{diff.spendDelta.toFixed(2)}（{diff.spendPct.toFixed(1)}%）</p>
              <p>转化变化：{diff.conversionsDelta.toFixed(2)}（{diff.conversionsPct.toFixed(1)}%）</p>
              <p>ROI 变化：{diff.roiDelta.toFixed(2)}（{diff.roiPct.toFixed(1)}%）</p>
              <p>CPA 变化：{diff.cpaDelta.toFixed(2)}（{diff.cpaPct.toFixed(1)}%）</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
