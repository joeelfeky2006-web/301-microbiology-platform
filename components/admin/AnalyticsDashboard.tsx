'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  BarChart3,
  ExternalLink,
  RefreshCw,
  Users,
  Layers,
  FileText,
  CircleGauge,
  AlertTriangle,
} from 'lucide-react';
import { authenticatedHeaders } from '@/lib/authHeaders';
import { cardClass } from '@/lib/ui';

type AnalyticsPayload = {
  generatedAt: string;
  users: { total: number; students: number; editors: number; superAdmins: number; withUniversityId?: number };
  roster?: Array<{
    id: string;
    email: string;
    name: string;
    university_id: string;
    group_section: string;
    created_at: string | null;
  }>;
  credits: {
    rows: number;
    dailyRemainingSum: number;
    monthlyRemainingSum: number;
    lowDailyCount: number;
    spendEvents7d: number;
    spendCredits7d: number;
    spendsByAction: Record<string, number>;
  };
  content: {
    materialsTotal: number;
    materialsByModule: { CNS: number; URS: number; REP: number; other: number };
    quizzesTotal: number;
    quizzesPublished: number;
  };
  sponsor: { impression: number; click: number; coupon_copy: number };
  recentActivity: Array<{
    id: string;
    action: string;
    amount: number;
    event_type: string;
    daily_remaining: number;
    monthly_remaining: number;
    created_at: string;
  }>;
  links: { vercel: string; supabase: string };
  warnings?: string[];
};

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-900/60">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{value}</p>
      {hint && <p className="mt-1 text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}

export default function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/analytics', {
        headers: await authenticatedHeaders(),
        cache: 'no-store',
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(typeof payload.error === 'string' ? payload.error : 'Could not load analytics.');
        setData(null);
        return;
      }
      setData(payload as AnalyticsPayload);
    } catch {
      setError('Could not load analytics.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const actionEntries = Object.entries(data?.credits.spendsByAction || {}).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-4">
      <div className={`${cardClass} flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between`}>
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600 dark:text-cyan-300" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Platform Analytics</h2>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Students, AI credits, content, and sponsor events in one place.
            {data?.generatedAt && (
              <span className="ml-1 text-xs">Updated {new Date(data.generatedAt).toLocaleString()}</span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <p role="alert" className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
          {error}
        </p>
      )}

      {loading && !data && (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading analytics…
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <MetricCard
              label="Accounts"
              value={data.users.total}
              hint={`${data.users.students} students · ${data.users.withUniversityId ?? 0} with Uni ID`}
            />
            <MetricCard label="Materials" value={data.content.materialsTotal} hint={`URS ${data.content.materialsByModule.URS} · CNS ${data.content.materialsByModule.CNS} · REP ${data.content.materialsByModule.REP}`} />
            <MetricCard label="Quizzes" value={data.content.quizzesTotal} hint={`${data.content.quizzesPublished} published`} />
            <MetricCard label="AI spends (7d)" value={data.credits.spendCredits7d} hint={`${data.credits.spendEvents7d} events`} />
            <MetricCard label="Daily credits empty" value={data.credits.lowDailyCount} hint={`${data.credits.rows} credit rows`} />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <section className={`${cardClass} p-5`}>
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                <Users className="h-4 w-4" /> Roles
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                <li className="flex justify-between"><span>Students</span><span className="font-mono font-semibold">{data.users.students}</span></li>
                <li className="flex justify-between"><span>Editors</span><span className="font-mono font-semibold">{data.users.editors}</span></li>
                <li className="flex justify-between"><span>Super admins</span><span className="font-mono font-semibold">{data.users.superAdmins}</span></li>
              </ul>
            </section>

            <section className={`${cardClass} p-5`}>
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                <CircleGauge className="h-4 w-4" /> Credits by action (7d)
              </h3>
              {actionEntries.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">No AI spend in the last 7 days.</p>
              ) : (
                <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                  {actionEntries.map(([action, amount]) => (
                    <li key={action} className="flex justify-between">
                      <span className="font-mono text-xs">{action}</span>
                      <span className="font-mono font-semibold">{amount}</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-[11px] text-slate-500">
                Pool remaining: {data.credits.dailyRemainingSum} daily · {data.credits.monthlyRemainingSum} monthly
              </p>
            </section>

            <section className={`${cardClass} p-5`}>
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                <Layers className="h-4 w-4" /> Content &amp; sponsor
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                <li className="flex justify-between"><span>URS materials</span><span className="font-mono font-semibold">{data.content.materialsByModule.URS}</span></li>
                <li className="flex justify-between"><span>CNS materials</span><span className="font-mono font-semibold">{data.content.materialsByModule.CNS}</span></li>
                <li className="flex justify-between"><span>REP materials</span><span className="font-mono font-semibold">{data.content.materialsByModule.REP}</span></li>
                <li className="flex justify-between"><span>Sponsor impressions</span><span className="font-mono font-semibold">{data.sponsor.impression}</span></li>
                <li className="flex justify-between"><span>Sponsor clicks</span><span className="font-mono font-semibold">{data.sponsor.click}</span></li>
                <li className="flex justify-between"><span>Coupon copies</span><span className="font-mono font-semibold">{data.sponsor.coupon_copy}</span></li>
              </ul>
            </section>
          </div>

          <section className={`${cardClass} p-5`}>
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
              <Users className="h-4 w-4" /> Student roster (University ID)
            </h3>
            {!data.roster?.length ? (
              <p className="mt-3 text-sm text-slate-500">No student rows in public.students yet.</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-left text-xs">
                  <thead className="border-b border-slate-200 text-slate-500 dark:border-white/10">
                    <tr>
                      <th className="py-2 pr-3 font-semibold">Name</th>
                      <th className="py-2 pr-3 font-semibold">University ID</th>
                      <th className="py-2 pr-3 font-semibold">Email</th>
                      <th className="py-2 font-semibold">Group</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {data.roster.map((row) => (
                      <tr key={row.id} className="text-slate-700 dark:text-slate-300">
                        <td className="py-2 pr-3 font-semibold">{row.name || '—'}</td>
                        <td className="py-2 pr-3 font-mono">{row.university_id || '—'}</td>
                        <td className="py-2 pr-3">{row.email || '—'}</td>
                        <td className="py-2 font-mono">{row.group_section || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className={`${cardClass} p-5`}>
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
              <FileText className="h-4 w-4" /> Recent credit activity
            </h3>
            {data.recentActivity.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">No credit ledger events yet.</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-left text-xs">
                  <thead className="border-b border-slate-200 text-slate-500 dark:border-white/10">
                    <tr>
                      <th className="py-2 pr-3 font-semibold">When</th>
                      <th className="py-2 pr-3 font-semibold">Type</th>
                      <th className="py-2 pr-3 font-semibold">Action</th>
                      <th className="py-2 pr-3 font-semibold">Amount</th>
                      <th className="py-2 font-semibold">Remaining (d/m)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {data.recentActivity.map((row) => (
                      <tr key={row.id} className="text-slate-700 dark:text-slate-300">
                        <td className="py-2 pr-3 whitespace-nowrap">{new Date(row.created_at).toLocaleString()}</td>
                        <td className="py-2 pr-3">{row.event_type}</td>
                        <td className="py-2 pr-3 font-mono">{row.action}</td>
                        <td className="py-2 pr-3 font-mono">{row.amount}</td>
                        <td className="py-2 font-mono">{row.daily_remaining}/{row.monthly_remaining}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className={`${cardClass} p-5`}>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">External dashboards</h3>
            <p className="mt-1 text-xs text-slate-500">Traffic and database tooling live outside the app — open them here.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href={data.links.vercel}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400"
              >
                Vercel Analytics <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <a
                href={data.links.supabase}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Supabase project <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </section>

          {!!data.warnings?.length && (
            <p className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Some queries returned warnings: {data.warnings.join(' · ')}
            </p>
          )}
        </>
      )}
    </div>
  );
}
