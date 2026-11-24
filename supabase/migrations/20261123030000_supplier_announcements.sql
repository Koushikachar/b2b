-- Supplier announcements (owner request, 2026-11-23).
--
-- A supplier posts a short notice ("New stock: steel bottles") that every
-- signed-in buyer sees on Account -> Notifications, next to the automatic
-- "new product" entries. Only members who can manage products may post or
-- remove their company's notices; reading is open to signed-in users.

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.companies (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 3 and 80),
  message text not null check (char_length(btrim(message)) between 1 and 300),
  product_id uuid references public.products (id) on delete set null,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists announcements_created_idx
  on public.announcements (created_at desc);

alter table public.announcements enable row level security;

revoke all on public.announcements from anon;
grant select, insert, delete on public.announcements to authenticated;

create policy "announcements_select_signed_in"
  on public.announcements for select
  to authenticated
  using (true);

-- The linked product, when given, must belong to the same company.
create policy "announcements_insert_product_members"
  on public.announcements for insert
  to authenticated
  with check (
    internal.member_can_products(supplier_id)
    and created_by = (select auth.uid())
    and (
      product_id is null
      or exists (
        select 1 from public.products p
        where p.id = product_id and p.supplier_id = announcements.supplier_id
      )
    )
  );

create policy "announcements_delete_product_members"
  on public.announcements for delete
  to authenticated
  using (internal.member_can_products(supplier_id));
