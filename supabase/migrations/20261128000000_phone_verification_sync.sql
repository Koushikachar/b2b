-- Mobile verification (owner request, 2026-11-28): a number counts as
-- verified only when Supabase Auth confirmed it with an SMS code (phone
-- sign-in, or updateUser({ phone }) + verifyOtp('phone_change')). Nothing
-- the app or browser sends can mark it verified.
--
-- 1. Auth → profile: when auth.users gets a confirmed phone, copy it to the
--    profile (10-digit Indian format, like the rest of the app) as verified.
-- 2. The profile guard: for signed-in users, phone_verified is recomputed
--    from auth.users on every update (true only if the profile number is the
--    account's confirmed number); other writers keep the old behaviour
--    (changing the number without stating verification resets it).

create or replace function internal.sync_profile_phone()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.phone is not null and new.phone <> '' and new.phone_confirmed_at is not null
     and (new.phone is distinct from old.phone or new.phone_confirmed_at is distinct from old.phone_confirmed_at) then
    update public.profiles
       set phone = right(regexp_replace(new.phone, '\D', '', 'g'), 10),
           phone_verified = true
     where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_phone_confirmed on auth.users;
create trigger on_auth_user_phone_confirmed
  after update of phone, phone_confirmed_at on auth.users
  for each row execute function internal.sync_profile_phone();

-- New accounts created by phone sign-in already carry the number.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, phone, phone_verified)
  values (
    new.id,
    new.email,
    nullif(right(regexp_replace(coalesce(new.phone, ''), '\D', '', 'g'), 10), ''),
    new.phone_confirmed_at is not null and coalesce(new.phone, '') <> ''
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function internal.guard_profile_phone_verified()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_phone text;
  v_confirmed timestamptz;
begin
  if current_user = 'authenticated' then
    select u.phone, u.phone_confirmed_at into v_phone, v_confirmed
      from auth.users u where u.id = new.id;
    new.phone_verified :=
      v_confirmed is not null
      and new.phone is not null
      and length(regexp_replace(new.phone, '\D', '', 'g')) >= 10
      and right(regexp_replace(coalesce(v_phone, ''), '\D', '', 'g'), 10)
        = right(regexp_replace(new.phone, '\D', '', 'g'), 10);
  elsif new.phone is distinct from old.phone
        and new.phone_verified is not distinct from old.phone_verified then
    new.phone_verified := false;
  end if;
  return new;
end;
$$;
