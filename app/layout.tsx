import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "MedAtlas Egypt — Next-Gen AI Training for Medical Students",
  description:
    "MedAtlas Egypt: Next-Gen AI Training for Medical Students. Micro 301 — Culturing Curiosity: Central Nervous System, Urinary System, and Reproductive System modules with interactive case studies, practical records, and exam vault.",
};

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
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased dark:bg-lab-950 dark:text-slate-100">
        <Header />
        {children}
      </body>
    </html>
  );
}
