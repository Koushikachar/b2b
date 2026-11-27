-- GST at checkout + buyer details for suppliers (owner request, 2026-11-27).
--
-- 1. profiles.no_gstin: the buyer said "I don't have a GST number", so the
--    checkout stops asking. Adding a GSTIN later clears it (app side).
-- 2. order_buyer_details: what the supplier needs about the buyer of one of
--    their orders: name, phone, GSTIN + registered name/address and the
--    one-time "what describes you" answer. Mirrors order_supplier_contact:
--    a view (owner rights) filtered to orders of the caller's own company
--    (owner or team member), so profiles RLS stays closed otherwise.
alter table public.profiles
  add column if not exists no_gstin boolean not null default false;

create or replace view public.order_buyer_details as
select
  o.id as order_id,
  o.supplier_id,
  p.full_name,
  p.phone,
  p.gstin,
  p.gst_business_name,
  p.gst_address,
  p.no_gstin,
  p.business_type
from public.orders o
join public.profiles p
  on p.id = o.buyer_id
where exists (
  select 1
  from public.companies c
  where c.id = o.supplier_id
    and (
      c.owner_id = (select auth.uid())
      or exists (
        select 1 from public.company_members m
        where m.company_id = c.id and m.user_id = (select auth.uid())
      )
    )
);

revoke all on public.order_buyer_details from anon;
grant select on public.order_buyer_details to authenticated;
