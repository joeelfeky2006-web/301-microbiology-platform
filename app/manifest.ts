import type { MetadataRoute } from 'next';
import { getPublicSiteContent } from '@/lib/publicSiteContent';

export const dynamic = 'force-dynamic';
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const site = await getPublicSiteContent();
  return { name: site.brand.name, short_name: site.brand.shortName, start_url: '/', display: 'standalone', background_color: '#f8fafc', theme_color: '#155eef' };
}
