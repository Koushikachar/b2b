-- Order numbers use the brand prefix: D2H-###### instead of B2B-######.
--
-- New orders: the reference trigger now writes D2H-. Existing orders are
-- renamed in place (same digits, so a number customers already have still
-- finds the order — lib/orders/search.ts matches on the digits).
--
-- The rename runs as the migration role (auth.uid() is null), which
-- internal.guard_order_update lets through; app users still cannot change a
-- reference.

create or replace function internal.assign_order_reference()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.reference is null or new.reference = '' then
    new.reference := 'D2H-' || lpad(nextval('public.order_reference_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;

-- A rename is not an order update: keep each order's updated_at as it was.
alter table public.orders disable trigger set_orders_updated_at;

update public.orders
set reference = 'D2H-' || substr(reference, 5)
where reference like 'B2B-%';

alter table public.orders enable trigger set_orders_updated_at;
