-- Security (2026-11-27): signed-out visitors (anon) could EXECUTE admin,
-- supplier and stock functions. Each one checks its caller inside (admin
-- only / not your product / RLS), so none was exploitable, but anon has no
-- legitimate use for them: take that layer away too. Signed-in users keep
-- access exactly as before. Still public on purpose: list_storefront_products
-- (catalogue), match_product_images (photo search), store_product_price and
-- store_variant_price (read-only listed prices).
do $$
declare
  fn regprocedure;
begin
  for fn in
    select p.oid::regprocedure
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'approve_kyb', 'reject_kyb', 'submit_kyb',
        'approve_product', 'reject_product', 'unpublish_product', 'submit_product_for_approval',
        'replace_product_images', 'replace_product_variants',
        'staff_candidate',
        'decrement_store_stock', 'reserve_store_stock', 'release_store_stock'
      )
  loop
    execute format('revoke execute on function %s from public, anon', fn);
    execute format('grant execute on function %s to authenticated, service_role', fn);
  end loop;
end;
$$;
