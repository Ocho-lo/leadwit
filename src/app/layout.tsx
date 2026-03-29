import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AdPilot AI - 智能广告投放策略助手',
  description: '基于 AI Agent 的广告投放分析与优化平台，通过 Tool Use 机制确保数据准确性',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
