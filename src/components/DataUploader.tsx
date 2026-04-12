'use client';

import { useRef, useState, useCallback } from 'react';
import { AdRecord } from '@/types';
import { Upload, Database, FilePlus2, Replace, Trash2, AlertCircle, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Papa from 'papaparse';
import { generateMockData } from '@/lib/mock-data-generator';

interface DataUploaderProps {
  data: AdRecord[];
  onDataReplace: (data: AdRecord[]) => void;
  onDataAppend: (data: AdRecord[]) => void;
  onDataClear: () => void;
}

type UploadMode = 'replace' | 'append';

const REQUIRED_FIELDS = ['date', 'channel', 'campaign_name'];

export default function DataUploader({ data, onDataReplace, onDataAppend, onDataClear }: DataUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processCSV = (text: string) => {
    const result = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
    const headers = (result.meta.fields || []).map((field) => field.trim());
    const hasRequiredFields = REQUIRED_FIELDS.every((field) =>
      headers.includes(field) || headers.includes(field === 'campaign_name' ? '活动名称' : field === 'date' ? '日期' : '渠道')
    );
    if (!hasRequiredFields) {
      throw new Error('CSV 列名不匹配，请至少包含 date/channel/campaign_name（或 日期/渠道/活动名称）。');
    }

    if (result.errors.length > 0) {
      const firstError = result.errors[0];
      throw new Error(`CSV 解析失败（第 ${firstError.row ?? 0} 行）：${firstError.message}`);
    }

    const parsedData: AdRecord[] = result.data.map((row) => ({
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
    }));
    return parsedData.filter((row) => row.date && row.channel && row.campaign_name);
  };

  const processJSON = (text: string) => {
    const parsed = JSON.parse(text);
    const records = Array.isArray(parsed) ? parsed : parsed.campaign_data || parsed.data || [];
    if (!Array.isArray(records)) {
      throw new Error('JSON 格式不正确，请传入数组或包含 data 字段。');
    }
    return records as AdRecord[];
  };

  const processDataByMode = useCallback((nextData: AdRecord[], mode: UploadMode) => {
    if (mode === 'append') {
      onDataAppend(nextData);
      return;
    }
    onDataReplace(nextData);
  }, [onDataAppend, onDataReplace]);

  const handleFile = useCallback(async (file: File, mode: UploadMode = 'replace') => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const text = await file.text();
      const nextData = file.name.endsWith('.csv') ? processCSV(text) : processJSON(text);
      if (nextData.length === 0) {
        throw new Error('未识别到有效数据，请检查文件是否为空，或是否包含必要字段。');
      }
      processDataByMode(nextData, mode);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '文件解析失败，请重试。');
    } finally {
      setIsLoading(false);
    }
  }, [processDataByMode]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file, data.length > 0 ? 'append' : 'replace');
    }
  }, [data.length, handleFile]);

  const handlePickFile = (mode: UploadMode) => {
    if (!fileInputRef.current) return;
    fileInputRef.current.dataset.mode = mode;
    fileInputRef.current.click();
  };

  const handleLoadDemo = (mode: UploadMode) => {
    setIsLoading(true);
    setErrorMessage(null);
    const records = generateMockData(14);
    if (records.length > 0) {
      processDataByMode(records, mode);
    }
    setIsLoading(false);
  };

  const templateContent = 'date,channel,campaign_name,spend,impressions,clicks,conversions,revenue,new_users,retained_d7\n2026-04-01,抖音,春季促销,1200,10000,530,62,1800,58,21';
  const templateHref = `data:text/csv;charset=utf-8,${encodeURIComponent(templateContent)}`;
  const hasData = data.length > 0;
  const channelCount = new Set(data.map((row) => row.channel)).size;
  const sortedDates = [...new Set(data.map((row) => row.date))].sort();
  const dateRangeLabel = sortedDates.length > 0 ? `${sortedDates[0]} ~ ${sortedDates[sortedDates.length - 1]}` : null;

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.json"
        onChange={(e) => {
          const pickedFile = e.target.files?.[0];
          const mode = (e.target.dataset.mode as UploadMode | undefined) || 'replace';
          if (pickedFile) handleFile(pickedFile, mode);
          e.target.value = '';
        }}
        className="hidden"
      />

      {hasData && (
        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2">
          <p className="text-xs font-medium text-emerald-300">当前数据集可用</p>
          <p className="text-[11px] text-emerald-200/80 mt-1">
            {data.length} 条记录 · {channelCount} 个渠道{dateRangeLabel ? ` · ${dateRangeLabel}` : ''}
          </p>
        </div>
      )}

      {!hasData && (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-xl p-4 text-center transition-all cursor-pointer ${
            isDragging
              ? 'border-brand-400 bg-brand-500/5'
              : 'border-surface-4 hover:border-brand-500/30'
          }`}
          onClick={() => handlePickFile('replace')}
        >
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
      )}

      <div className={hasData ? 'grid grid-cols-2 gap-2' : 'space-y-2'}>
        {hasData ? (
          <>
            <button
              onClick={() => handlePickFile('append')}
              disabled={isLoading}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-surface-2 border border-surface-4/50 text-xs text-slate-300 hover:border-brand-500/30 transition-colors disabled:opacity-50"
            >
              <FilePlus2 size={12} />
              追加文件
            </button>
            <button
              onClick={() => handlePickFile('replace')}
              disabled={isLoading}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-surface-2 border border-surface-4/50 text-xs text-slate-300 hover:border-brand-500/30 transition-colors disabled:opacity-50"
            >
              <Replace size={12} />
              替换数据
            </button>
            <button
              onClick={() => handleLoadDemo('append')}
              disabled={isLoading}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs bg-brand-500/10 text-brand-300 border border-brand-500/20 hover:bg-brand-500/20 transition-colors disabled:opacity-50"
            >
              <Database size={12} />
              追加示例
            </button>
            <button
              onClick={onDataClear}
              disabled={isLoading}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition-colors disabled:opacity-50"
            >
              <Trash2 size={12} />
              清空数据
            </button>
          </>
        ) : (
          <button
            onClick={() => handleLoadDemo('replace')}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 text-white text-sm font-medium hover:from-brand-500 hover:to-brand-600 transition-all disabled:opacity-50 glow"
          >
            <Database size={14} />
            加载示例数据
          </button>
        )}
      </div>

      {errorMessage && (
        <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 px-2.5 py-2">
          <div className="flex items-start gap-1.5">
            <AlertCircle size={12} className="text-rose-300 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[11px] text-rose-300">{errorMessage}</p>
              <a
                href={templateHref}
                download="adpilot-template.csv"
                className="inline-flex items-center gap-1 mt-1 text-[11px] text-rose-200 hover:text-white"
              >
                <Download size={11} />
                下载 CSV 模板
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
