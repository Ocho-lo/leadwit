import { AdRecord, Message } from '@/types';

export interface Snapshot {
  id: string;
  name: string;
  createdAt: number;
  dateRange?: { start: string; end: string };
  channels: string[];
  recordCount: number;
  kpis: {
    spend: number;
    revenue: number;
    roi: number;
    cpa: number;
    conversions: number;
  };
  pinnedMessages?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

const STORAGE_KEY = 'adpilot_snapshots';

function isBrowser() {
  return typeof window !== 'undefined';
}

export function listSnapshots(): Snapshot[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Snapshot[];
    return Array.isArray(parsed) ? parsed.sort((a, b) => b.createdAt - a.createdAt) : [];
  } catch {
    return [];
  }
}

export function saveSnapshot(snapshot: Snapshot) {
  if (!isBrowser()) return;
  const current = listSnapshots();
  const next = [snapshot, ...current.filter((item) => item.id !== snapshot.id)];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next.slice(0, 50)));
}

export function removeSnapshot(id: string) {
  if (!isBrowser()) return;
  const current = listSnapshots();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current.filter((item) => item.id !== id)));
}

export function calcDataSnapshot(
  data: AdRecord[],
  options?: { name?: string; pinnedMessages?: Message[] }
): Snapshot {
  const totalSpend = data.reduce((sum, row) => sum + row.spend, 0);
  const totalRevenue = data.reduce((sum, row) => sum + row.revenue, 0);
  const totalConversions = data.reduce((sum, row) => sum + row.conversions, 0);
  const roi = totalSpend > 0 ? (totalRevenue / totalSpend) * 100 : 0;
  const cpa = totalConversions > 0 ? totalSpend / totalConversions : 0;
  const channels = [...new Set(data.map((row) => row.channel))];
  const dates = [...new Set(data.map((row) => row.date))].sort();

  return {
    id: `snap-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: options?.name || `快照 ${new Date().toLocaleString('zh-CN', { hour12: false })}`,
    createdAt: Date.now(),
    dateRange: dates.length > 0 ? { start: dates[0], end: dates[dates.length - 1] } : undefined,
    channels,
    recordCount: data.length,
    kpis: {
      spend: Number(totalSpend.toFixed(2)),
      revenue: Number(totalRevenue.toFixed(2)),
      roi: Number(roi.toFixed(2)),
      cpa: Number(cpa.toFixed(2)),
      conversions: Number(totalConversions.toFixed(2)),
    },
    pinnedMessages: (options?.pinnedMessages || [])
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(-6)
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
  };
}

export function diffSnapshots(left?: Snapshot, right?: Snapshot) {
  if (!left || !right) return null;
  const pct = (a: number, b: number) => {
    if (a === 0) return b === 0 ? 0 : 100;
    return ((b - a) / Math.abs(a)) * 100;
  };
  return {
    spendDelta: right.kpis.spend - left.kpis.spend,
    spendPct: pct(left.kpis.spend, right.kpis.spend),
    conversionsDelta: right.kpis.conversions - left.kpis.conversions,
    conversionsPct: pct(left.kpis.conversions, right.kpis.conversions),
    roiDelta: right.kpis.roi - left.kpis.roi,
    roiPct: pct(left.kpis.roi, right.kpis.roi),
    cpaDelta: right.kpis.cpa - left.kpis.cpa,
    cpaPct: pct(left.kpis.cpa, right.kpis.cpa),
  };
}
