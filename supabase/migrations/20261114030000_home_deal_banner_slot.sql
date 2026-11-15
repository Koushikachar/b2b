-- New banner slot: the portrait "deal" card beside the Under ₹X shortcuts on
-- the homepage (e.g. Light a Diya), so admins can swap it from the dashboard.
do $$
declare
  v_name text;
begin
  select con.conname into v_name
  from pg_constraint con
  where con.conrelid = 'public.home_banners'::regclass
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) ilike '%slot%';
  if v_name is not null then
    execute format('alter table public.home_banners drop constraint %I', v_name);
  end if;
end $$;

alter table public.home_banners
  add constraint home_banners_slot_check check (slot in ('hero', 'promo', 'deal'));
