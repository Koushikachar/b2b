-- Fix for 20261128000000: making the guard SECURITY DEFINER (to read
-- auth.users) changed current_user to the function owner, so the
-- "signed-in user" branch never ran and a user could set phone_verified
-- themselves. Identify the caller from the request JWT instead
-- (auth.role()), and let the trusted Auth → profile copy through with a
-- transaction-local flag only sync_profile_phone sets.

create or replace function internal.sync_profile_phone()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.phone is not null and new.phone <> '' and new.phone_confirmed_at is not null
     and (new.phone is distinct from old.phone or new.phone_confirmed_at is distinct from old.phone_confirmed_at) then
    perform set_config('app.phone_sync', 'on', true);
    update public.profiles
       set phone = right(regexp_replace(new.phone, '\D', '', 'g'), 10),
           phone_verified = true
     where id = new.id;
    perform set_config('app.phone_sync', 'off', true);
  end if;
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
  -- Trusted copy from auth.users (a confirmed SMS code): keep as written.
  if current_setting('app.phone_sync', true) = 'on' then
    return new;
  end if;

  if coalesce((select auth.role()), '') = 'authenticated' then
    -- A signed-in user: verified only if this is the account's confirmed number.
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
    -- Admin / service writes that change the number without stating
    -- verification: not verified.
    new.phone_verified := false;
  end if;
  return new;
end;
$$;
