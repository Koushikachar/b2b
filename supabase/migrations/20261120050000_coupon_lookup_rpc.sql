-- RLS-POLICIES.md R-2 / THREAT-MODEL.md T15: coupons_select_active let any
-- signed-in user list every supplier's active coupon codes with one query,
-- including codes meant to be shared only by link.
--
-- Buyers only ever need "is THIS code active at THIS store?", so that becomes
-- a function returning exact (supplier, code) matches, and the broad read is
-- dropped. Suppliers, their team and admins keep their own policies.
-- create_orders_from_cart is SECURITY DEFINER and reads coupons itself, so
-- checkout is unaffected.

create or replace function public.lookup_active_coupons(p_supplier_ids uuid[], p_codes text[])
returns setof public.coupons
language sql
stable
security definer
set search_path = ''
as $$
  select c.*
  from unnest(p_supplier_ids, p_codes) as wanted(supplier_id, code)
  join public.coupons c
    on c.supplier_id = wanted.supplier_id
   and c.code = wanted.code
  where c.is_active
    and (select auth.uid()) is not null
  limit 50
$$;

revoke execute on function public.lookup_active_coupons(uuid[], text[]) from public, anon;
grant execute on function public.lookup_active_coupons(uuid[], text[]) to authenticated;

drop policy if exists "coupons_select_active" on public.coupons;
