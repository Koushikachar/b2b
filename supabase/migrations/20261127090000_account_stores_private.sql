-- Security (2026-11-27): account_stores links user account ids to stores and
-- was readable by anyone (including signed-out visitors). The app only ever
-- reads the signed-in account's own rows (lib/supplier/account-stores.ts),
-- which "account_stores_manage_own" already allows; admins keep
-- "account_stores_admin_all". Drop the public read.
drop policy if exists "account_stores_select_public" on public.account_stores;
revoke select on public.account_stores from anon;
