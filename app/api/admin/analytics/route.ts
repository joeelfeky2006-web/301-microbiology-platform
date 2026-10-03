import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authenticate } from '@/lib/apiAuth';
import { PRIMARY_ADMIN_EMAIL } from '@/lib/admin';
import { createSupabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function resolveSuperAdmin(
  userClient: { rpc: (fn: string) => Promise<{ data: unknown; error: unknown }>; from: (table: string) => any },
  userId: string,
  userEmail?: string,
): Promise<boolean> {
  const normalizedEmail = (userEmail || '').trim().toLowerCase();
  if (normalizedEmail && normalizedEmail === PRIMARY_ADMIN_EMAIL) return true;

  try {
    const { data: rpcRole, error } = await userClient.rpc('get_current_user_role');
    if (!error && rpcRole === 'super_admin') return true;
  } catch {
    /* fall through */
  }

  try {
    const { data: roleRow } = await userClient
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();
    if (roleRow?.role === 'super_admin') return true;
  } catch {
    /* ignore */
  }

  return false;
}

/**
 * GET /api/admin/analytics
 * Super-admin aggregate: users, credits, content, sponsor events.
 */
export async function GET(request: NextRequest) {
  const identity = await authenticate(request);
  if ('response' in identity) return identity.response;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!url || !anonKey || !token) {
    return NextResponse.json({ error: 'Supabase configuration or session token is missing.' }, { status: 503 });
  }

  const userClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const isSuperAdmin = await resolveSuperAdmin(userClient, identity.userId, identity.email);
  if (!isSuperAdmin) {
    return NextResponse.json({ error: 'Super admin access is required.' }, { status: 403 });
  }

  const admin = createSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Admin service client is not configured.' }, { status: 503 });
  }

  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    rolesResult,
    creditsResult,
    historyResult,
    recentResult,
    materialsResult,
    quizzesResult,
    sponsorResult,
    authUsersResult,
    studentsResult,
  ] = await Promise.all([
    admin.from('user_roles').select('role'),
    admin.from('user_credits').select('daily_remaining,monthly_remaining,daily_limit,monthly_limit'),
    admin
      .from('user_credit_history')
      .select('action,amount,event_type')
      .eq('event_type', 'spend')
      .gte('created_at', since7d),
    admin
      .from('user_credit_history')
      .select('id,action,amount,event_type,daily_remaining,monthly_remaining,created_at')
      .order('created_at', { ascending: false })
      .limit(20),
    admin.from('materials').select('module'),
    admin.from('lecture_quizzes').select('is_published'),
    admin.from('sponsor_analytics').select('event_type'),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    admin.from('students').select('id,email,name,university_id,group_section,created_at').order('email'),
  ]);

  const roles = rolesResult.data || [];
  let editors = 0;
  let superAdmins = 0;
  for (const row of roles) {
    if (row.role === 'editor') editors += 1;
    else if (row.role === 'super_admin') superAdmins += 1;
  }

  const authUsers = authUsersResult.data?.users || [];
  const totalAccounts = authUsers.length;
  const studentCount = Math.max(0, totalAccounts - editors - superAdmins);

  const credits = creditsResult.data || [];
  let dailyRemainingSum = 0;
  let monthlyRemainingSum = 0;
  let lowDailyCount = 0;
  for (const row of credits) {
    dailyRemainingSum += Number(row.daily_remaining) || 0;
    monthlyRemainingSum += Number(row.monthly_remaining) || 0;
    if ((Number(row.daily_remaining) || 0) === 0) lowDailyCount += 1;
  }

  const spends = historyResult.data || [];
  const spendsByAction: Record<string, number> = {};
  let spendEvents7d = 0;
  let spendCredits7d = 0;
  for (const row of spends) {
    const action = String(row.action || 'unknown');
    const amount = Number(row.amount) || 0;
    spendsByAction[action] = (spendsByAction[action] || 0) + amount;
    spendEvents7d += 1;
    spendCredits7d += amount;
  }

  const materials = materialsResult.data || [];
  const materialsByModule = { CNS: 0, URS: 0, REP: 0, other: 0 };
  for (const row of materials) {
    const mod = String(row.module || '').trim().toUpperCase();
    if (mod === 'CNS' || mod === 'URS' || mod === 'REP') materialsByModule[mod] += 1;
    else materialsByModule.other += 1;
  }

  const quizzes = quizzesResult.data || [];
  const quizzesPublished = quizzes.filter((q) => q.is_published).length;

  const sponsorEvents = sponsorResult.data || [];
  const sponsor = { impression: 0, click: 0, coupon_copy: 0 };
  for (const row of sponsorEvents) {
    const t = row.event_type as keyof typeof sponsor;
    if (t in sponsor) sponsor[t] += 1;
  }

  const roster = (studentsResult.data || []).map((row) => ({
    id: row.id as string,
    email: String(row.email || ''),
    name: String(row.name || ''),
    university_id: row.university_id ? String(row.university_id) : '',
    group_section: row.group_section ? String(row.group_section) : '',
    created_at: row.created_at as string | null,
  }));
  const withUniversityId = roster.filter((row) => row.university_id).length;

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    users: {
      total: totalAccounts,
      students: studentCount,
      editors,
      superAdmins,
      withUniversityId,
    },
    credits: {
      rows: credits.length,
      dailyRemainingSum,
      monthlyRemainingSum,
      lowDailyCount,
      spendEvents7d,
      spendCredits7d,
      spendsByAction,
    },
    content: {
      materialsTotal: materials.length,
      materialsByModule,
      quizzesTotal: quizzes.length,
      quizzesPublished,
    },
    sponsor,
    roster,
    recentActivity: recentResult.data || [],
    links: {
      vercel:
        process.env.NEXT_PUBLIC_VERCEL_PROJECT_URL
        || 'https://vercel.com/dashboard',
      supabase: 'https://supabase.com/dashboard/project/qmlxpmgbriklvsetuhsq',
    },
    warnings: [
      rolesResult.error?.message,
      creditsResult.error?.message,
      historyResult.error?.message,
      recentResult.error?.message,
      materialsResult.error?.message,
      quizzesResult.error?.message,
      sponsorResult.error?.message,
      authUsersResult.error?.message,
      studentsResult.error?.message,
    ].filter(Boolean),
  });
}
