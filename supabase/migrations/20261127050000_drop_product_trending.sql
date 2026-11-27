-- Trending was removed from the product form and the home page (owner
-- request, 2026-11-27). Nothing reads or writes the flag any more; dropping
-- the column also drops its column-level SELECT grant.
alter table public.products drop column if exists is_trending;
