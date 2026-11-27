-- Supplier-arranged order (owner request, 2026-11-27):
--   * winning_rank / hot_rank: the order of a supplier's Winning and Hot
--     Selling products on the home page (1 first; null = after ranked ones,
--     newest first).
--   * set_showcase_order: saves one list; runs as the caller, so RLS only
--     lets a supplier rank their own products.
--   * set_category_order: categories are shared by the whole site, so only
--     admins and members of a company that sells in the Core store (today
--     Direct2Hub) may reorder them.
alter table public.products
  add column if not exists winning_rank integer,
  add column if not exists hot_rank integer;

grant select (winning_rank, hot_rank) on public.products to anon, authenticated;

create or replace function public.set_showcase_order(p_flag text, p_ids uuid[])
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_rows integer;
begin
  if p_flag = 'winning' then
    update public.products p set winning_rank = t.ord
      from unnest(p_ids) with ordinality as t(id, ord)
     where p.id = t.id;
  elsif p_flag = 'hot_selling' then
    update public.products p set hot_rank = t.ord
      from unnest(p_ids) with ordinality as t(id, ord)
     where p.id = t.id;
  else
    raise exception 'Unknown showcase' using errcode = '22023';
  end if;
  get diagnostics v_rows = row_count;
  return v_rows;
end;
$$;

revoke all on function public.set_showcase_order(text, uuid[]) from public, anon;
grant execute on function public.set_showcase_order(text, uuid[]) to authenticated;

create or replace function public.set_category_order(p_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rows integer;
begin
  if not (
    internal.is_admin()
    or exists (
      select 1
        from public.products p
        join public.stores s on s.id = p.store_id
       where s.slug = 'd2h-core'
         and internal.is_company_member(p.supplier_id)
    )
  ) then
    raise exception 'Only the Core store can arrange categories' using errcode = '42501';
  end if;

  update public.categories c set sort_order = t.ord
    from unnest(p_ids) with ordinality as t(id, ord)
   where c.id = t.id;
  get diagnostics v_rows = row_count;
  return v_rows;
end;
$$;

revoke all on function public.set_category_order(uuid[]) from public, anon;
grant execute on function public.set_category_order(uuid[]) to authenticated;
