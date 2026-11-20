-- Drop plain indexes that duplicate another index's leading column(s). Each
-- lookup they served is served by the index noted, so reads are unchanged;
-- writes get slightly cheaper. Only plain indexes are dropped: the unique
-- constraints that keep data correct stay. (categories_active_slug_idx is a
-- partial index, WHERE is_active, so it is not a duplicate and is kept.)

-- Same column as the unique constraint stores_slug_unique (slug).
drop index if exists public.stores_slug_idx;

-- buyer_id leads recently_viewed_buyer_product_unique (buyer_id, product_id)
-- and recently_viewed_last_idx (buyer_id, last_viewed_at desc).
drop index if exists public.recently_viewed_buyer_idx;

-- buyer_id leads cart_items_buyer_product_variant_unique (buyer_id, product_id, variant_id).
drop index if exists public.cart_items_buyer_idx;
