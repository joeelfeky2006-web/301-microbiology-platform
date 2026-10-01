import Link from "next/link";
import ModuleCard from "@/components/dashboard/ModuleCard";

const modules = [
  {
    code: "CNS" as const,
    title: "Central Nervous System",
    description:
      "Microbial infections of the brain, meninges, and spinal cord — meningitis, encephalitis, and neurotropic pathogens.",
    accent: "violet" as const,
  },
  {
    code: "URS" as const,
    title: "Upper Respiratory System",
    description:
      "Pathogens of the airway — pharyngitis, sinusitis, diphtheria, and respiratory viruses with their lab diagnosis.",
    accent: "cyan" as const,
  },
  {
    code: "REP" as const,
    title: "Reproductive System",
    description:
      "Sexually transmitted and urogenital infections — syphilis, gonorrhea, and congenital microbial disease.",
    accent: "rose" as const,
  },
];

const quickLinks = [
  {
    title: "OSPE Simulator",
    description: "Practice spotter slides with interactive image hotspots.",
    href: "/ospe",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18" />
      </svg>
    ),
  },
  {
    title: "Quizzes",
    description: "AI-graded module quizzes with emailed study reports.",
    href: "/quizzes",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
  },
];

export default function DashboardPage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Ambient background: glowing orbs + faint lab grid */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/4 h-96 w-96 rounded-full bg-violet-600/15 blur-[120px]" />
        <div className="absolute right-1/4 top-1/3 h-96 w-96 rounded-full bg-cyan-500/10 blur-[120px]" />
        <div className="absolute bottom-0 left-1/2 h-72 w-72 rounded-full bg-rose-500/10 blur-[100px]" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #94a3b8 1px, transparent 1px), linear-gradient(to bottom, #94a3b8 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-6xl px-5 pb-20 pt-14 sm:px-8 sm:pt-20">
        {/* Header */}
        <header className="mb-14">
          <p className="font-mono-accent text-xs uppercase tracking-[0.35em] text-cyan-300/80">
            Microbiology · Year 301
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Welcome to the Lab<span className="text-cyan-300">.</span>
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-400">
            All your lectures, practical records, OSPE practice, and AI-graded quizzes —
            organized by module, ready when you are.
          </p>
        </header>

        {/* Module cards */}
        <section aria-label="Modules">
          <h2 className="font-mono-accent mb-5 text-xs uppercase tracking-[0.25em] text-slate-500">
            01 — Modules
          </h2>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {modules.map((mod) => (
              <ModuleCard key={mod.code} {...mod} />
            ))}
          </div>
        </section>

        {/* Quick access */}
        <section aria-label="Quick access" className="mt-14">
          <h2 className="font-mono-accent mb-5 text-xs uppercase tracking-[0.25em] text-slate-500">
            02 — Quick Access
          </h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {quickLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-center gap-5 rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-sm transition-all duration-300 hover:border-cyan-400/50 hover:bg-white/[0.05]"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300 ring-1 ring-cyan-400/30">
                  {item.icon}
                </span>
                <span>
                  <span className="block font-semibold text-white">{item.title}</span>
                  <span className="mt-1 block text-sm text-slate-400">{item.description}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
