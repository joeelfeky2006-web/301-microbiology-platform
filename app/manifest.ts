import type { MetadataRoute } from 'next';
import { getPublicSiteContent } from '@/lib/publicSiteContent';

export const dynamic = 'force-dynamic';
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const site = await getPublicSiteContent();
  return {
    name: site.brand.name, short_name: site.brand.shortName, description: site.brand.description,
    start_url: '/', display: 'standalone', background_color: '#f8fafc', theme_color: '#2350FF',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
