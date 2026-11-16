-- Supplier directory (/suppliers): one row per verified supplier with its live
-- product count and categories, so the directory is a single public query.
-- Mirrors category_product_counts: only approved, visible products count.

create or replace view public.storefront_supplier_directory as
select
  s.id,
  s.business_name,
  s.city,
  s.state,
  s.logo_path,
  s.created_at,
  count(distinct p.id)::bigint as product_count,
  coalesce(
    array_agg(distinct cat.name) filter (where cat.name is not null),
    '{}'
  ) as category_names
from public.storefront_suppliers s
left join public.products p
  on p.supplier_id = s.id
  and p.status = 'approved'
  and p.is_hidden = false
left join public.categories cat
  on cat.id = p.category_id
  and cat.is_active = true
group by s.id, s.business_name, s.city, s.state, s.logo_path, s.created_at;

grant select on public.storefront_supplier_directory to anon, authenticated;
