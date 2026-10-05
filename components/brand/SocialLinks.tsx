import { ExternalLink } from 'lucide-react';
import SocialIcon, { socialNetworkFor, type SocialNetwork } from './SocialIcon';

const HOVER: Record<SocialNetwork, string> = {
  instagram: 'hover:border-transparent hover:bg-gradient-to-tr hover:from-[#F58529] hover:via-[#DD2A7B] hover:to-[#8134AF] hover:text-white',
  whatsapp: 'hover:border-transparent hover:bg-[#25D366] hover:text-white',
};

const isHttps = (url: string) => { try { return new URL(url).protocol === 'https:'; } catch { return false; } };

export default function SocialLinks({ links, className = '' }: { links: { label: string; url: string }[]; className?: string }) {
  const safe = links.filter((link) => isHttps(link.url));
  if (!safe.length) return null;
  return (
    <nav aria-label="Social links" className={`flex flex-wrap items-center gap-2 ${className}`}>
      {safe.map((link, index) => {
        const network = socialNetworkFor(link.url);
        const base = 'flex h-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300';
        return network ? (
          <a key={`${link.url}-${index}`} href={link.url} target="_blank" rel="noopener noreferrer" aria-label={`${link.label} (opens in a new tab)`} title={link.label} className={`${base} w-9 ${HOVER[network]}`}>
            <SocialIcon network={network} className="h-4 w-4" />
          </a>
        ) : (
          <a key={`${link.url}-${index}`} href={link.url} target="_blank" rel="noopener noreferrer" className={`${base} gap-1.5 px-3 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800`}>
            {link.label}<ExternalLink className="h-3 w-3" />
          </a>
        );
      })}
    </nav>
  );
}
