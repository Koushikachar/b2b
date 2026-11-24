-- Buyer invoice download (owner request, 2026-11-23).
--
-- A tax invoice must name the seller with its GSTIN and address, so the
-- buyer's copy of the invoice needs them. `companies` stays owner-only; this
-- extends the existing per-order window (20261024000000) with just those
-- invoice fields, appended at the end so `create or replace view` keeps the
-- existing columns. Rows are still limited to orders the caller placed.
-- PAN, bank details and documents are never exposed.

create or replace view public.order_supplier_contact as
select
  o.id as order_id,
  o.supplier_id,
  c.business_name as supplier_name,
  c.phone,
  c.gstin,
  c.address,
  c.city,
  c.state,
  c.pincode
from public.orders o
join public.companies c
  on c.id = o.supplier_id
where o.buyer_id = auth.uid();

grant select on public.order_supplier_contact to authenticated;
