'use client';
import Link from 'next/link';
import { useSettings } from '@/lib/useSettings';
import type { SiteContent } from '@/types';

type PageKey = keyof SiteContent['pages'];
export default function LegalPage({ pageKey }: { pageKey: PageKey }) {
  const { settings } = useSettings(); const site = settings.site_content; const page = site.pages[pageKey];
  const sections = page.sections.filter(section => section.visible);
  const bodyFor = (body: string) => body.replaceAll('{email}', site.brand.contactEmail).replaceAll('{owner}', site.brand.teamName);
  if (!page.visible) return <main className="mx-auto min-h-[50vh] max-w-3xl px-4 py-16"><h1 className="text-3xl font-bold">Page unavailable</h1><p className="mt-3">This page is currently unavailable.</p></main>;
  const whatsapp = settings.whatsapp_number.replace(/\D/g, '');
  return <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
    <header className="mb-8 border-b border-slate-200 pb-5 dark:border-white/10"><p className="text-sm font-semibold text-blue-700 dark:text-cyan-300">{site.brand.shortName}</p><h1 className="mt-2 text-3xl font-black text-slate-900 dark:text-white">{page.title}</h1><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{page.description}</p><p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Last updated: {page.lastUpdated}</p></header>
    {sections.length > 3 && <nav aria-label="Table of contents" className="mb-8 rounded-xl border border-slate-200 p-4 dark:border-white/10"><h2 className="font-bold">On this page</h2><ol className="mt-2 list-inside list-decimal space-y-1">{sections.map((s, i) => <li key={`${s.heading}-${i}`}><a className="text-sm text-blue-700 underline dark:text-cyan-300" href={`#section-${i}`}>{s.heading}</a></li>)}</ol></nav>}
    <div className="space-y-7">{sections.map((section, i) => {
      const arabic = /[\u0600-\u06FF]/.test(section.heading);
      return <section id={`section-${i}`} key={`${section.heading}-${i}`} className="scroll-mt-24" dir={arabic ? 'rtl' : undefined} lang={arabic ? 'ar' : undefined}><h2 className="text-xl font-bold text-slate-900 dark:text-white">{section.heading}</h2><p className="mt-2 whitespace-pre-line text-sm leading-7 text-slate-700 dark:text-slate-300">{bodyFor(section.body)}</p></section>;
    })}</div>
    {pageKey === 'contact' && <div className="mt-8 flex flex-wrap gap-3"><a className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white" href={`mailto:${site.brand.contactEmail}`}>Email {site.brand.contactEmail}</a>{whatsapp && <a className="rounded-lg border border-emerald-500 px-4 py-2 text-sm font-bold text-emerald-800 dark:text-emerald-300" href={`https://wa.me/${whatsapp}?text=${encodeURIComponent('Hello, I need help with MedAtlas Egypt.')}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>}</div>}
    <p className="mt-10 text-sm text-slate-500"><Link href="/" className="underline">Back to {site.navigation.home}</Link></p>
  </main>;
}
