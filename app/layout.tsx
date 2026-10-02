import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import MaintenanceGate from "@/components/MaintenanceGate";
import Footer from "@/components/Footer";
import { Space_Grotesk, IBM_Plex_Mono } from 'next/font/google';
import { getPublicSiteContent } from '@/lib/publicSiteContent';

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space-grotesk', display: 'swap' });
const ibmPlexMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-ibm-plex-mono', display: 'swap' });

export async function generateMetadata(): Promise<Metadata> {
  const site = await getPublicSiteContent();
  const title = `${site.brand.name} — ${site.brand.tagline}`;
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
    title: { default: title, template: `%s | ${site.brand.shortName}` },
    description: site.brand.description,
    openGraph: { title: site.brand.name, description: site.brand.description, type: 'website' },
    twitter: { card: 'summary', title: site.brand.name, description: site.brand.description },
  };
}

export const viewport = { themeColor: [{ media: '(prefers-color-scheme: light)', color: '#f8fafc' }, { media: '(prefers-color-scheme: dark)', color: '#070b14' }] };

// Runs before first paint so there is no light/dark flash. Light is the default.
const themeScript = `(function(){try{if(localStorage.getItem('theme')==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${spaceGrotesk.variable} ${ibmPlexMono.variable} flex min-h-screen flex-col bg-slate-50 text-slate-900 antialiased dark:bg-lab-950 dark:text-slate-100`}>
        <Header />
        <AnnouncementBanner />
        <div id="main" tabIndex={-1} className="flex flex-1 flex-col"><MaintenanceGate>{children}</MaintenanceGate></div>
        <Footer />
      </body>
    </html>
  );
}
