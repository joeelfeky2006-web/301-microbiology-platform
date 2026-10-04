import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CreditBalance } from '@/lib/apiAuth';

type RefreshRow = {
  daily_remaining: number;
  daily_limit: number;
  monthly_remaining: number;
  monthly_limit: number;
  bonus_balance: number;
};

/** Applies Cairo-day/month reset and returns the live balance (RPC). */
export async function refreshUserCredits(
  client: SupabaseClient,
  userId: string,
): Promise<CreditBalance | null> {
  const { data, error } = await client.rpc('refresh_user_credits', { p_user_id: userId });
  if (error) return null;
  const row = (Array.isArray(data) ? data[0] : data) as RefreshRow | null;
  if (!row || row.daily_remaining == null || row.monthly_remaining == null) return null;
  return {
    daily_remaining: Number(row.daily_remaining),
    monthly_remaining: Number(row.monthly_remaining),
    daily_limit: Number(row.daily_limit),
    monthly_limit: Number(row.monthly_limit),
    bonus_balance: Number(row.bonus_balance || 0),
  };
}
