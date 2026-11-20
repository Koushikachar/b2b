-- AUTH.md A-3 and A-6 (THREAT-MODEL.md T11): a hijacked admin session was the
-- worst case, with no MFA and no record of what an admin changed.

-- 1. Admin powers need an MFA-verified session ------------------------------
-- internal.is_admin() backs every admin RLS policy, the approve/reject RPCs
-- and the role-escalation trigger. It now also requires the caller's JWT to
-- be aal2 (an authenticator code was verified in this session). A stolen or
-- password/email-only admin session gets ordinary-user access from the Data
-- API. The app sends admins to /auth/mfa first and re-asks every 12 hours
-- (lib/auth/admin-mfa.ts). Service-role access is unaffected (it bypasses RLS).
create or replace function internal.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2'
     and exists (
       select 1 from public.profiles p
       where p.id = (select auth.uid()) and p.user_type = 'admin'
     )
$$;

-- 2. Admin action log -------------------------------------------------------
-- Every insert, update or delete an admin makes on the tables they manage is
-- written to public.audit_logs (admin-read-only, no client writes). Only the
-- names of changed columns are stored, never their values, so bank details or
-- personal data are not copied into the log. old_status / new_status carry
-- the row's status-like field when it has one.
create or replace function internal.log_admin_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  v_new jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  v_changed text[] := '{}';
begin
  if not internal.is_admin() then
    return null;
  end if;

  if tg_op = 'UPDATE' then
    select coalesce(array_agg(n.key order by n.key), '{}')
      into v_changed
      from jsonb_each(v_new) n
      where n.value is distinct from (v_old -> n.key)
        and n.key <> 'updated_at';
    if cardinality(v_changed) = 0 then
      return null;
    end if;
  end if;

  insert into public.audit_logs (actor_id, entity_type, entity_id, action, old_status, new_status, meta)
  values (
    (select auth.uid()),
    tg_table_name,
    (coalesce(v_new, v_old) ->> 'id')::uuid,
    'admin_' || lower(tg_op),
    coalesce(v_old ->> 'status', v_old ->> 'kyb_status', v_old ->> 'user_type', v_old ->> 'is_active'),
    coalesce(v_new ->> 'status', v_new ->> 'kyb_status', v_new ->> 'user_type', v_new ->> 'is_active'),
    jsonb_build_object('changed', to_jsonb(v_changed))
  );
  return null;
end;
$$;

revoke execute on function internal.log_admin_change() from public, anon, authenticated;

do $$
declare
  t text;
begin
  foreach t in array array[
    'categories', 'stores', 'home_banners',
    'store_products', 'store_product_variants', 'store_inventory',
    'global_products', 'global_product_images',
    'products', 'product_images', 'product_variants',
    'companies', 'company_members', 'profiles', 'account_stores',
    'coupons', 'orders'
  ] loop
    execute format('drop trigger if exists log_admin_change on public.%I', t);
    execute format(
      'create trigger log_admin_change after insert or update or delete on public.%I
         for each row execute function internal.log_admin_change()', t);
  end loop;
end $$;

create index if not exists audit_logs_created_idx on public.audit_logs (created_at desc);
