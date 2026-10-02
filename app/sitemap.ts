import type { MetadataRoute } from 'next';
import { getPublicSiteContent } from '@/lib/publicSiteContent';
const origin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
export const dynamic = 'force-dynamic';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { pages } = await getPublicSiteContent();
  const routes = ['', ...(['about', 'contact', 'privacy', 'terms', 'copyright'] as const).filter((page) => pages[page].visible).map((page) => `/${page}`)];
  return routes.map((path) => ({ url: `${origin}${path}`, changeFrequency: 'monthly', priority: path ? 0.6 : 1 }));
}
