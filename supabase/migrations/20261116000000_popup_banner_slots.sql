-- Image slots for the home page offer popup, managed in Dashboard → Banners.
-- popup_desktop is landscape, popup_mobile is portrait; when only one is
-- uploaded it is shown on every device. Without either, the built-in art shows.
alter table public.home_banners
  drop constraint if exists home_banners_slot_check;

alter table public.home_banners
  add constraint home_banners_slot_check
  check (slot in (
    'hero', 'promo', 'deal', 'under_9', 'under_49', 'under_99', 'under_199',
    'popup_desktop', 'popup_mobile'
  ));
