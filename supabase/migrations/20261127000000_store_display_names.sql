-- Store names drop the "D2H" prefix (owner request, 2026-11-27). Slugs stay,
-- so every existing link and lookup keeps working.
update public.stores set name = 'Core' where slug = 'd2h-core' and name = 'D2H Core';
update public.stores set name = 'Select' where slug = 'd2h-select' and name = 'D2H Select';
