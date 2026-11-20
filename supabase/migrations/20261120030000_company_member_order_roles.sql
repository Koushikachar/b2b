-- RLS-POLICIES.md finding R-1: internal.is_company_member let the owner or ANY
-- team member through, whatever their role, and the team-role migrations
-- (20261114050000-050200) never rewrote it. Every place that uses it is on the
-- order side: orders_supplier_select/update, order_items_supplier_select,
-- order_events_select_supplier, quotations(_items)_select_supplier, the
-- notification_outbox policy, and the quotation / payment-claim / notification
-- functions. So a product_manager could read and update orders through the
-- Data API although the app hides orders from them.
--
-- Redefine it to match lib/supplier/permissions.ts: the owner, or a member
-- whose role includes orders (supplier, staff, order_manager). Same name,
-- signature and grant, so no policy or function needs rewriting.

create or replace function internal.is_company_member(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select internal.is_company_owner(p_company_id)
      or internal.member_can_orders(p_company_id)
$$;

comment on function internal.is_company_member(uuid) is
  'Order-side access: company owner, or a member with an orders role (supplier, staff, order_manager).';

-- Product deletion asks "has this product been ordered?" before deleting,
-- because order_items.product_id is ON DELETE CASCADE and a delete would wipe
-- those lines from order history. With the change above a product_manager no
-- longer sees order_items, so that check would always say "never ordered".
-- This answers the yes/no question without exposing any order data: it
-- returns only ids of products the caller may manage that have order lines.
create or replace function public.ordered_product_ids(p_product_ids uuid[])
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select distinct p.id
  from public.products p
  where p.id = any (p_product_ids)
    and internal.can_manage_company(p.supplier_id)
    and exists (select 1 from public.order_items oi where oi.product_id = p.id)
$$;

revoke execute on function public.ordered_product_ids(uuid[]) from public, anon;
grant execute on function public.ordered_product_ids(uuid[]) to authenticated;
