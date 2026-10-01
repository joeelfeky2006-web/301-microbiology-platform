import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Micro 301 — Learning Platform",
  description:
    "301 Microbiology learning platform: CNS, URS, and REP modules with lectures, practical records, OSPE simulation, and AI-graded quizzes.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-lab-950 text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
