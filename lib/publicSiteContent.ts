import { DEFAULT_SITE_CONTENT, mergeSiteContent } from '@/lib/siteConfig';

/** Read only the safe public JSONB field for server-rendered document metadata. */
export async function getPublicSiteContent() {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!base || !anon) return DEFAULT_SITE_CONTENT;
  try {
    const response = await fetch(`${base}/rest/v1/platform_settings?id=eq.1&select=site_content`, {
      headers: { apikey: anon, Authorization: `Bearer ${anon}` }, cache: 'no-store',
    });
    if (!response.ok) return DEFAULT_SITE_CONTENT;
    const rows = await response.json() as { site_content?: unknown }[];
    return mergeSiteContent(rows[0]?.site_content);
  } catch { return DEFAULT_SITE_CONTENT; }
}
