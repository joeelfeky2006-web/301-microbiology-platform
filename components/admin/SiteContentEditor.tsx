'use client';

import { useEffect, useState } from 'react';
import type { SiteContent, SiteSection } from '@/types';
import { supabase } from '@/lib/supabase';
import { inputClass, labelClass } from '@/lib/ui';

type Props = { value: SiteContent; onChange: (value: SiteContent) => void; onValidityChange?: (valid: boolean) => void };
const box = 'space-y-4 rounded-xl border border-slate-200 p-4 dark:border-white/10';
const text = 'block w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white';
const allowedNavRoutes: SiteContent['navigationOrder'] = ['home', 'modules', 'about', 'contact'];

export default function SiteContentEditor({ value, onChange, onValidityChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const [jsonError, setJsonError] = useState('');
  const [sectionDraft, setSectionDraft] = useState<Record<string, string>>({});
  const [socialDraft, setSocialDraft] = useState(JSON.stringify(value.brand.social, null, 2));
  useEffect(() => {
    setSectionDraft(Object.fromEntries(Object.entries(value.pages).map(([key, page]) => [key, JSON.stringify(page.sections, null, 2)])));
    setSocialDraft(JSON.stringify(value.brand.social, null, 2));
  }, [value.pages, value.brand.social]);
  useEffect(() => { onValidityChange?.(!jsonError); }, [jsonError, onValidityChange]);
  const setBrand = (key: keyof SiteContent['brand'], next: string) => onChange({ ...value, brand: { ...value.brand, [key]: next } });
  const setHome = (key: keyof SiteContent['home'], next: string | string[]) => onChange({ ...value, home: { ...value.home, [key]: next } });

  async function uploadLogo(file?: File) {
    if (!file) return;
    if (!['image/svg+xml', 'image/png', 'image/webp', 'image/jpeg'].includes(file.type) || file.size > 2 * 1024 * 1024) {
      setJsonError('Choose an SVG, PNG, WebP, or JPEG logo up to 2 MB.'); return;
    }
    setUploading(true); setJsonError('');
    const ext = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'img';
    const path = `logo-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('site-assets').upload(path, file, { upsert: true, contentType: file.type });
    if (error) setJsonError('Logo upload failed. Confirm the site-assets migration is installed and try again.');
    else {
      const { data } = supabase.storage.from('site-assets').getPublicUrl(path);
      setBrand('logo', data.publicUrl);
    }
    setUploading(false);
  }

  function updateSections(page: keyof SiteContent['pages'], raw: string) {
    try {
      const sections = JSON.parse(raw) as SiteSection[];
      if (!Array.isArray(sections) || sections.some((s) => typeof s.heading !== 'string' || typeof s.body !== 'string' || typeof s.visible !== 'boolean')) throw new Error();
      onChange({ ...value, pages: { ...value.pages, [page]: { ...value.pages[page], sections } } }); setJsonError('');
    } catch { setJsonError('Page sections must be valid JSON: an array of { heading, body, visible } objects. Raw HTML is not supported.'); }
  }

  const field = (label: string, val: string, update: (v: string) => void, multiline = false) => <label className="block"><span className={labelClass}>{label}</span>{multiline ? <textarea maxLength={5000} rows={3} className={inputClass} value={val} onChange={(e) => update(e.target.value)} /> : <input maxLength={300} className={inputClass} value={val} onChange={(e) => update(e.target.value)} />}</label>;

  return <div className="space-y-5">
    <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3 dark:border-cyan-900 dark:bg-cyan-950/30"><img src={value.brand.logo || '/logo.svg'} alt="" className="h-10 w-10 rounded object-contain" /><div><p className="font-bold">{value.brand.name}</p><p className="text-xs text-slate-600 dark:text-slate-300">{value.brand.tagline}</p></div></div>
    <section className={box}><h3 className="font-bold">Brand and contact</h3><div className="grid gap-3 sm:grid-cols-2">
      {field('Site name', value.brand.name, v => setBrand('name', v))}{field('Short name', value.brand.shortName, v => setBrand('shortName', v))}{field('Tagline', value.brand.tagline, v => setBrand('tagline', v))}{field('Description', value.brand.description, v => setBrand('description', v), true)}
      {field('Affiliation note', value.brand.affiliation, v => setBrand('affiliation', v), true)}{field('Contact email', value.brand.contactEmail, v => setBrand('contactEmail', v))}{field('Owner / team name', value.brand.teamName, v => setBrand('teamName', v))}{field('Founded year', value.brand.foundedYear, v => setBrand('foundedYear', v))}
      {field('Logo URL', value.brand.logo, v => setBrand('logo', v))}<label className="block"><span className={labelClass}>Upload logo (max 2 MB)</span><input type="file" accept="image/svg+xml,image/png,image/webp,image/jpeg" disabled={uploading} onChange={e => void uploadLogo(e.target.files?.[0])} className={text} /><span className="text-xs text-slate-500">{uploading ? 'Uploading…' : 'Stored in the public site-assets bucket. Run supabase/site-content-settings.sql first.'}</span></label>
    </div><label className="block"><span className={labelClass}>Social links (JSON array of {`{ label, url }`})</span><textarea className={text} rows={3} value={socialDraft} onChange={e => { setSocialDraft(e.target.value); try { const social = JSON.parse(e.target.value); if (Array.isArray(social) && social.every((x) => typeof x.label === 'string' && typeof x.url === 'string')) { onChange({ ...value, brand: { ...value.brand, social } }); setJsonError(''); } } catch { setJsonError('Social links must be valid JSON with label and HTTPS url fields.'); } }} /></label></section>

    <section className={box}><h3 className="font-bold">Navigation and footer</h3><div className="grid gap-3 sm:grid-cols-2">{(Object.keys(value.navigation) as (keyof SiteContent['navigation'])[]).map(k => field(`Navigation: ${k}`, value.navigation[k], v => onChange({ ...value, navigation: { ...value.navigation, [k]: v } })))}{field('Explore column heading', value.footer.explore, v => onChange({ ...value, footer: { ...value.footer, explore: v } }))}{field('Company column heading', value.footer.company, v => onChange({ ...value, footer: { ...value.footer, company: v } }))}{field('Legal column heading', value.footer.legal, v => onChange({ ...value, footer: { ...value.footer, legal: v } }))}{field('Footer copyright line (supports {year}, {owner})', value.footer.copyright, v => onChange({ ...value, footer: { ...value.footer, copyright: v } }))}{field('Medical disclaimer', value.footer.disclaimer, v => onChange({ ...value, footer: { ...value.footer, disclaimer: v } }), true)}</div><div className="space-y-2 border-t border-slate-200 pt-3 dark:border-white/10"><div className="flex items-center justify-between"><b className="text-sm">Header link order (approved routes only)</b><button type="button" disabled={value.navigationOrder.length >= allowedNavRoutes.length} onClick={() => { const missing = allowedNavRoutes.find(route => !value.navigationOrder.includes(route)); if (missing) onChange({ ...value, navigationOrder: [...value.navigationOrder, missing] }); }} className="rounded bg-blue-600 px-2 py-1 text-xs text-white disabled:opacity-40">Add route</button></div>{value.navigationOrder.map((route, index) => <div key={`${route}-${index}`} className="flex gap-2"><select className={text} value={route} onChange={e => { const next = [...value.navigationOrder]; next[index] = e.target.value as SiteContent['navigationOrder'][number]; onChange({ ...value, navigationOrder: Array.from(new Set(next)) }); }}>{allowedNavRoutes.map(item => <option key={item} value={item}>{item}</option>)}</select><button type="button" disabled={index === 0} onClick={() => { const next = [...value.navigationOrder]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; onChange({ ...value, navigationOrder: next }); }} aria-label="Move navigation item up" className="px-2 disabled:opacity-40">↑</button><button type="button" disabled={index === value.navigationOrder.length - 1} onClick={() => { const next = [...value.navigationOrder]; [next[index + 1], next[index]] = [next[index], next[index + 1]]; onChange({ ...value, navigationOrder: next }); }} aria-label="Move navigation item down" className="px-2 disabled:opacity-40">↓</button><button type="button" onClick={() => onChange({ ...value, navigationOrder: value.navigationOrder.filter((_, i) => i !== index) })} aria-label="Remove navigation item" className="px-2 text-rose-600">×</button></div>)}</div></section>

    <section className={box}><h3 className="font-bold">Home page</h3><div className="grid gap-3 sm:grid-cols-2">{field('Hero headline', value.home.headline, v => setHome('headline', v))}{field('Hero tagline', value.home.tagline, v => setHome('tagline', v))}{field('Hero description', value.home.description, v => setHome('description', v), true)}{field('Primary action label', value.home.ctaPrimary, v => setHome('ctaPrimary', v))}{field('Secondary action label', value.home.ctaSecondary, v => setHome('ctaSecondary', v))}{field('Feature / benefit cards (one per line)', value.home.features.join('\n'), v => setHome('features', v.split('\n').slice(0, 8)), true)}</div></section>

    <section className={box}><h3 className="font-bold">Public pages</h3><p className="text-xs text-slate-500">Plain text only. Section order follows the array. Visibility toggles apply when the shared page renderer is used.</p>{(Object.keys(value.pages) as (keyof SiteContent['pages'])[]).map(page => <details key={page} className="rounded-lg border border-slate-200 p-3 dark:border-white/10"><summary className="cursor-pointer font-semibold capitalize">{page}</summary><div className="mt-3 space-y-3">{field('Title', value.pages[page].title, v => onChange({ ...value, pages: { ...value.pages, [page]: { ...value.pages[page], title: v } } }))}{field('Meta description', value.pages[page].description, v => onChange({ ...value, pages: { ...value.pages, [page]: { ...value.pages[page], description: v } } }))}{field('Last updated', value.pages[page].lastUpdated, v => onChange({ ...value, pages: { ...value.pages, [page]: { ...value.pages[page], lastUpdated: v } } }))}<label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={value.pages[page].visible} onChange={e => onChange({ ...value, pages: { ...value.pages, [page]: { ...value.pages[page], visible: e.target.checked } } })} />Visible</label><label className="block"><span className={labelClass}>Sections (JSON, {`{ heading, body, visible }`})</span><textarea className={text + ' font-mono text-xs'} rows={12} value={sectionDraft[page] ?? ''} onChange={e => setSectionDraft(current => ({ ...current, [page]: e.target.value }))} onBlur={e => updateSections(page, e.target.value)} /></label></div></details>)}</section>

    <section className={box}><h3 className="font-bold">Module labels and summaries</h3><div className="grid gap-4 sm:grid-cols-3">{(['CNS', 'URS', 'REP'] as const).map(id => <div key={id} className="space-y-2 rounded-lg bg-slate-50 p-3 dark:bg-slate-900"><b>{id}</b>{field('Display label', value.modules[id].label, v => onChange({ ...value, modules: { ...value.modules, [id]: { ...value.modules[id], label: v } } }))}{field('Summary', value.modules[id].summary, v => onChange({ ...value, modules: { ...value.modules, [id]: { ...value.modules[id], summary: v } } }), true)}</div>)}</div></section>

    <section className={box}><h3 className="font-bold">Auth-facing copy</h3><div className="grid gap-3 sm:grid-cols-2">{field('Sign-in heading', value.auth.signInTitle, v => onChange({ ...value, auth: { ...value.auth, signInTitle: v } }))}{field('Sign-in helper', value.auth.signInHelp, v => onChange({ ...value, auth: { ...value.auth, signInHelp: v } }))}{field('Sign-up heading', value.auth.signUpTitle, v => onChange({ ...value, auth: { ...value.auth, signUpTitle: v } }))}{field('Sign-up helper', value.auth.signUpHelp, v => onChange({ ...value, auth: { ...value.auth, signUpHelp: v } }))}</div></section>

    <section className={box}><h3 className="font-bold">Campaign copy</h3><div className="grid gap-3 sm:grid-cols-2">{field('Campaign title', value.campaigns.title, v => onChange({ ...value, campaigns: { ...value.campaigns, title: v } }))}{field('Campaign description', value.campaigns.description, v => onChange({ ...value, campaigns: { ...value.campaigns, description: v } }), true)}{field('Button label', value.campaigns.cta, v => onChange({ ...value, campaigns: { ...value.campaigns, cta: v } }))}{field('Destination (HTTPS only)', value.campaigns.url, v => onChange({ ...value, campaigns: { ...value.campaigns, url: v } }))}{field('Discount code', value.campaigns.discountCode, v => onChange({ ...value, campaigns: { ...value.campaigns, discountCode: v } }))}{field('Disclosure', value.campaigns.disclosure, v => onChange({ ...value, campaigns: { ...value.campaigns, disclosure: v } }))}<label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={value.campaigns.active} onChange={e => onChange({ ...value, campaigns: { ...value.campaigns, active: e.target.checked } })} />Active</label></div></section>
    {jsonError && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{jsonError}</p>}
  </div>;
}
