'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { HeartHandshake, Check, Copy, Server, Sparkles, X, ExternalLink } from 'lucide-react';
import { cardClass } from '@/lib/ui';
import { useSettings } from '@/lib/useSettings';

interface SupportModalProps { isOpen: boolean; onClose: () => void }

export default function SupportModal({ isOpen, onClose }: SupportModalProps) {
  const { settings } = useSettings();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const content = settings.support_content;
  const safeLink = (value: string) => { try { const parsed = new URL(value); return parsed.protocol === 'https:' ? parsed.href : ''; } catch { return ''; } };

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  const copyToClipboard = async (text: string, key: string) => {
    try { await navigator.clipboard.writeText(text); } catch (err) { console.warn('Clipboard write prevented:', err); }
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(null), 2000);
  };

  return createPortal(
    <div onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }} className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-xs animate-in fade-in duration-200">
      <section role="dialog" aria-modal="true" aria-labelledby="support-modal-title" className={`${cardClass} relative my-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-md overflow-y-auto overscroll-contain border border-slate-200 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-slate-900 sm:p-6`}>
        <header className="mb-3 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-500 text-white shadow-md"><HeartHandshake className="h-5 w-5" /></span>
            <div className="min-w-0"><h3 id="support-modal-title" className="text-lg font-black text-slate-900 dark:text-white">{content.title}</h3><p className="text-xs text-slate-500 dark:text-slate-400">{content.subtitle}</p></div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close support dialog" className="shrink-0 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800"><X className="h-4 w-4" /></button>
        </header>

        <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">{content.description}</p>

        <div className="mt-4 grid grid-cols-1 gap-2 text-[11px] font-semibold text-slate-700 dark:text-slate-300 sm:grid-cols-2">
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-white/10 dark:bg-slate-800/40"><Sparkles className="h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-cyan-300" /><span>{content.benefit_one}</span></div>
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-white/10 dark:bg-slate-800/40"><Server className="h-3.5 w-3.5 shrink-0 text-emerald-600" /><span>{content.benefit_two}</span></div>
        </div>

        <div className="mt-4 space-y-2.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{content.payment_heading}</span>
          {content.methods.filter((method) => method.active !== false).map((method) => (
            <div key={method.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-white/10 dark:bg-slate-800/50">
              <div className="min-w-0"><span className="block break-words text-xs font-bold text-slate-900 dark:text-white">{method.title}</span><span className="block break-all font-mono text-xs font-semibold text-slate-600 dark:text-slate-300">{method.display}</span></div>
              {method.action === 'link' ? (
                <a href={safeLink(method.link_url) || undefined} target="_blank" rel="noopener noreferrer" aria-disabled={!safeLink(method.link_url)} className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"><ExternalLink className="h-3.5 w-3.5" /><span>{content.link_label}</span></a>
              ) : (
                <button type="button" onClick={() => void copyToClipboard(method.value, method.id)} className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">{copiedKey === method.id ? <><Check className="h-3.5 w-3.5 text-emerald-600" /><span className="text-emerald-600">{content.copied_label}</span></> : <><Copy className="h-3.5 w-3.5" /><span>{content.copy_label}</span></>}</button>
              )}
            </div>
          ))}
        </div>

        <footer className="mt-4 border-t border-slate-200 pt-3 text-center text-[10px] text-slate-400 dark:border-white/10">{content.footer}</footer>
      </section>
    </div>, document.body,
  );
}
