-- Follow-up to 20261114050000: the staff policies inline their membership
-- check as a subquery on company_members (not internal.is_company_staff), so
-- the role condition is added inside that subquery, per table area:
--   products / product_images / product_variants / storage  supplier, staff, product_manager
--   orders / order_items                                     supplier, staff, order_manager
--   everything else (coupons, customers, analytics events)   supplier
-- company_members and companies keep membership-only checks.
do $$
declare
  r record;
  v_member constant text := '(company_members.user_id = ( SELECT auth.uid() AS uid))';
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
      and (position(v_member in coalesce(qual, '')) > 0
        or position(v_member in coalesce(with_check, '')) > 0)
  loop
    v_roles := case
      when r.schemaname = 'storage'
        or r.tablename in ('products', 'product_images', 'product_variants')
        then 'ARRAY[''supplier''::text, ''staff''::text, ''product_manager''::text]'
      when r.tablename in ('orders', 'order_items')
        then 'ARRAY[''supplier''::text, ''staff''::text, ''order_manager''::text]'
      else 'ARRAY[''supplier''::text]'
    end;

    v_using := replace(r.qual, v_member,
      format('(%s AND (company_members.role = ANY (%s)))', v_member, v_roles));
    v_check := replace(r.with_check, v_member,
      format('(%s AND (company_members.role = ANY (%s)))', v_member, v_roles));

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
