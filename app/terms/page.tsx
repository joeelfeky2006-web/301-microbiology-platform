import type { Metadata } from 'next';
import LegalPage from '@/components/LegalPage';
import { getPublicSiteContent } from '@/lib/publicSiteContent';

export const dynamic = 'force-dynamic';
export async function generateMetadata(): Promise<Metadata> {
  const content = await getPublicSiteContent();
  return { title: content.pages.terms.title, description: content.pages.terms.description };
}

export default function Page() { return <LegalPage pageKey="terms" />; }
