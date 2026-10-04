/**
 * Integration checks for P0 credit refund hardening.
 *
 * Prerequisites:
 *   1. Apply supabase/credit-refund-abuse-fix.sql in the Supabase SQL Editor.
 *   2. Set env (e.g. from .env.local):
 *        NEXT_PUBLIC_SUPABASE_URL
 *        NEXT_PUBLIC_SUPABASE_ANON_KEY
 *        SUPABASE_SERVICE_ROLE_KEY
 *        TEST_USER_EMAIL
 *        TEST_USER_PASSWORD
 *
 * Run: node scripts/test-credit-refund.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env: ${name}`);
  return value;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function setBalance(admin, userId, daily, monthly) {
  const { error } = await admin.from('user_credits').upsert({
    user_id: userId,
    daily_remaining: daily,
    daily_limit: Math.max(daily, 8),
    monthly_remaining: monthly,
    monthly_limit: Math.max(monthly, 80),
    last_daily_reset: new Date().toISOString().slice(0, 10),
    last_monthly_reset: new Date().toISOString().slice(0, 7),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
  // Direct upsert may fail after REVOKE of writes from authenticated — service_role should still write.
  if (error) {
    // Fallback: use SQL via rpc is unavailable; surface clearly.
    throw new Error(`Could not seed balance (service_role write required): ${error.message}`);
  }
}

async function getBalance(admin, userId) {
  const { data, error } = await admin
    .from('user_credits')
    .select('daily_remaining,monthly_remaining,daily_limit,monthly_limit')
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !data) throw new Error(`Could not read balance: ${error?.message || 'missing row'}`);
  return data;
}

async function main() {
  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const anon = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  const service = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  const email = requireEnv('TEST_USER_EMAIL');
  const password = requireEnv('TEST_USER_PASSWORD');

  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const userClient = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: signIn, error: signInError } = await userClient.auth.signInWithPassword({ email, password });
  if (signInError || !signIn.session?.access_token || !signIn.user?.id) {
    throw new Error(`Test user sign-in failed: ${signInError?.message || 'no session'}`);
  }
  const userId = signIn.user.id;
  const authed = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${signIn.session.access_token}` } },
  });

  console.log('✓ signed in test user', userId);

  // --- A. Parallel spends with balance 1 / cost 1: never go negative ---
  await setBalance(admin, userId, 1, 80);
  const parallelIds = [randomUUID(), randomUUID()];
  const parallel = await Promise.all(parallelIds.map((requestId) =>
    authed.rpc('deduct_user_credit', {
      p_user_id: userId,
      p_cost: 1,
      p_action: 'chat',
      p_request_id: requestId,
    }),
  ));
  const successes = parallel.filter(({ data, error }) => {
    if (error) return false;
    const row = Array.isArray(data) ? data[0] : data;
    return row?.success === true;
  });
  const failures = parallel.length - successes.length;
  const afterParallel = await getBalance(admin, userId);
  assert(successes.length === 1, `expected exactly one parallel spend to succeed, got ${successes.length}`);
  assert(failures === 1, `expected exactly one parallel spend to fail, got ${failures}`);
  assert(afterParallel.daily_remaining === 0, `daily_remaining should be 0, got ${afterParallel.daily_remaining}`);
  assert(afterParallel.daily_remaining >= 0, 'daily_remaining went negative');
  assert(afterParallel.monthly_remaining >= 0, 'monthly_remaining went negative');
  console.log('✓ parallel spend: one win / one loss, balance never negative');

  // --- B. Matched refund + repeated refund is idempotent and capped ---
  await setBalance(admin, userId, 2, 80);
  const spendId = randomUUID();
  const { data: spendData, error: spendError } = await authed.rpc('deduct_user_credit', {
    p_user_id: userId,
    p_cost: 2,
    p_action: 'case-study',
    p_request_id: spendId,
  });
  assert(!spendError, `spend failed: ${spendError?.message}`);
  const spendRow = Array.isArray(spendData) ? spendData[0] : spendData;
  assert(spendRow?.success === true, 'spend should succeed');
  const afterSpend = await getBalance(admin, userId);
  assert(afterSpend.daily_remaining === 0, `expected 0 after spend, got ${afterSpend.daily_remaining}`);

  const { data: refund1, error: refund1Error } = await admin.rpc('refund_spend', {
    p_user_id: userId,
    p_request_id: spendId,
  });
  assert(!refund1Error && refund1 === true, `first refund_spend should return true (${refund1Error?.message || refund1})`);
  const afterRefund = await getBalance(admin, userId);
  assert(afterRefund.daily_remaining === 2, `expected restore to 2, got ${afterRefund.daily_remaining}`);
  assert(afterRefund.daily_remaining <= afterRefund.daily_limit, 'daily balance exceeded limit after refund');
  assert(afterRefund.monthly_remaining <= afterRefund.monthly_limit, 'monthly balance exceeded limit after refund');

  const { data: refund2, error: refund2Error } = await admin.rpc('refund_spend', {
    p_user_id: userId,
    p_request_id: spendId,
  });
  assert(!refund2Error && refund2 === false, `second refund_spend should return false (idempotent), got ${refund2}`);
  const afterSecond = await getBalance(admin, userId);
  assert(afterSecond.daily_remaining === afterRefund.daily_remaining, 'repeated refund changed balance');
  assert(afterSecond.daily_remaining <= afterSecond.daily_limit, 'balance above daily limit after repeated refund');
  console.log('✓ refund_spend restores once; repeat is a no-op');

  // --- C. Student JWT cannot execute refund_spend ---
  const { data: studentRefund, error: studentRefundError } = await authed.rpc('refund_spend', {
    p_user_id: userId,
    p_request_id: spendId,
  });
  assert(studentRefundError, 'student token must not be allowed to execute refund_spend');
  assert(studentRefund !== true, 'student refund_spend must not succeed');
  console.log('✓ student token cannot call refund_spend:', studentRefundError.message);

  // --- D. Legacy refund_user_credit must be gone / not executable ---
  const { error: legacyError } = await authed.rpc('refund_user_credit', {
    p_cost: 1,
    p_action: 'chat',
  });
  assert(legacyError, 'legacy refund_user_credit should not be callable by authenticated');
  console.log('✓ legacy refund_user_credit blocked:', legacyError.message);

  console.log('\nAll credit refund abuse checks passed.');
}

main().catch((error) => {
  console.error('\nFAILED:', error.message || error);
  process.exit(1);
});
