'use client';

import { useMemo, useState } from 'react';
import { AdRecord } from '@/types';
import { SLOT_TEMPLATES, DEFAULT_DATE_RANGE_OPTIONS, DEFAULT_METRIC_OPTIONS } from '@/lib/slot-templates';
import { Wand2 } from 'lucide-react';

interface SlotComposerProps {
  data: AdRecord[];
  connectedPlatforms?: string[];
  onInsert: (prompt: string) => void;
  disabled?: boolean;
}

export default function SlotComposer({ data, connectedPlatforms = [], onInsert, disabled = false }: SlotComposerProps) {
  const [templateId, setTemplateId] = useState(SLOT_TEMPLATES[0].id);
  const [slots, setSlots] = useState<Record<string, string>>({
    platform: '全部平台',
    platform_a: '全部平台',
    platform_b: '抖音',
    metric: DEFAULT_METRIC_OPTIONS[0],
    date_range: DEFAULT_DATE_RANGE_OPTIONS[0],
    budget: '5000',
  });

  const template = SLOT_TEMPLATES.find((item) => item.id === templateId) || SLOT_TEMPLATES[0];

  const platformOptions = useMemo(() => {
    const fromData = [...new Set(data.map((row) => row.channel).filter(Boolean))];
    const fromConnections = connectedPlatforms.filter(Boolean);
    return ['全部平台', ...new Set([...fromData, ...fromConnections])];
  }, [data, connectedPlatforms]);

  const resolveOptions = (kind: string, fieldOptions?: string[]) => {
    if (fieldOptions?.length) return fieldOptions;
    if (kind === 'platform') return platformOptions;
    if (kind === 'metric') return DEFAULT_METRIC_OPTIONS;
    if (kind === 'date_range') return DEFAULT_DATE_RANGE_OPTIONS;
    return [];
  };

  const renderPrompt = () => template.segments.map((seg) => {
    if (seg.type === 'text') return seg.value;
    return slots[seg.key] || `[${seg.label}]`;
  }).join(' ');

  const handleInsert = () => {
    if (disabled) return;
    onInsert(renderPrompt().replace(/\s+/g, ' ').trim());
  };

  return (
    <div className="rounded-xl border border-surface-4/40 bg-surface-2/30 p-3 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs text-slate-300">
          <Wand2 size={12} className="text-brand-300" />
          Slot 模板
        </div>
        <select
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
          className="bg-surface-1 border border-surface-4/50 rounded-md px-2 py-1 text-[11px] text-slate-300"
        >
          {SLOT_TEMPLATES.map((item) => (
            <option key={item.id} value={item.id}>{item.label}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-1.5 text-xs">
        {template.segments.map((seg, idx) => {
          if (seg.type === 'text') {
            return <span key={`${seg.value}-${idx}`} className="text-slate-500">{seg.value}</span>;
          }
          const options = resolveOptions(seg.kind, seg.options);
          if (seg.kind === 'number' || seg.kind === 'text') {
            return (
              <input
                key={seg.key}
                value={slots[seg.key] || ''}
                placeholder={seg.label}
                onChange={(e) => setSlots((prev) => ({ ...prev, [seg.key]: e.target.value }))}
                className="min-w-[82px] px-2 py-1 rounded-md bg-surface-1 border border-surface-4/50 text-slate-200"
              />
            );
          }
          return (
            <select
              key={seg.key}
              value={slots[seg.key] || options[0] || ''}
              onChange={(e) => setSlots((prev) => ({ ...prev, [seg.key]: e.target.value }))}
              className="px-2 py-1 rounded-md bg-surface-1 border border-surface-4/50 text-slate-200"
            >
              {options.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-slate-500 truncate">{renderPrompt()}</p>
        <button
          onClick={handleInsert}
          disabled={disabled}
          className="px-2.5 py-1 rounded-md text-[11px] bg-brand-500/20 text-brand-200 border border-brand-500/30 hover:bg-brand-500/30 disabled:opacity-50"
        >
          插入对话
        </button>
      </div>
    </div>
  );
}
