'use client';

import { useState, useCallback } from 'react';
import { AdRecord } from '@/types';
import { Upload, FileSpreadsheet, Check, Database } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Papa from 'papaparse';
import { generateMockData } from '@/lib/mock-data-generator';

interface DataUploaderProps {
  onDataLoaded: (data: AdRecord[]) => void;
  hasData: boolean;
}

export default function DataUploader({ onDataLoaded, hasData }: DataUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const processCSV = (text: string) => {
    const result = Papa.parse(text, { header: true, skipEmptyLines: true });
    const data: AdRecord[] = (result.data as Record<string, string>[]).map((row) => ({
      date: row.date || row['日期'] || '',
      channel: row.channel || row['渠道'] || '',
      campaign_name: row.campaign_name || row['活动名称'] || '',
      spend: parseFloat(row.spend || row['花费'] || '0'),
      impressions: parseInt(row.impressions || row['展示'] || '0'),
      clicks: parseInt(row.clicks || row['点击'] || '0'),
      conversions: parseInt(row.conversions || row['转化'] || '0'),
      revenue: parseFloat(row.revenue || row['收入'] || '0'),
      new_users: parseInt(row.new_users || row['新增用户'] || '0'),
      retained_d7: parseInt(row.retained_d7 || row['7日留存'] || '0'),
    })) as AdRecord[];
    return data.filter(r => r.date && r.channel);
  };

  const processJSON = (text: string) => {
    const parsed = JSON.parse(text);
    const records = Array.isArray(parsed) ? parsed : parsed.campaign_data || parsed.data || [];
    return records as AdRecord[];
  };

  const handleFile = useCallback(async (file: File) => {
    setIsLoading(true);
    try {
      const text = await file.text();
      let data: AdRecord[];
      if (file.name.endsWith('.csv')) {
        data = processCSV(text);
      } else {
        data = processJSON(text);
      }
      if (data.length > 0) onDataLoaded(data);
    } catch (err) {
      console.error('Failed to parse file:', err);
    }
    setIsLoading(false);
  }, [onDataLoaded]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleLoadDemo = () => {
    setIsLoading(true);
    const records = generateMockData(14);
    if (records.length > 0) onDataLoaded(records);
    setIsLoading(false);
  };

  if (hasData) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
        <Check size={14} className="text-emerald-400" />
        <span className="text-xs text-emerald-300">数据已加载</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl p-4 text-center transition-all cursor-pointer ${
          isDragging
            ? 'border-brand-400 bg-brand-500/5'
            : 'border-surface-4 hover:border-brand-500/30'
        }`}
      >
        <input
          type="file"
          accept=".csv,.json"
          onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
          className="absolute inset-0 opacity-0 cursor-pointer"
        />
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-2"
            >
              <div className="w-8 h-8 rounded-full border-2 border-brand-400 border-t-transparent animate-spin" />
              <span className="text-xs text-slate-400">解析中...</span>
            </motion.div>
          ) : (
            <motion.div
              key="upload"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-2"
            >
              <Upload size={20} className="text-slate-500" />
              <p className="text-xs text-slate-400">拖放 CSV/JSON 文件</p>
              <p className="text-[11px] text-slate-600">或点击选择文件</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <button
        onClick={handleLoadDemo}
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 text-white text-sm font-medium hover:from-brand-500 hover:to-brand-600 transition-all disabled:opacity-50 glow"
      >
        <Database size={14} />
        加载示例数据
      </button>
    </div>
  );
}
