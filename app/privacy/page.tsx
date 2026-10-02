import type { Metadata } from 'next';
import LegalPage from '@/components/LegalPage';
import { getPublicSiteContent } from '@/lib/publicSiteContent';

export const dynamic = 'force-dynamic';
export async function generateMetadata(): Promise<Metadata> {
  const content = await getPublicSiteContent();
  return { title: content.pages.privacy.title, description: content.pages.privacy.description };
}

export default function Page() { return <LegalPage pageKey="privacy" />; }
