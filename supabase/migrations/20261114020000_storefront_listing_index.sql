-- The storefront's hottest query: live products of one store, newest first
-- (home rows, store pages, "Under ₹X"). Partial on the live-listing predicate
-- so the index stays small and skips drafts/hidden rows entirely.
create index if not exists products_live_store_created_idx
  on public.products (store_id, created_at desc)
  where status = 'approved' and is_hidden = false;
