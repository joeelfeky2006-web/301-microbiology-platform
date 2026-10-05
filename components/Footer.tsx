'use client';

import Link from 'next/link';
import { useSettings } from '@/lib/useSettings';
import BrandMark from './brand/BrandMark';
import SocialLinks from './brand/SocialLinks';

const links = [
  ['home', '/'], ['cns', '/modules/CNS'], ['urs', '/modules/URS'], ['rep', '/modules/REP'],
  ['about', '/about'], ['contact', '/contact'], ['privacy', '/privacy'], ['terms', '/terms'], ['copyright', '/copyright'],
] as const;
export default function Footer() {
  const { settings } = useSettings(); const content = settings.site_content; const nav = content.navigation;
  const groups = [
    { title: content.brand.shortName, keys: ['home'] as const },
    { title: content.footer.explore, keys: ['cns', 'urs', 'rep'] as const },
    { title: content.footer.company, keys: ['about', 'contact'] as const },
    { title: content.footer.legal, keys: ['privacy', 'terms', 'copyright'] as const },
  ];
  const labels = { ...nav };
  const pageFor: Partial<Record<(typeof links)[number][0], keyof typeof content.pages>> = { about: 'about', contact: 'contact', privacy: 'privacy', terms: 'terms', copyright: 'copyright' };
  return <footer className="mt-auto border-t border-slate-200 bg-white px-4 py-8 dark:border-white/10 dark:bg-slate-950 sm:px-6">
    <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 sm:grid-cols-4">
      {groups.map((group, index) => <section key={group.title}>{index === 0 && <div className="mb-3 flex items-center gap-2">{!content.brand.logo || content.brand.logo === '/logo.svg' ? <BrandMark className="h-6 w-auto" /> : <img src={content.brand.logo} alt="" width={28} height={28} className="h-7 w-7 object-contain" />}<span className="font-black tracking-tight text-slate-900 dark:text-white">{content.brand.name}</span></div>}<h2 className="text-sm font-bold text-slate-900 dark:text-white">{group.title}</h2><ul className="mt-3 space-y-2">{group.keys.filter(key => !pageFor[key] || content.pages[pageFor[key]!].visible).map(key => <li key={key}><Link className="text-sm text-slate-600 hover:text-blue-700 focus-visible:outline focus-visible:outline-2 dark:text-slate-300 dark:hover:text-cyan-300" href={links.find(x => x[0] === key)![1]}>{labels[key]}</Link></li>)}</ul>{index === 0 && <><p className="mt-3 text-xs text-slate-500">{content.brand.tagline}</p><SocialLinks links={content.brand.social} className="mt-4" /></>}</section>)}
    </div>
    <div className="mx-auto mt-6 max-w-6xl border-t border-slate-200 pt-4 text-xs text-slate-500 dark:border-white/10 dark:text-slate-400"><p>{content.footer.copyright.replace('{year}', new Date().getFullYear().toString()).replace('{owner}', content.brand.teamName)}</p><p className="mt-2">{content.footer.disclaimer}</p><p className="mt-1">{content.brand.affiliation}</p></div>
  </footer>;
}
