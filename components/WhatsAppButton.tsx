'use client';
import { MessageCircle } from 'lucide-react';
import { useSettings } from '@/lib/useSettings';

export default function WhatsAppButton() {
  const { settings } = useSettings();
  const number = (settings.whatsapp_number || '').replace(/\D/g, '');
  const href = `https://wa.me/${number}?text=${encodeURIComponent('Hello, I need some info about MedAtlas Egypt.')}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contact us on WhatsApp"
      title="WhatsApp support"
      className="hidden h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-emerald-400 sm:flex"
    >
      <MessageCircle className="h-4 w-4" strokeWidth={1.75} />
    </a>
  );
}
