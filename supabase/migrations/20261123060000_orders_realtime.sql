-- Live order updates for buyers (owner request, 2026-11-23).
--
-- The buyer's order page subscribes to changes on its own order so supplier
-- actions (accept, payment received, shipped, delivered) appear without a
-- reload. Realtime enforces the same RLS as reads: a buyer is only sent
-- changes for orders they can already select.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
end;
$$;
