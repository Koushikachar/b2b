-- Weight can now be entered in mg, g or kg (always stored in kg). numeric(10,3)
-- only holds down to 1 g, so milligram weights would round to zero.
alter table public.products
  alter column carton_weight_kg type numeric(12, 6);
