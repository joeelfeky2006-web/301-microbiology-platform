-- Run manually after deploying the application. Refunds can only restore the
-- authenticated caller's balance, capped at that account's configured limits.
create or replace function public.refund_user_credit(p_cost int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_rec public.user_credits%rowtype;
  v_today date := current_date;
  v_month text := to_char(current_date, 'YYYY-MM');
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_cost is null or p_cost < 1 or p_cost > 3 then
    raise exception 'Invalid refund cost' using errcode = '22023';
  end if;

  select * into v_rec from public.user_credits where user_id = v_user_id for update;
  if not found then
    raise exception 'Credit balance not found' using errcode = 'P0002';
  end if;
  if v_rec.last_daily_reset < v_today then
    v_rec.daily_remaining := v_rec.daily_limit;
    v_rec.last_daily_reset := v_today;
  end if;
  if v_rec.last_monthly_reset <> v_month then
    v_rec.monthly_remaining := v_rec.monthly_limit;
    v_rec.last_monthly_reset := v_month;
  end if;

  update public.user_credits
  set daily_remaining = least(v_rec.daily_limit, v_rec.daily_remaining + p_cost),
      monthly_remaining = least(v_rec.monthly_limit, v_rec.monthly_remaining + p_cost),
      last_daily_reset = v_rec.last_daily_reset,
      last_monthly_reset = v_rec.last_monthly_reset,
      updated_at = now()
  where user_id = v_user_id;
  return true;
end;
$$;

revoke all on function public.refund_user_credit(integer) from public, anon;
grant execute on function public.refund_user_credit(integer) to authenticated;
