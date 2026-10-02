'use client';

import { useState } from 'react';
import {
  HeartHandshake,
  Check,
  Copy,
  Server,
  Sparkles,
  ShieldCheck,
  X,
  CreditCard,
  Smartphone,
} from 'lucide-react';
import { cardClass } from '@/lib/ui';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SupportModal({ isOpen, onClose }: SupportModalProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = async (text: string, key: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      }
    } catch (err) {
      console.warn('Clipboard write prevented:', err);
    }
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const paymentOptions = [
    {
      id: 'instapay',
      title: 'InstaPay (Egypt)',
      value: 'medatlas.egypt@instapay',
      display: 'medatlas.egypt@instapay',
      type: 'IPA Address',
      color: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300',
    },
    {
      id: 'vodafone',
      title: 'Vodafone Cash',
      value: '01099887766',
      display: '010 9988 7766',
      type: 'Mobile Wallet',
      color: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
    },
    {
      id: 'fawry',
      title: 'Fawry Service / Smart Wallet',
      value: '9900223311',
      display: 'Ref: 9900 2233 11',
      type: 'Fawry Merchant Ref',
      color: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className={`${cardClass} relative w-full max-w-md overflow-hidden border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-slate-900`}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-500/30">
            <HeartHandshake className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              Support MedAtlas Egypt
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Micro 301 Student Hosting &amp; AI Token Fund
            </p>
          </div>
        </div>

        <p className="mt-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          MedAtlas Egypt is an independent student academic initiative built specifically for 3rd-year MUST medical students. Your voluntary contribution helps keep Gemini AI token quotas elevated and server response times near-instant during midterm &amp; final exam periods.
        </p>

        {/* How funds are used */}
        <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-white/10 dark:bg-slate-800/40">
            <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-cyan-300 flex-shrink-0" />
            <span>AI Token Compute</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-white/10 dark:bg-slate-800/40">
            <Server className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
            <span>High-Speed DB &amp; CDN</span>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="mt-4 space-y-2.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Student Payment Channels
          </span>
          {paymentOptions.map((opt) => (
            <div
              key={opt.id}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-white/10 dark:bg-slate-800/50"
            >
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {opt.title}
                </span>
                <div className="font-mono text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {opt.display}
                </div>
              </div>

              <button
                type="button"
                onClick={() => copyToClipboard(opt.value, opt.id)}
                className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                {copiedKey === opt.id ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-emerald-600">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          ))}
        </div>

        <div className="mt-4 border-t border-slate-200 pt-3 text-center dark:border-white/10">
          <p className="text-[10px] text-slate-400">
            Thank you for supporting your colleagues at MUST Medical School!
          </p>
        </div>
      </div>
    </div>
  );
}
