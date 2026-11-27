-- One-time question after login/sign-up (owner request, 2026-11-27): what kind
-- of buyer is this? Null = not answered yet, so the storefront asks once.
-- Users already update their own profile row (profiles_update_own); the role
-- escalation trigger still guards user_type.
alter table public.profiles
  add column if not exists business_type text;

alter table public.profiles
  drop constraint if exists profiles_business_type_check;
alter table public.profiles
  add constraint profiles_business_type_check
  check (business_type is null or business_type in (
    'retailer', 'wholesaler', 'online_seller', 'dropshipper',
    'reseller', 'business_use', 'personal_use'
  ));
