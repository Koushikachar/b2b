-- Team roles for supplier members (the company owner is separate and can do
-- everything):
--   supplier        products, orders and everything else
--   staff           products + orders
--   product_manager products only
--   order_manager   orders only
--
-- Every existing staff policy is rewritten in place (ALTER POLICY) from its
-- live definition, swapping internal.is_company_staff(x) for the role-aware
-- check of the table's area. Policies on public.companies keep the plain
-- membership check: every member may read their company.

-- 1. Roles ---------------------------------------------------------------------
alter table public.company_members
  drop constraint if exists company_members_role_check;

alter table public.company_members
  add constraint company_members_role_check
  check (role in ('supplier', 'staff', 'product_manager', 'order_manager'));

-- Owners may change a member's role (previously immutable).
drop policy if exists "company_members_update_owner" on public.company_members;
create policy "company_members_update_owner"
  on public.company_members for update
  to authenticated
  using (internal.is_company_owner(company_id))
  with check (internal.is_company_owner(company_id));

-- 2. Role-aware helpers -------------------------------------------------------
create or replace function internal.member_has_role(p_company_id uuid, p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.company_members
    where company_id = p_company_id
      and user_id = (select auth.uid())
      and role = any (p_roles)
  )
$$;

create or replace function internal.member_can_products(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select internal.member_has_role(p_company_id, array['supplier', 'staff', 'product_manager'])
$$;

create or replace function internal.member_can_orders(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select internal.member_has_role(p_company_id, array['supplier', 'staff', 'order_manager'])
$$;

create or replace function internal.member_can_all(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select internal.member_has_role(p_company_id, array['supplier'])
$$;

grant execute on function internal.member_has_role(uuid, text[]) to authenticated;
grant execute on function internal.member_can_products(uuid) to authenticated;
grant execute on function internal.member_can_orders(uuid) to authenticated;
grant execute on function internal.member_can_all(uuid) to authenticated;

-- Product lifecycle RPCs (submit, replace images/variants) authorize through
-- can_manage_company: owners, or members with product access.
create or replace function internal.can_manage_company(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select internal.is_company_owner(p_company_id)
      or internal.member_can_products(p_company_id)
$$;

-- 3. Rewrite staff policies by area -------------------------------------------
do $$
declare
  r record;
  v_fn text;
  v_using text;
  v_check text;
  v_sql text;
begin
  for r in
    select schemaname, tablename, policyname, qual, with_check
    from pg_policies
    where schemaname in ('public', 'storage')
      and (qual ilike '%is_company_staff(%' or with_check ilike '%is_company_staff(%')
  loop
    v_fn := case
      when r.schemaname = 'storage' then 'internal.member_can_products('
      when r.tablename in ('products', 'product_images', 'product_variants') then 'internal.member_can_products('
      when r.tablename in ('orders', 'order_items') then 'internal.member_can_orders('
      when r.tablename = 'companies' then null
      else 'internal.member_can_all('
    end;
    continue when v_fn is null;

    v_using := replace(r.qual, 'internal.is_company_staff(', v_fn);
    v_check := replace(r.with_check, 'internal.is_company_staff(', v_fn);
    v_sql := format('alter policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
    if v_using is not null then
      v_sql := v_sql || format(' using (%s)', v_using);
    end if;
    if v_check is not null then
      v_sql := v_sql || format(' with check (%s)', v_check);
    end if;
    execute v_sql;
  end loop;
end $$;

-- Existing members keep their access: their 'staff' role now means products
-- + orders. Owners can widen it to 'supplier' from the Team page.
