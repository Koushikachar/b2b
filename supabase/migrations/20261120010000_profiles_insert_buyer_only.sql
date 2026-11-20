-- AUTH.md finding A-2: a signed-in user could insert their own profile row
-- with user_type = 'admin' (or 'supplier') whenever the row was missing.
-- prevent_role_escalation only fires BEFORE UPDATE, and profiles_insert_own
-- checked the id but not the role.
--
-- Self-inserted rows must now start as 'buyer'. Promotion stays where it was:
-- buyer -> supplier through the update trigger, anything else by an admin.
-- Unaffected: the handle_new_user trigger (SECURITY DEFINER, inserts the
-- default 'buyer'), ensureProfile's upsert (id + email only, so the proposed
-- row is 'buyer'), and service-role inserts (they bypass RLS).

drop policy if exists "profiles_insert_own" on public.profiles;

create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (((select auth.uid())) = id and user_type = 'buyer');
