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

## Site content and branding

- After the existing CMS/settings and `is_super_admin()` security migrations, run `supabase/site-content-settings.sql` in the Supabase SQL Editor to add the public `site_content` JSONB settings and the `site-assets` logo bucket. The app does not apply this migration automatically.
- A super_admin can edit public copy, page sections, footer/header labels, modules, auth helper text, support payment methods, campaign details, and logo in Admin → Platform & Marketing Settings. Technical secrets and security settings remain outside the content editor.
- The default logo is `public/logo.svg`; a super_admin can upload a replacement after applying the migration.
- Optional file replacements: `app/icon.png` (512×512), `app/apple-icon.png` (180×180), `app/favicon.ico` (48×48), and `public/logo.png` (square, at least 256×256; transparent preferred). If replacing `app/icon.svg` with `app/icon.png`, remove `app/icon.svg` to avoid competing icon metadata.
- Set `NEXT_PUBLIC_SITE_URL` to the canonical public origin for metadata, sitemap, and robots URLs. It falls back to `http://localhost:3000` for local development.
