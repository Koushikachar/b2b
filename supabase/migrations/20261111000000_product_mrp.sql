-- Optional MRP (maximum retail price) per product. Unlike price_per_unit it is
-- a buyer-facing figure: the storefront shows it struck through next to the
-- customer price, with the discount percentage, when it is higher.

alter table public.products
  add column if not exists mrp numeric(12, 2)
    constraint products_mrp_check check (mrp is null or mrp > 0);

-- `products` uses column-level SELECT grants (20261030200000), so a new column
-- must be granted explicitly or any select that includes it fails with 42501.
grant select (mrp) on public.products to anon, authenticated;
