# AUTH.md

Status: DRAFT | Owner: UNKNOWN | Reviewed: 2026-11-20 (drafted from code; not yet reviewed by a person)
Auth provider: Supabase Auth via `@supabase/ssr` | Allowed sign-in methods: email one-time code / magic link, Google OAuth

This file describes how authentication and authorization work **today**, taken from the code.
Each item is marked **Existing** (in the code), **Planned** (agreed, not built), **Gap** (missing,
no decision yet), or **UNKNOWN** (it's a hosted Supabase or Vercel setting not visible in the repo).

Settings quoted from `supabase/config.toml` apply to the **local** Supabase stack only. The hosted
project's values were read from the Supabase Management API on 2026-11-20 (read-only, non-secret
fields only) and are recorded under "Hosted Supabase Auth settings" below.

## Identity lifecycle

**Signup.** Existing: no separate signup step.
- `requestOtp` (`lib/auth/actions.ts`) calls `signInWithOtp` with `shouldCreateUser: true`, so the
  first sign-in creates the account. Google sign-in also creates one on first use.
- Required field: email only, validated with zod. There are no passwords.
- Profile row: the `on_auth_user_created` trigger (`20260906091225_create_profiles.sql`) creates the
  `profiles` row with `user_type = 'buyer'`. `ensureProfile` (`lib/auth/profile.ts`) is an
  idempotent backstop after every sign-in.
- Email verification: entering the emailed 6-digit code or clicking the link is itself the proof
  of email ownership.
- Duplicate accounts: an email maps to one Supabase user. If Google and email sign-in share an
  address, Supabase links them by default (hosted: automatic linking is on, manual linking off).

**Login.** Existing:
- Email: `requestOtp` sends a code → `/auth/verify` → `verifyOtp` checks it with type `email`.
- Magic link and Google: both land on `/auth/callback` (`app/auth/callback/route.ts`).
  - Google uses the PKCE code exchange.
  - Email links use `token_hash` plus a `type` from an allowlist.
  - Both go through `ensureProfile`, then redirect to `next`.
- Failed attempts:
  - The user sees one generic message ("That code did not work").
  - The server logs a structured event, `auth.verify_otp_failed`, with the email masked.
- Abuse limits come from Supabase Auth rate limits, the same locally and hosted: 30 sign-ins and
  30 code checks per 5 minutes per IP, and 2 emails per hour on the built-in sender.
- The app has no rate limit of its own on these actions.
- Redirect after login: `next` is filtered by `getSafeNextPath` (`lib/auth/paths.ts`), which only
  allows paths starting with `/` and not `//`.
  - Finding A-1, fixed 2026-11-20: a value like `/\evil.example` used to pass. Browsers treat
    `/\` as `//`, so it was an open redirect. The function now also rejects backslashes and
    control characters, and requires the result to stay on this site (`tests/auth-paths.test.ts`).

**MFA.** Existing for admins (A-3, built 2026-11-20); not offered to other roles.
- Authenticator-app (TOTP) MFA is enabled hosted and, since 2026-11-20, locally
  (`supabase/config.toml` → `[auth.mfa.totp]`). Phone and WebAuthn MFA are off.
- App: `app/admin/layout.tsx` and every admin Server Action (`requireAdmin()`) call
  `requireAdminMfa` (`lib/auth/admin-mfa.ts`). Unless this session verified an authenticator code
  in the last 12 hours, the admin goes to `/auth/mfa`.
  - First visit: scan a QR code and confirm a code (set-up).
  - Afterwards: enter the current code.
  - The rule is unit-tested in `tests/admin-mfa.test.ts`.
- Database: migration `20261120040000_admin_mfa_and_audit.sql` makes `internal.is_admin()`
  require an `aal2` JWT. A stolen admin session without MFA gets no admin power through the Data
  API either (`tests/admin-mfa-db.test.ts`).
  - **Not applied yet.** Deploy the app first, then `pnpm db:push`. Applied before the deploy,
    admins would lose admin access with no MFA screen to fix it.
- Lost authenticator: there's no self-service reset. A person with dashboard access deletes the
  admin's factor in Supabase → Authentication → Users → the user → MFA factors, and the admin
  sets up a new one on their next visit.

**Password reset.** Not applicable: there are no passwords.
- Account access is recovered by signing in again with a new emailed code.
- Codes are 6 digits, single use, and expire after 3600 s (1 hour), locally and hosted.
  - Fixed 2026-11-20: the hosted project was sending **8-digit** codes while the app only
    accepts 6, so typed codes couldn't be used. Magic links and Google still worked.
  - The hosted setting is now 6 (`mailer_otp_length`, changed through the Management API with
    the owner's approval).
- The `recovery` type is accepted by `/auth/callback` but nothing in the app sends one.

**Sensitive changes.**
- Existing, email change: `requestEmailChange` (`lib/buyer/account-actions.ts`) calls
  `auth.updateUser({ email })`. Supabase emails a confirmation link, and the address only changes
  once it is clicked. Both the old and new addresses must confirm (locally
  `double_confirm_changes = true`; hosted `mailer_secure_email_change_enabled = true`).
- Gap: no re-authentication before sensitive changes. This covers changing the email, deleting a
  supplier account, and an owner adding staff or changing their roles. Nothing notifies the user
  either, beyond Supabase's own emails.

**Account recovery and deletion.**
- Existing, supplier owner self-delete: `deleteAccount` (`lib/supplier/actions.ts`).
  - Owner only, checked through `getSupplierContext`.
  - Uses the service-role client to call `auth.admin.deleteUser`, which cascades to profile,
    company, products and memberships.
- Existing, buyer deletion: a manual request. `/account/privacy` opens an email to support, and
  "our team verifies the request" (`app/(storefront)/account/privacy/page.tsx`).
- Gap: there is no written procedure for how support verifies the requester's identity before
  deleting, or what support staff are allowed to do. **Decision needed from the owner.**

## Sessions

**Session mechanism and storage.** Existing:
- Supabase access and refresh tokens are kept in cookies managed by `@supabase/ssr`:
  - server-side in `lib/supabase/server.ts`
  - browser-side in `lib/supabase/client.ts`
  - refreshed in `proxy.ts` → `lib/supabase/middleware.ts`, which calls `auth.getClaims()`
- The proxy only refreshes the session. It does **not** protect routes. Protection lives in
  layouts, pages and Server Actions, which call `auth.getUser()` (see Permissions).

**Expiry, refresh and rotation.**
- Access token 3600 s (1 hour), refresh-token rotation on, reuse interval 10 s. Same locally and
  hosted.
- Admins (A-4, owner's choice 2026-11-20): admin pages and actions need an authenticator code
  verified within the last **12 hours** (`ADMIN_MFA_MAX_AGE_SECONDS` in `lib/auth/admin-mfa.ts`).
  This is done in the app, so it works on any Supabase plan.
- Everyone else: no maximum session length or idle timeout. Hosted `sessions_timebox` and
  `sessions_inactivity_timeout` are both 0, and the local `[auth.sessions]` is commented out. A
  buyer's or supplier's refresh token stays usable until they sign out. The owner chose not to
  add global limits for now.

**Logout and revocation.**
- Existing: `signOut()` (`lib/auth/actions.ts`) calls `supabase.auth.signOut()`. Its default
  scope is `global`, which revokes every refresh token the user has, on all devices.
- Removing a team member (`removeStaff`) deletes their `company_members` row, so their dashboard
  access ends on their next request.
- Gap, stolen device: there is no written procedure. Proposed steps:
  1. The user signs out on any device. This is a global sign-out.
  2. If they can't sign in, an admin revokes the user's sessions in the Supabase dashboard
     (Authentication → Users → the user → sign out / delete sessions).
  3. If the account is a supplier owner, check the company's team list and remove anyone unknown.

**Cookie-based web sessions.**
- Existing: cookie options are `@supabase/ssr`'s defaults, set by the library, not by app code.
  - The cookies are not `HttpOnly`, because the browser client reads the session.
  - `SameSite=Lax`. `Secure` should be on over HTTPS in production: **verify on the deployed
    site**.
- CSRF: Server Actions get Next.js's built-in Origin-against-Host check.
- The session-reading route handlers are GETs with no side effects (data export, product export,
  import template).
- The one POST route, `/api/search/image`, is a read-only, rate-limited search. It doesn't use
  the session for authorization.

**Native token storage.** Not applicable: there is no native app.

## Permissions

All checks run on the server.
- The app layer redirects people away from pages they can't use.
- The database enforces the same rules again with row-level security (RLS). RLS is the real
  security boundary.
- See RLS-POLICIES.md (to be written) for the table-by-table detail.

Roles are stored in `profiles.user_type` (`buyer` | `supplier` | `admin`) and
`company_members.role` (`supplier` | `staff` | `product_manager` | `order_manager`). A company
owner is identified by `companies.owner_id`.

**Anonymous.** Existing:
- Can read the public catalogue: approved, non-hidden products through public views, plus
  categories, stores, banners and public storage images.
- Can use search, its suggestions and image search. Suggestions and image search have
  app-level rate limits (`tests/search-suggest-rate-limit.test.ts`,
  `lib/ai/image-search-rate-limit.ts`).
- Can reach `/auth/*`.
- `anon` has no grants on `profiles` (`revoke all on public.profiles from anon`).
- `/account`, `/cart`, `/checkout` and `/orders` redirect to `/auth/login` when there's no
  user: `requireAccount` (`lib/buyer/account-session.ts`) or `getSessionUser` checks in each page.

**Buyer (member).** Existing:
- Can read and change only their own profile, addresses, cart, saved products, recently viewed
  items and orders. RLS policies scope these rows to `auth.uid()`.
- Can export their own data (`/account/privacy/export`).
- Cannot change their own `user_type` except buyer → supplier. That is enforced by the
  `prevent_role_escalation` trigger (`20260906110048_add_reviewed_by.sql`).
- Finding A-2 (fixed; migration applied to the remote database 2026-11-20): that trigger runs `before update` only,
  and `profiles_insert_own` checked the id but not `user_type`.
  - So a user whose profile row was missing could insert it with `user_type = 'admin'`.
  - Migration `20261120010000_profiles_insert_buyer_only.sql` limits self-inserts to
    `user_type = 'buyer'`.
  - `tests/role-escalation-db.test.ts` covers it.

**Supplier owner.** Existing:
- Has full access to their own company: business profile, products, orders, analytics,
  discounts, customers and team.
- Resolved by `getSupplierContext` (`lib/auth/guard.ts`) from `companies.owner_id`.
- Owner-only pages and actions use `requireOwnerCompany`.
- Every query is scoped by company id, and RLS enforces the same scoping.

**Supplier team member.** Existing:
- Access depends on role (`lib/supplier/permissions.ts`):

  | Role | Can use |
  |---|---|
  | `supplier` | everything except owner-only pages |
  | `staff` | products and orders |
  | `product_manager` | products only |
  | `order_manager` | orders only |

- `requireDashboardArea` redirects to the right section. The database enforces the same rules
  through the `internal.member_can_*` functions (migration `20261114050000`).
- Only the owner can add or remove members or change their roles (`lib/supplier/staff-actions.ts`).
- An account that already owns a business can't join another one as staff.

**Admin.** Existing:
- Access to `/admin/*` is checked in `app/admin/layout.tsx` and in every admin Server Action
  (`requireAdmin()`). Both read `profiles.user_type = 'admin'`.
- RLS admin policies use `internal.is_admin()`, a SECURITY DEFINER function with a fixed
  `search_path`.
- Admins have broad power: all companies, products, categories, stores, banners, orders and
  profiles (read).
- There is no in-app way to make someone an admin. It can only be done directly in the database.
- MFA required, re-checked every 12 hours (see MFA above).
- Admin action log (A-6): with migration `20261120040000` applied, every insert, update or delete
  an admin makes is written to `public.audit_logs`, by trigger, on these tables:
  - catalogue: categories, stores, banners, store listings and stock, global products
  - supplier data: products and their images and variants, companies, team members
  - accounts: profiles, account-to-store links
  - commerce: coupons, orders

  Each entry records who made the change, the table, row id, action and status change, and the
  **names** of the changed columns (never their values, so bank or personal data isn't copied).
  Only admins can read it. Earlier status-change audits (products, KYB) keep writing there too.
- Gap: admin rights are not split into narrower named privileges.

**Service (service-role key).** Existing: `createAdminClient()` (`lib/supabase/admin.ts`) is used
for these tasks only:
- deleting a supplier owner's auth user (`deleteAccount`)
- inviting a new team member by email (`staff-actions.ts`)
- indexing product images for image search (`product-actions.ts`, `product-import-actions.ts`)
- removing product image files from storage (`product-actions.ts`)
- order notifications (`lib/notifications/order-notifications.ts`)
- festival events (`lib/storefront/events.ts`)

The service-role key bypasses RLS, so each of these call sites must check the caller's identity
and ownership first. It is server-only and throws if the key is missing.

Rules for all code:
- Check identity, role, tenant (company) and ownership on every protected request.
- Never trust a role, user ID or company ID that comes from the client alone. Derive it from
  `auth.getUser()` plus a database lookup, as `getSupplierContext` does.

## Acceptance evidence

The automated tests that cover these rules talk to a local Supabase stack. They **skip** when it
isn't running (`describe.skipIf(!available)`).
- On 2026-11-20 they could not be run: this machine has no Docker, which `supabase start` needs.
- "Actual" stays "Not run" until someone with Docker runs `supabase start`, then `pnpm test`, and
  records the result here.
- CI (`.github/workflows/ci.yml`) runs the unit tests on every push and pull request. It doesn't
  run the DB tests.

| Test | Expected | Actual | Evidence | Reviewer |
|---|---|---|---|---|
| Logged-out request to `/account`, `/orders`, `/supplier/dashboard`, `/admin` | Redirect to `/auth/login` | Not run | Manual check needed; guards in code as listed above | — |
| Buyer A reads Buyer B's saved products | No rows | Not run | `tests/buyer-workflow.test.ts` "one user's saves are not visible to another user" | — |
| Buyer A reads Buyer B's order address or contact | No rows | Not run | `tests/order-lifecycle-db.test.ts` "hides addresses from other buyers", "never exposes one buyer's order contact to another buyer" | — |
| Supplier A updates Supplier B's order or product | Rejected | Not run | `tests/order-lifecycle-db.test.ts` "blocks other suppliers from updating the order"; `tests/lifecycle.test.ts` "another verified supplier cannot change someone else's seo fields" | — |
| Team role limits (for example, an order manager can't open products) | Redirect, and the DB rejects writes | Partly | `tests/team-permissions.test.ts` covers the role table (passes); the DB side isn't tested | — |
| Expired or reused email code | Rejected with a generic message | Not run | Supabase behaviour; manual check needed | — |
| Revoked session (after global sign-out) | Next request treated as signed out | Not run | Manual check needed | — |
| Member updates own `profiles.user_type` to `admin` | Rejected ("user_type change not permitted") | Not run | `tests/role-escalation-db.test.ts` | — |
| Member inserts own profile row with `user_type = 'admin'` | Rejected | Not run (needs migration `20261120010000` applied locally) | `tests/role-escalation-db.test.ts` | — |
| Login with `next=/\evil.example` (and `//`, tab and absolute-URL variants) | Lands on a same-site path | Pass, 2026-11-20 (failed before the fix) | `tests/auth-paths.test.ts` | — |
| Admin MFA rule: no factor → set-up; factor unused this session or older than 12 h → code | As described | Pass, 2026-11-20 | `tests/admin-mfa.test.ts` | — |
| Admin without MFA changes a category through the Data API | Rejected (no admin power) | Not run (needs migration `20261120040000` locally) | `tests/admin-mfa-db.test.ts` | — |
| Admin with MFA changes a category | Allowed, and one `audit_logs` row with column names only | Not run | `tests/admin-mfa-db.test.ts` | — |

## Open findings and decisions

| ID | Finding | Proposed change | Status |
|---|---|---|---|
| A-1 | Post-login open redirect through a `/\` prefix in `getSafeNextPath` | Reject `\` and control characters, and require a same-origin path (`lib/auth/paths.ts`) | Fixed in code 2026-11-20; unit test passes |
| A-2 | `profiles` insert can set `user_type` | Migration `20261120010000_profiles_insert_buyer_only.sql` limits self-insert to `user_type = 'buyer'` | **Applied** 2026-11-20 (listed in the remote migration history; policy not re-read); DB test written, not yet run |
| A-3 | No MFA for admins | TOTP set-up and code screen (`/auth/mfa`); app guards (`requireAdminMfa`); `internal.is_admin()` requires `aal2` (migration `20261120040000`) | App code done 2026-11-20. **Migration not applied: deploy first, then `pnpm db:push`** |
| A-4 | No session time limit | Admins re-enter their code every 12 hours (app). Global limits for other users declined by the owner | Done in code 2026-11-20 |
| A-5 | No support identity check for manual buyer deletion | Write the procedure | Decision needed |
| A-6 | No audit log of admin actions | Trigger on 17 admin-managed tables writes to `audit_logs` (column names only) | In migration `20261120040000`, **not applied yet** |
| A-7 | Hosted Supabase Auth settings not recorded | Recorded below; 8-digit code mismatch fixed | Done 2026-11-20 |
| A-8 | Hosted email codes were 8 digits, app accepted 6 | Hosted `mailer_otp_length` set to 6 | Fixed 2026-11-20 |

## Hosted Supabase Auth settings

Read 2026-11-20 from the Management API (non-secret fields only). Check again after changing
anything in the dashboard.

| Setting | Hosted value |
|---|---|
| Site URL | `https://b2b-five-gold.vercel.app` |
| Redirect URL allowlist | `http://localhost:3000/**`, `http://127.0.0.1:3000/**`, `https://b2b-ox-m.vercel.app/auth/callback`, `https://b2b-five-gold.vercel.app/auth/callback` |
| Sign-ups | open (email and Google); phone and anonymous sign-in off |
| Email confirmation before sign-in | required (`mailer_autoconfirm = false`) |
| Email code | 6 digits (changed from 8 on 2026-11-20), expires after 1 hour |
| Email change | both addresses must confirm |
| Access token lifetime | 3600 s; refresh-token rotation on, 10 s reuse window |
| Session timebox / idle timeout | none (0 / 0); single session per user: off |
| MFA | TOTP on (enroll + verify), up to 10 factors; phone and WebAuthn off |
| Rate limits | 2 emails/hour (built-in mailer), 30 code sends and 30 verifications per 5 min per IP, 150 token refreshes per 5 min |
| CAPTCHA | off |
| Email sender | Supabase built-in mailer (no custom SMTP) |
| Account linking | automatic; manual linking off |

The redirect allowlist matches THREAT-MODEL.md T26: production domains plus localhost only.
`b2b-ox-m.vercel.app` is a second Vercel domain. Remove it if it's no longer used.
