-- Owners may only change a member's role (20261114050000 added the UPDATE
-- policy). Column-level grants stop a direct API call from rewriting
-- user_id / company_id / email, which would bypass addStaff's checks.
revoke update on public.company_members from authenticated;
grant update (role) on public.company_members to authenticated;
