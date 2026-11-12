-- Staff manage the catalogue and may already edit live products
-- (products_update_staff_editable covers draft/rejected/approved), but could
-- only delete drafts and returned products. Align delete with edit so staff
-- can remove live listings too. Products under review stay protected.
--
-- Ordered products are still refused by the app (deleteProduct checks
-- order_items first), because order_items.product_id cascades on delete.

drop policy if exists "products_delete_staff_draft_or_rejected" on public.products;

create policy "products_delete_staff_editable"
  on public.products for delete
  to authenticated
  using (
    status in ('draft', 'rejected', 'approved')
    and supplier_id in (
      select company_id from public.company_members
      where user_id = ((select auth.uid()))
    )
  );
