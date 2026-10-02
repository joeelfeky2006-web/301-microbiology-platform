'use client';
import { useSettings } from '@/lib/useSettings';

export default function WhatsAppButton() {
  const { settings } = useSettings();
  const number = (settings.whatsapp_number || '').replace(/\D/g, '');
  const href = `https://wa.me/${number}?text=${encodeURIComponent('Hello, I need some info about the 301 Microbiology portal.')}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Need info? Contact us on WhatsApp"
      title="Need info? Chat on WhatsApp"
      className="flex h-9 items-center gap-2 rounded-full bg-emerald-500 px-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-600"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
      </svg>
      <span className="hidden sm:inline">Need info?</span>
    </a>
  );
}
