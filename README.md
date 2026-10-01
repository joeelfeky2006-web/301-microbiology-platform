# Micro 301 — Learning Platform

A Next.js + TypeScript + Tailwind + Supabase platform for 301 Microbiology
(CNS, URS, REP modules): lecture records, practicals, OSPE simulation,
and AI-graded quizzes.

## Local setup (step by step)

1. Install **Node.js LTS** from https://nodejs.org (the big green LTS button).
2. Unzip this folder anywhere, e.g. `Documents/301-microbiology-platform`.
3. Open the folder in **VS Code**.
4. Open a terminal inside VS Code (menu: Terminal → New Terminal) and run:

   npm install
   npm run dev

5. Open http://localhost:3000 in your browser. You should see the dashboard.

## Project map

- `app/page.tsx` — the dashboard (home page)
- `app/layout.tsx` — shared shell for every page
- `app/globals.css` — fonts + dark lab theme
- `components/dashboard/ModuleCard.tsx` — module card component
- `types.ts` — the master data types (do NOT edit without instruction)

## Notes

- Links to /modules/*, /ospe, /quizzes will 404 until those pages are built.
- Copy `.env.example` to `.env.local` and fill in keys when the backend is wired.
