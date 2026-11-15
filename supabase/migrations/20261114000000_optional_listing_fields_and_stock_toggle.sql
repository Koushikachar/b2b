-- Supplier listing simplification + stock toggle.
--
-- 1. HSN code and GST rate become optional. SKU stays NOT NULL/unique: the app
--    generates one when the supplier leaves it blank. Selling unit keeps its
--    'pcs' default, so leaving it blank in the form stores 'pcs'.
-- 2. `is_out_of_stock` lets a supplier switch a live listing to "Out of stock"
--    without hiding it. The storefront shows the state and blocks add-to-cart.
-- 3. The publish validator only checks HSN / GST when a value is present.

alter table public.products
  alter column hsn_code drop not null;

alter table public.products
  add column if not exists is_out_of_stock boolean not null default false;

-- `products` uses column-level SELECT grants (20261030200000). `store_id`
-- (20261109000012) was never granted, so every storefront read filtered by
-- store failed with 42501 and store catalogues rendered empty.
grant select (is_out_of_stock, store_id) on public.products to anon, authenticated;

create or replace function internal.validate_product_for_approval(p_product_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_supplier uuid;
  v_title text;
  v_description text;
  v_sku text;
  v_hsn text;
  v_unit text;
  v_price numeric;
  v_moq integer;
  v_stock integer;
  v_lead integer;
  v_gst numeric;
  v_category uuid;
  v_cat_count bigint;
  v_image_count bigint;
  v_count bigint;
  v_variant record;
  v_prev_sku text := null;
  v_collision uuid;
begin
  select supplier_id into v_supplier from public.products where id = p_product_id;
  if v_supplier is null then
    raise exception 'Product not found';
  end if;

  select p.title, p.description, p.seller_sku, p.hsn_code, p.unit,
         p.price_per_unit, p.moq, p.stock_qty, p.lead_time_days, p.gst_rate,
         p.category_id
    into v_title, v_description, v_sku, v_hsn, v_unit,
         v_price, v_moq, v_stock, v_lead, v_gst,
         v_category
    from public.products p
    where p.id = p_product_id;

  if v_title is null or length(btrim(v_title)) < 10 then
    raise exception 'Product title must be at least 10 characters';
  end if;
  if v_description is null or length(btrim(v_description)) < 50 then
    raise exception 'Product description must be at least 50 characters';
  end if;
  if v_hsn is not null and v_hsn !~ '^[0-9]{4,8}$' then
    raise exception 'HSN code must be 4-8 digits';
  end if;
  if v_unit is null or v_unit not in ('pcs', 'kg', 'box', 'mtr', 'ltr') then
    raise exception 'Invalid unit';
  end if;
  if v_price is null or v_price <= 0 then
    raise exception 'Price must be greater than 0';
  end if;
  if v_moq is null or v_moq < 1 then
    raise exception 'MOQ must be at least 1';
  end if;
  if v_stock is null or v_stock < 0 then
    raise exception 'Stock cannot be negative';
  end if;
  if v_lead is null or (v_lead < 1 or v_lead > 90) then
    raise exception 'Lead time must be between 1 and 90 days';
  end if;
  if v_gst is not null and v_gst not in (0, 5, 12, 18, 28) then
    raise exception 'Invalid GST rate';
  end if;

  select count(*) into v_cat_count
    from public.categories c
    where c.id = v_category and c.is_active;
  if v_cat_count = 0 then
    raise exception 'Category is not active';
  end if;

  select count(*) into v_image_count
    from public.product_images
    where product_id = p_product_id;
  if v_image_count < 3 then
    raise exception 'At least 3 images are required before submitting';
  end if;
  if v_image_count > 8 then
    raise exception 'At most 8 images are allowed';
  end if;

  select count(*) into v_count
    from public.product_variants
    where product_id = p_product_id;
  if v_count > 20 then
    raise exception 'At most 20 variants are allowed';
  end if;

  for v_variant in
    select pv.seller_sku, pv.label, pv.price, pv.moq, pv.stock_qty
      from public.product_variants pv
      where pv.product_id = p_product_id
      order by pv.sort
  loop
    if v_variant.label is null or length(btrim(v_variant.label)) < 2 then
      raise exception 'Each variant needs a label of at least 2 characters';
    end if;
    if v_variant.seller_sku !~ '^[A-Z0-9_-]{3,30}$' then
      raise exception 'Variant SKU %L must be 3-30 chars using letters, numbers, - or _', v_variant.seller_sku;
    end if;
    if v_variant.seller_sku = v_sku then
      raise exception 'Variant SKU %L matches the product SKU', v_variant.seller_sku;
    end if;
    if v_variant.price is null or v_variant.price <= 0 then
      raise exception 'Variant price must be greater than 0';
    end if;
    if v_variant.moq is not null and v_variant.moq < 1 then
      raise exception 'Variant MOQ must be at least 1 when set';
    end if;
    if v_variant.stock_qty is null or v_variant.stock_qty < 0 then
      raise exception 'Variant stock cannot be negative';
    end if;
    if v_prev_sku is not null and v_variant.seller_sku = v_prev_sku then
      raise exception 'Duplicate variant SKU %L', v_variant.seller_sku;
    end if;
    v_prev_sku := v_variant.seller_sku;

    select 1 into v_collision
      from public.products p
      where p.supplier_id = v_supplier
        and p.id <> p_product_id
        and (
          p.seller_sku = v_variant.seller_sku
          or exists (
            select 1 from public.product_variants pv2
            where pv2.product_id = p.id and pv2.seller_sku = v_variant.seller_sku
          )
        )
      limit 1;
    if v_collision is not null then
      raise exception 'SKU %L is already used by another of your products', v_variant.seller_sku;
    end if;
  end loop;

  select 1 into v_collision
    from public.product_variants pv3
    join public.products p3 on p3.id = pv3.product_id
    where p3.supplier_id = v_supplier
      and p3.id <> p_product_id
      and pv3.seller_sku = v_sku
    limit 1;
  if v_collision is not null then
    raise exception 'SKU %L is already used by one of your variants', v_sku;
  end if;
end;
$$;
