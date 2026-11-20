-- Phone-only images for the home deal card and the Under ₹X tiles, managed in
-- Dashboard → Banners. On phones the card is tall and the tiles are square
-- (wide on desktop), so admins can upload a picture made for that shape.
-- Each falls back to its desktop image (and vice versa) when only one exists.
alter table public.home_banners
  drop constraint if exists home_banners_slot_check;

alter table public.home_banners
  add constraint home_banners_slot_check
  check (slot in (
    'hero', 'promo', 'deal', 'under_9', 'under_49', 'under_99', 'under_199',
    'popup_desktop', 'popup_mobile',
    'deal_mobile', 'under_9_mobile', 'under_49_mobile', 'under_99_mobile', 'under_199_mobile'
  ));
