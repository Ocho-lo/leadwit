'use client';

import { AdRecord, DashboardMetrics, ChannelMetrics, TrendDataPoint } from '@/types';
import { calculateDashboardMetrics, calculateChannelMetrics, calculateTrend } from '@/lib/analysis';
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Users, MousePointerClick, Target, type LucideIcon } from 'lucide-react';

const CHANNEL_COLORS: Record<string, string> = {
  '抖音': '#fe2c55',
  '快手': '#ff6600',
  '微信朋友圈': '#07c160',
  '今日头条': '#ff0000',
  'xiaohongshu': '#ff2442',
  '小红书': '#ff2442',
};

const BAR_COLORS = ['#818cf8', '#6366f1', '#a78bfa', '#c084fc'];

function MetricCard({ label, value, suffix, icon: Icon, trend }: {
  label: string; value: string | number; suffix?: string;
  icon: LucideIcon;
  trend?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass rounded-xl p-3 gradient-border"
    >
      <div className="flex items-start justify-between mb-1.5">
        <span className="text-xs text-slate-500">{label}</span>
        <Icon size={14} className="text-brand-400/50" />
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-lg font-bold text-slate-100">{value}</span>
        {suffix && <span className="text-xs text-slate-400">{suffix}</span>}
      </div>
      {trend !== undefined && (
        <div className={`flex items-center gap-0.5 mt-1 text-[11px] ${trend >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
          {trend >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
          <span>{Math.abs(trend)}%</span>
        </div>
      )}
    </motion.div>
  );
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload) return null;
  return (
    <div className="bg-surface-1 border border-surface-4 rounded-lg px-3 py-2 shadow-xl text-xs">
      <p className="text-slate-400 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-slate-200">
          <span style={{ color: p.color }}>●</span> {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
        </p>
      ))}
    </div>
  );
}

const CHANNEL_TO_PLATFORM: Record<string, string> = {
  '抖音': '巨量引擎',
  '今日头条': '巨量引擎',
  '西瓜视频': '巨量引擎',
  '番茄小说': '巨量引擎',
  '快手': '磁力引擎',
  '微信朋友圈': '腾讯广告',
  '腾讯新闻': '腾讯广告',
  'QQ空间': '腾讯广告',
  'xiaohongshu': '小红书',
  '小红书': '小红书',
  'red_search': '小红书',
  'red_feed': '小红书',
};

const PLATFORM_COLORS: Record<string, string> = {
  '巨量引擎': '#fe2c55',
  '磁力引擎': '#ff6600',
  '腾讯广告': '#07c160',
  '小红书': '#ff2442',
};

function aggregateByPlatform(channelMetrics: ChannelMetrics[]): ChannelMetrics[] {
  const map = new Map<string, { spend: number; revenue: number; conversions: number; newUsers: number; impressions: number; clicks: number }>();
  for (const ch of channelMetrics) {
    const platform = CHANNEL_TO_PLATFORM[ch.channel] || ch.channel;
    const agg = map.get(platform) || { spend: 0, revenue: 0, conversions: 0, newUsers: 0, impressions: 0, clicks: 0 };
    agg.spend += ch.spend;
    agg.revenue += ch.revenue;
    agg.conversions += ch.conversions;
    agg.newUsers += ch.newUsers;
    agg.impressions += (ch.spend > 0 && ch.ctr > 0) ? Math.round(ch.spend / ch.ctr * 100) : 0;
    agg.clicks += (ch.conversions > 0 && ch.cvr > 0) ? Math.round(ch.conversions / ch.cvr * 100) : 0;
    map.set(platform, agg);
  }
  return Array.from(map.entries()).map(([platform, a]) => ({
    channel: platform,
    spend: a.spend,
    revenue: a.revenue,
    conversions: a.conversions,
    newUsers: a.newUsers,
    roi: a.spend > 0 ? +((a.revenue - a.spend) / a.spend * 100).toFixed(1) : 0,
    cpa: a.conversions > 0 ? +(a.spend / a.conversions).toFixed(2) : 0,
    ctr: a.impressions > 0 ? +(a.clicks / a.impressions * 100).toFixed(2) : 0,
    cvr: a.clicks > 0 ? +(a.conversions / a.clicks * 100).toFixed(2) : 0,
  }));
}

export default function Dashboard({ data }: { data: AdRecord[] }) {
  const metrics: DashboardMetrics = useMemo(() => calculateDashboardMetrics(data), [data]);
  const channelMetrics: ChannelMetrics[] = useMemo(() => calculateChannelMetrics(data), [data]);
  const platformMetrics = useMemo(() => aggregateByPlatform(channelMetrics), [channelMetrics]);
  const trendData: TrendDataPoint[] = useMemo(() => calculateTrend(data), [data]);

  if (data.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5">
        <MetricCard label="总花费" value={`¥${(metrics.totalSpend / 10000).toFixed(1)}`} suffix="万" icon={DollarSign} />
        <MetricCard label="总收入" value={`¥${(metrics.totalRevenue / 10000).toFixed(1)}`} suffix="万" icon={DollarSign} />
        <MetricCard label="整体 ROI" value={`${metrics.overallROI}%`} icon={TrendingUp} trend={metrics.overallROI > 100 ? 12.3 : -5.2} />
        <MetricCard label="平均 CPA" value={`¥${metrics.overallCPA}`} icon={Target} />
        <MetricCard label="新增用户" value={metrics.totalNewUsers.toLocaleString()} icon={Users} />
        <MetricCard label="点击率" value={`${metrics.avgCTR}%`} icon={MousePointerClick} />
      </div>

      <div className="glass rounded-xl p-3 gradient-border">
        <h3 className="text-xs font-medium text-slate-400 mb-3">花费 & 收入趋势</h3>
        <ResponsiveContainer width="100%" height={140}>
          <AreaChart data={trendData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(42,42,61,0.5)" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="spend" name="花费" stroke="#6366f1" fill="url(#spendGrad)" strokeWidth={2} />
            <Area type="monotone" dataKey="revenue" name="收入" stroke="#10b981" fill="url(#revenueGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="glass rounded-xl p-3 gradient-border">
        <h3 className="text-xs font-medium text-slate-400 mb-3">平台 ROI 对比</h3>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={platformMetrics} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(42,42,61,0.5)" />
            <XAxis dataKey="channel" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="roi" name="ROI %" radius={[4, 4, 0, 0]}>
              {platformMetrics.map((pm, i) => (
                <Cell key={i} fill={PLATFORM_COLORS[pm.channel] || BAR_COLORS[i % BAR_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="glass rounded-xl p-3 gradient-border overflow-x-auto">
        <h3 className="text-xs font-medium text-slate-400 mb-2.5">平台表现</h3>
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-surface-4/50">
              <th className="text-left text-slate-500 font-medium pb-1.5 pr-2">平台</th>
              <th className="text-right text-slate-500 font-medium pb-1.5 px-1">花费</th>
              <th className="text-right text-slate-500 font-medium pb-1.5 px-1">CPA</th>
              <th className="text-right text-slate-500 font-medium pb-1.5 px-1">ROI</th>
              <th className="text-right text-slate-500 font-medium pb-1.5 pl-1">CVR</th>
            </tr>
          </thead>
          <tbody>
            {platformMetrics.map(pm => (
              <tr key={pm.channel} className="border-b border-surface-4/20 hover:bg-surface-3/20 transition-colors">
                <td className="py-1.5 pr-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: PLATFORM_COLORS[pm.channel] || '#6366f1' }} />
                    <span className="text-slate-300 truncate">{pm.channel}</span>
                  </div>
                </td>
                <td className="text-right text-slate-400 py-1.5 px-1">¥{(pm.spend / 10000).toFixed(1)}w</td>
                <td className="text-right py-1.5 px-1">
                  <span className={pm.cpa <= (metrics.overallCPA || 999) ? 'text-emerald-400' : 'text-rose-400'}>
                    ¥{pm.cpa}
                  </span>
                </td>
                <td className="text-right py-1.5 px-1">
                  <span className={pm.roi >= (metrics.overallROI || 0) ? 'text-emerald-400' : 'text-amber-400'}>
                    {pm.roi}%
                  </span>
                </td>
                <td className="text-right text-slate-300 py-1.5 pl-1">{pm.cvr}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
