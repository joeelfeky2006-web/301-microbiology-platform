import Link from "next/link";
import type { ModuleName } from "@/types";

interface ModuleCardProps {
  code: ModuleName;
  title: string;
  description: string;
  accent: "violet" | "cyan" | "rose";
}

const accentStyles = {
  violet: {
    glow: "group-hover:shadow-[0_0_60px_-12px_rgba(167,139,250,0.45)]",
    border: "hover:border-violet-400/60",
    text: "text-violet-300",
    badge: "bg-violet-400/10 text-violet-300 ring-violet-400/30",
    bar: "from-violet-400 to-fuchsia-400",
  },
  cyan: {
    glow: "group-hover:shadow-[0_0_60px_-12px_rgba(34,211,238,0.45)]",
    border: "hover:border-cyan-400/60",
    text: "text-cyan-300",
    badge: "bg-cyan-400/10 text-cyan-300 ring-cyan-400/30",
    bar: "from-cyan-400 to-sky-400",
  },
  rose: {
    glow: "group-hover:shadow-[0_0_60px_-12px_rgba(251,113,133,0.45)]",
    border: "hover:border-rose-400/60",
    text: "text-rose-300",
    badge: "bg-rose-400/10 text-rose-300 ring-rose-400/30",
    bar: "from-rose-400 to-orange-300",
  },
};

function ModuleIcon({ code, className }: { code: ModuleName; className?: string }) {
  if (code === "CNS") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 3.5a3 3 0 0 0-3 3c-1.7.3-3 1.8-3 3.6 0 1.2.6 2.3 1.5 2.9A3.6 3.6 0 0 0 8 19.5c.8.8 1.9 1.2 3 1V4.7c-1-.3-1.5-1-1.5-1.2ZM14.5 3.5a3 3 0 0 1 3 3c1.7.3 3 1.8 3 3.6 0 1.2-.6 2.3-1.5 2.9a3.6 3.6 0 0 1-2.9 6.5c-.8.8-1.9 1.2-3 1V4.7c1-.3 1.4-1 1.4-1.2Z" />
      </svg>
    );
  }
  if (code === "URS") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v6m0 0c-1.5 1.5-4 2-5.5 4C5 15 4.5 17.5 5.5 20c.3.8 1.3 1 1.9.5C9 19 10 16.5 10 14m2-5c1.5 1.5 4 2 5.5 4 1.5 2 2 4.5 1 7-.3.8-1.3 1-1.9.5C15 19 14 16.5 14 14" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21c4.4 0 8-3.6 8-8s-3.6-8-8-8-8 1.6-8 6c0 2.8 1.5 5.2 3.7 6.6" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0-4v.01" />
    </svg>
  );
}

export default function ModuleCard({ code, title, description, accent }: ModuleCardProps) {
  const styles = accentStyles[accent];

  return (
    <Link
      href={`/modules/${code.toLowerCase()}`}
      className={`group relative flex min-h-[220px] flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-sm transition-all duration-300 ${styles.border} ${styles.glow}`}
    >
      <div className={`absolute left-0 top-0 h-1 w-0 bg-gradient-to-r transition-all duration-500 group-hover:w-full ${styles.bar}`} />

      <div className="flex items-start justify-between">
        <span className={`rounded-full px-3 py-1 text-xs font-medium ring-1 font-mono-accent ${styles.badge}`}>
          {code}
        </span>
        <ModuleIcon code={code} className={`h-10 w-10 opacity-70 transition-opacity group-hover:opacity-100 ${styles.text}`} />
      </div>

      <div>
        <h3 className="text-xl font-semibold text-white">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">{description}</p>
        <span className={`mt-4 inline-flex items-center gap-2 text-sm font-medium ${styles.text}`}>
          Open module
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-6-6 6 6-6 6" />
          </svg>
        </span>
      </div>
    </Link>
  );
}
