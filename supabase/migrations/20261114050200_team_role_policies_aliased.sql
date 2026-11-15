-- Follow-up to 20261114050100 for staff policies that join company_members
-- under an alias, e.g. "JOIN company_members m ... (m.user_id = auth.uid())"
-- (product_images, product_variants, order_items, storage objects). Adds the
-- same per-area role condition next to the aliased membership match.
do $$
declare
  r record;
  v_pattern constant text := '\((\w+)\.user_id = \( SELECT auth\.uid\(\) AS uid\)\)';
  v_roles text;
  v_using text;
  v_check text;
  v_sql text;
begin
  for r in
    select schemaname, tablename, policyname, qual, with_check
    from pg_policies
    where schemaname in ('public', 'storage')
      and tablename not in ('company_members', 'companies')
      and coalesce(qual, '') || coalesce(with_check, '') like '%company_members%'
      and coalesce(qual, '') || coalesce(with_check, '') not like '%.role = ANY%'
  loop
    v_roles := case
      when r.schemaname = 'storage'
        or r.tablename in ('products', 'product_images', 'product_variants')
        then 'ARRAY[''supplier''::text, ''staff''::text, ''product_manager''::text]'
      when r.tablename in ('orders', 'order_items')
        then 'ARRAY[''supplier''::text, ''staff''::text, ''order_manager''::text]'
      else 'ARRAY[''supplier''::text]'
    end;

    v_using := regexp_replace(r.qual, v_pattern,
      '((\1.user_id = ( SELECT auth.uid() AS uid)) AND (\1.role = ANY (' || v_roles || ')))', 'g');
    v_check := regexp_replace(r.with_check, v_pattern,
      '((\1.user_id = ( SELECT auth.uid() AS uid)) AND (\1.role = ANY (' || v_roles || ')))', 'g');

    v_sql := format('alter policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
    if v_using is not null then
      v_sql := v_sql || format(' using (%s)', v_using);
    end if;
    if v_check is not null then
      v_sql := v_sql || format(' with check (%s)', v_check);
    end if;
    execute v_sql;
  end loop;
end $$;
