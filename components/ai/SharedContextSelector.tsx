'use client';

import { useEffect, useState } from 'react';
import type { MaterialCategory, ModuleName } from '@/types';
import { authenticatedHeaders } from '@/lib/authHeaders';

export type ContextFile = { id: string; module: ModuleName; type: MaterialCategory | string; title: string; fileLabel?: string };

const MODULES: ModuleName[] = ['CNS', 'URS', 'REP'];
const FILE_LABELS: Record<string, string> = {
  lec_pdf: 'PDF', practical_pdf: 'Practical PDF', record_g1: 'G1 recording', record_g2: 'G2 recording',
  audio_recording: 'Audio', mindmap: 'Mind map', qbank: 'Question bank', reference: 'Reference',
  external_link: 'External resource', practical_record: 'Practical recording',
};

export default function SharedContextSelector({
  value, onChange, module, onFilesChange, showModuleSelector = false, placeholder = 'Select a lecture context',
}: {
  value: string;
  onChange: (id: string) => void;
  module?: ModuleName;
  onFilesChange?: (files: ContextFile[]) => void;
  showModuleSelector?: boolean;
  placeholder?: string;
}) {
  const [localModule, setLocalModule] = useState<ModuleName>(module || 'URS');
  const activeModule = module || localModule;
  const [files, setFiles] = useState<ContextFile[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    void (async () => {
      try {
        const response = await fetch(`/api/ai/contexts?module=${encodeURIComponent(activeModule)}`, { headers: await authenticatedHeaders(), cache: 'no-store' });
        if (!response.ok) throw new Error('Could not load available lecture contexts.');
        const result = await response.json() as { files?: ContextFile[] };
        const nextFiles = result.files || [];
        if (!cancelled) { setFiles(nextFiles); onFilesChange?.(nextFiles); }
      } catch (cause) {
        console.error('Could not load lecture contexts:', cause);
        if (!cancelled) { setFiles([]); onFilesChange?.([]); setError('Lecture contexts are unavailable right now. Please try again shortly.'); }
      } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [activeModule, onFilesChange]);

  useEffect(() => {
    if (value && !files.some((file) => file.id === value)) onChange('');
  }, [files, onChange, value]);

  const groups = Array.from(new Set(files.map((file) => file.title)));
  return <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
    {showModuleSelector && <select aria-label="Context module" value={activeModule} onChange={(event) => setLocalModule(event.target.value as ModuleName)} className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs dark:border-slate-700 dark:bg-slate-800">
      {MODULES.map((item) => <option key={item} value={item}>{item}</option>)}
    </select>}
    <select aria-label="Lecture context" value={value} onChange={(event) => onChange(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
      <option value="">{loading ? 'Loading lecture contexts…' : placeholder}</option>
      {groups.map((title) => <optgroup key={title} label={`[${activeModule}] ${title}`}>
        {files.filter((file) => file.title === title).map((file) => <option key={file.id} value={file.id}>{FILE_LABELS[file.type] || file.type.replaceAll('_', ' ')} · {file.fileLabel || 'resource'}</option>)}
      </optgroup>)}
    </select>
    {error && <span role="status" className="w-full text-[11px] text-rose-600">{error}</span>}
  </div>;
}
