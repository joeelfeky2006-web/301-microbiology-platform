import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "Micro Atlas — 301 Microbiology",
  description:
    "301 Microbiology learning platform: CNS, URS, and REP modules with lectures, practical records, and exam materials.",
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