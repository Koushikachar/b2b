-- Image slots for the homepage "Under ₹X" tiles, managed in Dashboard → Banners
-- like the deal card. A tile without an active image keeps its designed look.
alter table public.home_banners
  drop constraint if exists home_banners_slot_check;

alter table public.home_banners
  add constraint home_banners_slot_check
  check (slot in ('hero', 'promo', 'deal', 'under_9', 'under_49', 'under_99', 'under_199'));
