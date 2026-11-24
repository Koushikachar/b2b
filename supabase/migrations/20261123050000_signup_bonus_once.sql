-- Signup bonus for every account, exactly once (owner request, 2026-11-23).
--
-- 1. Accounts that already existed get their Rs 100 now. The unique index
--    wallet_transactions_one_signup_bonus keeps it to one bonus per account,
--    so re-running this (or claiming again) never pays twice.
-- 2. profiles.signup_bonus_celebrated_at records that the "Congratulations"
--    popup was shown, so each account sees it once, on any device.
-- 3. claim_signup_bonus() now credits the bonus if missing and returns the
--    amount to celebrate (100) only the first time; 0 afterwards.

alter table public.profiles
  add column if not exists signup_bonus_celebrated_at timestamptz;

insert into public.wallet_transactions (user_id, direction, amount, reason, description, reference)
select p.id, 'credit', 100, 'signup_bonus', 'Welcome bonus for joining Direct2Hub', 'signup'
from public.profiles p
on conflict (user_id) where reason = 'signup_bonus' do nothing;

create or replace function public.claim_signup_bonus()
returns numeric
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_amount numeric(12, 2);
begin
  if v_uid is null then
    raise exception 'Sign in to claim the bonus' using errcode = '28000';
  end if;
  if not exists (select 1 from public.profiles where id = v_uid) then
    return 0;
  end if;

  -- Credit once per account (the unique index decides).
  insert into public.wallet_transactions (user_id, direction, amount, reason, description, reference)
  values (v_uid, 'credit', 100, 'signup_bonus', 'Welcome bonus for joining Direct2Hub', 'signup')
  on conflict (user_id) where reason = 'signup_bonus' do nothing;

  -- Celebrate once per account: only the call that sets the timestamp wins.
  update public.profiles
  set signup_bonus_celebrated_at = now()
  where id = v_uid and signup_bonus_celebrated_at is null;
  if not found then
    return 0;
  end if;

  select amount into v_amount
  from public.wallet_transactions
  where user_id = v_uid and reason = 'signup_bonus';
  return coalesce(v_amount, 0);
end;
$$;

revoke all on function public.claim_signup_bonus() from public, anon;
grant execute on function public.claim_signup_bonus() to authenticated;
