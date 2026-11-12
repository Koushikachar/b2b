-- Buyer account hub, Direct2Hub wallet and festival promo events.
--
-- 1. profiles: display name, phone, avatar and GST billing details.
-- 2. avatars bucket: public read, owner-only writes by folder (= user id).
-- 3. wallet_transactions: append-only credit/debit ledger. Buyers can only
--    read their own rows; writes happen through SECURITY DEFINER functions.
-- 4. promo_events + promo_event_claims: date-windowed festival events
--    (e.g. "Light a Diya"). claim_promo_event_reward() credits the wallet
--    once per user per event, atomically.

-- 1. Profile fields ==========================================================
alter table public.profiles
  add column if not exists full_name text
    constraint profiles_full_name_len check (char_length(full_name) <= 80),
  add column if not exists phone text
    constraint profiles_phone_format check (phone is null or phone ~ '^[6-9][0-9]{9}$'),
  add column if not exists phone_verified boolean not null default false,
  add column if not exists avatar_path text,
  add column if not exists gstin text
    constraint profiles_gstin_format check (
      gstin is null
      or gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$'
    ),
  add column if not exists gst_business_name text
    constraint profiles_gst_business_name_len check (char_length(gst_business_name) <= 120),
  add column if not exists gst_address text
    constraint profiles_gst_address_len check (char_length(gst_address) <= 300),
  add column if not exists marketing_opt_in boolean not null default true;

-- A buyer may not mark their own phone as verified through the Data API.
create or replace function internal.guard_profile_phone_verified()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.phone is distinct from old.phone then
    new.phone_verified := false;
  elsif new.phone_verified is distinct from old.phone_verified
    and current_user = 'authenticated' then
    new.phone_verified := old.phone_verified;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_profile_phone_verified on public.profiles;
create trigger guard_profile_phone_verified
  before update on public.profiles
  for each row execute function internal.guard_profile_phone_verified();

-- 2. Avatars bucket ==========================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "avatars_select_public"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'avatars');

create policy "avatars_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = ((select auth.uid()))::text
  );

create policy "avatars_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = ((select auth.uid()))::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = ((select auth.uid()))::text
  );

create policy "avatars_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = ((select auth.uid()))::text
  );

-- 3. Wallet ledger ===========================================================
create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  direction text not null check (direction in ('credit', 'debit')),
  amount numeric(12, 2) not null check (amount > 0),
  reason text not null check (reason in ('event_reward', 'refund', 'order_payment', 'adjustment')),
  description text not null,
  reference text,
  created_at timestamptz not null default now()
);

create index if not exists wallet_transactions_user_created_idx
  on public.wallet_transactions (user_id, created_at desc);

alter table public.wallet_transactions enable row level security;

grant select on public.wallet_transactions to authenticated;
revoke all on public.wallet_transactions from anon;

create policy "wallet_transactions_select_own"
  on public.wallet_transactions for select
  to authenticated
  using (((select auth.uid())) = user_id);

-- 4. Promo events ============================================================
create table if not exists public.promo_events (
  key text primary key check (key ~ '^[a-z0-9-]{3,60}$'),
  theme text not null check (theme in ('light-a-diya')),
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  max_reward numeric(10, 2) not null check (max_reward > 0),
  created_at timestamptz not null default now(),
  constraint promo_events_window check (ends_at > starts_at)
);

alter table public.promo_events enable row level security;
grant select on public.promo_events to anon, authenticated;

create policy "promo_events_select_public"
  on public.promo_events for select
  to anon, authenticated
  using (true);

create table if not exists public.promo_event_claims (
  event_key text not null references public.promo_events (key) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  reward numeric(10, 2) not null check (reward > 0),
  wallet_transaction_id uuid references public.wallet_transactions (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (event_key, user_id)
);

alter table public.promo_event_claims enable row level security;
grant select on public.promo_event_claims to authenticated;
revoke all on public.promo_event_claims from anon;

create policy "promo_event_claims_select_own"
  on public.promo_event_claims for select
  to authenticated
  using (((select auth.uid())) = user_id);

-- Weighted reward: most players get a small amount, a few hit the top tier.
-- Runs as definer because buyers have no insert rights on either table.
create or replace function public.claim_promo_event_reward(p_event_key text)
returns numeric
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_event public.promo_events%rowtype;
  v_existing numeric;
  v_roll double precision := random();
  v_reward numeric;
  v_tx uuid;
begin
  if v_user is null then
    raise exception 'Sign in to take part' using errcode = '28000';
  end if;

  select * into v_event from public.promo_events where key = p_event_key;
  if not found then
    raise exception 'Event not found' using errcode = 'P0002';
  end if;
  if now() < v_event.starts_at or now() > v_event.ends_at then
    raise exception 'This event is not running right now' using errcode = 'P0001';
  end if;

  -- Serialise concurrent claims from the same user.
  perform pg_advisory_xact_lock(hashtext(p_event_key || ':' || v_user::text));

  select reward into v_existing
  from public.promo_event_claims
  where event_key = p_event_key and user_id = v_user;
  if found then
    return v_existing;
  end if;

  v_reward := case
    when v_roll < 0.70 then 5 + floor(random() * 16)        -- ₹5–20
    when v_roll < 0.95 then 21 + floor(random() * 80)       -- ₹21–100
    else 101 + floor(random() * greatest(v_event.max_reward - 100, 1))
  end;
  v_reward := least(v_reward, v_event.max_reward);

  insert into public.wallet_transactions (user_id, direction, amount, reason, description, reference)
  values (v_user, 'credit', v_reward, 'event_reward', v_event.title || ' reward', p_event_key)
  returning id into v_tx;

  insert into public.promo_event_claims (event_key, user_id, reward, wallet_transaction_id)
  values (p_event_key, v_user, v_reward, v_tx);

  return v_reward;
end;
$$;

revoke all on function public.claim_promo_event_reward(text) from public, anon;
grant execute on function public.claim_promo_event_reward(text) to authenticated;

-- Diwali 2026. Add a row like this for the next festival.
insert into public.promo_events (key, theme, title, starts_at, ends_at, max_reward)
values (
  'diwali-2026',
  'light-a-diya',
  'Light a Diya',
  '2026-10-25 00:00:00+05:30',
  '2026-11-16 23:59:59+05:30',
  600
)
on conflict (key) do nothing;
