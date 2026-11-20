# THREAT-MODEL.md

Status: DRAFT | Owner: UNKNOWN | Reviewed: 2026-11-20 (drafted from code; not yet reviewed by a person)

What we protect, who might attack it, where they can get in, and what stops them.

Detail lives in the other four files:
- AUTH.md: identity, sessions, roles
- SECURITY.md: coding rules
- RLS-POLICIES.md: per-table access
- ENV.md: secrets

Finding IDs (A-, S-, R-, E-) point to those files.

**System in one paragraph.** Direct2Hub (D2H) is a B2B wholesale marketplace.
- **Hosting:** a Next.js 16 app on Vercel, using Supabase for the Postgres database (with RLS),
  authentication and file storage.
- **Buyers** browse public stores (D2H Core, D2H Select), keep carts and wishlists, check out
  into orders, accept quotations and claim test-mode UPI payments.
- **Suppliers**, with team roles, manage products (including bulk import), orders, coupons and
  customers.
- **Admins** run categories, stores, banners, product approval and supplier verification
  (KYB).
- **Two external services** are called by the server: a separate CLIP image-search service and
  OpenWA for WhatsApp notifications.

## 1. Assets

| Asset | Where it lives | Why it matters |
|---|---|---|
| Buyer personal data: email, name, phone, delivery addresses, GST details | `profiles`, `buyer_addresses`, `orders.delivery` | privacy; Indian DPDP Act obligations |
| Supplier business data: GSTIN, PAN, **bank account and IFSC**, KYB documents | `companies`, private `company_docs` bucket | fraud: changing payout details, identity theft |
| Supplier base prices and margins | `products`/`product_variants` price columns (not granted to clients), `companies.margin_pct` | the business model; buyers must only see marked-up prices |
| Orders, quotations, payment claims | `orders`, `order_items`, `quotations`, `order_events` | money; contract trail |
| Coupons, wallet, promo rewards | `coupons`, `wallet_transactions`, `promo_event_claims` | direct monetary value |
| Accounts and roles | Supabase Auth, `profiles.user_type`, `company_members.role` | admin = full control |
| Secrets | Vercel environment, `.env` (ENV.md) | the service-role key bypasses all RLS |
| Public catalogue integrity: products, banners, images | tables plus public buckets | defacement, phishing, malware hosting |
| Availability and cost | Vercel functions, CLIP service, Supabase quotas, email quota | outages, unexpected bills |

## 2. Actors

| Actor | Starting access | Likely goals |
|---|---|---|
| Anonymous visitor or bot | public pages, public views, `/auth/*`, search and image search, the anon Data API key | scrape prices or suppliers, run up costs, spam sign-ups, phishing through redirects |
| Buyer | own rows | read other buyers' data, change order totals, abuse coupons or promo rewards, get free goods |
| Supplier owner | own company | read competitors' prices or orders, inject content (XSS), make themselves admin, approve their own products |
| Supplier team member | role-limited | go beyond their role (for example a product manager reading orders) |
| Removed team member or ex-staff | none (membership deleted) | keep access through an old session |
| Admin | everything | mistakes; a hijacked admin account is the worst case |
| Compromised third party (OpenWA, CLIP host, npm package) | whatever we send or run | data exfiltration, supply-chain code |
| Developer or AI agent | repo, `.env` | accidental secret leaks, weakened policies |

## 3. Entry points and trust boundaries

```
Browser ──(HTTPS)──► Vercel: Next.js
  │                     ├─ pages / layouts   (identity checks; redirects only)
  │                     ├─ Server Actions    (zod validation, then the user's own Supabase client)
  │                     ├─ /api/search/image (rate-limited) ──► CLIP service (Bearer token)
  │                     ├─ GET route handlers (exports, template)
  │                     └─ service-role client (bypasses RLS) ──► Supabase
  │
  └─(anon or user JWT)──► Supabase Data API / RPC / Storage   ◄── RLS IS THE BOUNDARY
                         Auth (email code, magic link, Google)
Vercel ──► OpenWA (WhatsApp, API key)       Vercel ──► remote image URLs (bulk import, SSRF guard)
```

Things to keep in mind:
- **The browser can call Supabase directly** with the public publishable key and the user's
  token. Every table, view, RPC and bucket must hold up on its own, without the Next.js app in
  front of it.
- Public RPCs granted to clients:
  - checkout and orders: `create_orders_from_cart`, `claim_order_payment`,
    `queue_order_notification`
  - quotations: `create_quotation`, `respond_to_quotation`
  - products: `submit_product_for_approval`, `replace_product_images`,
    `replace_product_variants`, `unpublish_product`
  - supplier verification (KYB): `submit_kyb`, `approve_kyb`, `reject_kyb`
  - product approval: `approve_product`, `reject_product`
  - team and deletes: `staff_candidate`, `ordered_product_ids`
  - rewards: `claim_promo_event_reward`
  - search and pricing: `match_product_images`, `store_product_price`, `store_variant_price`
  - store stock: `reserve_store_stock`, `release_store_stock`, `decrement_store_stock`
- The admin-type and state-changing functions check the caller themselves. For example,
  `approve_*` checks `internal.is_admin()`, and the state-machine triggers are in
  `20260916110000`.

## 4. Threats and mitigations (STRIDE)

Status: **Mitigated** = control exists in code or the database. **Partial** = control exists
with a known gap. **Open** = no control yet.

| # | Threat | Category | Controls | Status |
|---|---|---|---|---|
| T1 | Buyer reads or changes another buyer's cart, addresses, orders or wishlist by changing an id | Info disclosure / tampering | RLS on `auth.uid()` for every buyer table; DB tests in `buyer-workflow` and `order-lifecycle-db` | Mitigated (tests need a local DB run) |
| T2 | Buyer changes the order total or prices at checkout | Tampering | `create_orders_from_cart` recomputes prices on the server; `tests/checkout-db.test.ts` "cannot be called with forged financial arguments"; buyers can't update `orders` | Mitigated |
| T3 | Supplier sees competitors' base prices or orders | Info disclosure | Price columns not granted; `supplier_prices` view filters by owner or member; order RLS by company | Mitigated |
| T4 | Team member goes beyond their role (a product manager reads orders) | Elevation | Role-aware policies plus `is_company_member` = owner or orders role (R-1, applied 2026-11-20) | Mitigated (DB test written, not run) |
| T5 | User makes themselves admin or supplier | Elevation | `prevent_role_escalation` trigger (update); insert policy limited to `buyer` (A-2, applied) | Mitigated (DB test written, not run) |
| T6 | Supplier self-approves a product or verification (KYB) | Elevation | Insert only as `draft`; state-machine triggers; `approve_*` RPCs check admin | Mitigated |
| T7 | Stored XSS through product content shown to every buyer | Tampering / elevation | `sanitizeRichText` for descriptions; `serializeJsonLd` for JSON-LD (S-1, fixed); React escaping | Mitigated |
| T8 | Phishing through the post-login redirect (`?next=`) | Spoofing | `getSafeNextPath` rejects `//`, `/\` and control characters, and requires same-origin (A-1, fixed, tested) | Mitigated |
| T9 | Phishing or malware hosted in our public buckets | Spoofing / tampering | Folder-scoped write policies; bucket size and type limits (S-2, confirmed live); server re-encodes images | Mitigated |
| T10 | SSRF through bulk-import image URLs | Info disclosure | `fetchRemoteImage` blocks private/loopback IPs and refuses redirects; 10 MB cap | Partial: DNS-rebinding window (S-5) |
| T11 | Admin account takeover (phished email or stolen session) | Spoofing / elevation | Email code or Google; global sign-out; rate limits; admin MFA with a 12-hour re-check (A-3/A-4, in code); DB refuses admin power without MFA, plus an admin action log (A-6, migration `20261120040000`) | Mitigated once the migration is applied (deploy first) |
| T12 | Service-role key leak | Elevation / info disclosure | `server-only` module; never `NEXT_PUBLIC`; `.env` never committed | Partial: rotation procedure exists (ENV.md); the account-wide `SUPABASE_ACCESS_TOKEN` sits in `.env` (E-1) |
| T13 | Brute-forcing email codes or spamming sign-ups | Spoofing / DoS | Supabase Auth rate limits (hosted values UNKNOWN, A-7); generic errors; failed attempts logged | Partial |
| T14 | Cost or DoS: flooding image search, suggestions or uploads | DoS | Per-instance rate limits; Vercel 4.5 MB body cap; the CLIP service queues inference | Partial: limits are per instance (S-3); no limit on email-sending actions (S-7) |
| T15 | Coupon enumeration or abuse | Info disclosure / tampering | Redemption rules in app code; buyers only check exact (store, code) pairs through `lookup_active_coupons()` (R-2, migration `20261120050000`) | Mitigated once the migration is applied. Guessing codes one at a time is still possible: no rate limit (S-7) |
| T16 | Promo reward or wallet double-claim | Tampering | `claim_promo_event_reward` RPC; claims table unique per user and event (DB-written only) | Mitigated (verify with a test) |
| T17 | Fake payment claim marks an order paid | Tampering / repudiation | Buyer *claims* through `claim_order_payment`; the supplier confirms; `order_events` is append-only; test-mode UPI only | Mitigated for test mode. A real gateway needs signed webhooks (SECURITY.md rule 6) |
| T18 | Removed staffer keeps access | Elevation | Access re-checked per request from `company_members`; removal deletes the row | Mitigated. Their session remains but grants nothing |
| T19 | CSRF on state-changing actions | Tampering | Next.js Server Action Origin check; GET handlers have no side effects; `SameSite=Lax` cookies | Mitigated |
| T20 | Clickjacking or framing | Tampering | `X-Frame-Options: DENY`, CSP `frame-ancestors 'none'` | Mitigated |
| T21 | Injected script runs because there's no script CSP | Elevation | Output encoding (T7) is the only layer | Partial (S-4) |
| T22 | Compromised npm dependency | Elevation | Lockfile; pnpm's 1-day release-age delay; audit fixed down to 1 accepted low (dev-only `elliptic`, no fix exists); CI audit at `high` (S-6) | Mitigated |
| T23 | Leakage to third parties (OpenWA gets phone numbers and order data; CLIP gets images) | Info disclosure | Server-side only; minimal payloads | Partial: no data-processing agreements recorded; decision needed |
| T24 | Public enumeration of account-to-store links | Info disclosure | — | **Open**: `account_stores` is world-readable (R-3) |
| T25 | Stock functions called directly (`reserve_/release_/decrement_store_stock`) | Tampering | SECURITY INVOKER, plus no client update grant on `store_inventory` and an admin-only update policy, so non-admins change nothing | Mitigated. They're unused by app code, though, and accept a negative `p_qty`: validate `p_qty > 0` and the caller if they're ever made SECURITY DEFINER |
| T26 | Host-header poisoning of auth email links | Spoofing | Links built from Vercel's `x-forwarded-host`; Supabase allows only listed Redirect URLs | Mitigated: allowlist checked 2026-11-20, only two Vercel domains plus localhost (AUTH.md → Hosted settings) |
| T27 | Developer or AI agent weakens a policy or commits a secret | All | SECURITY.md rules; migrations reviewed; `.gitignore`; CI typecheck, lint, tests and audit on every push and pull request | Partial: CI doesn't run the DB policy tests |

## 5. Abuse cases to test

Write each as a test where possible; DB cases go in `tests/*-db.test.ts`.

1. Buyer B requests `/orders/<A's order id>` and calls `orders?id=eq.<id>`: 404 and no rows.
2. A product manager calls `orders?select=*` directly: no rows (`team-order-roles-db.test.ts`).
3. A signed-in user posts `profiles` with `user_type=admin`: rejected (`role-escalation-db.test.ts`).
4. A supplier saves the product title `x</script><script>alert(1)</script>`: page source shows
   `<` and no alert (`json-ld.test.ts` covers the serializer).
5. Login link `?next=/\evil.example`: lands on this site (`auth-paths.test.ts`).
6. A supplier uploads an `.html` file to `product_images` through the Storage API: rejected (S-2).
7. A buyer calls `create_orders_from_cart` with a forged price: rejected (`checkout-db.test.ts`).
8. Two parallel `claim_promo_event_reward` calls: exactly one claim. **No test yet.**
9. 50 image searches in a minute from one IP: 429 after 12, per instance.

## 6. Accepted risks, for now

- Rate limits are per serverless instance (S-3).
- Supabase's own email rate limit is the only limit on team-invite emails (S-7).
- Payments are test-mode only, so there's no real money to steal yet. **This file must be
  revisited before any real payment integration.**

## 7. Review this file when

- a payment gateway, webhook or new external service is added
- a new role, or a new table or bucket holding personal or financial data, is added
- auth methods change (MFA, passwords, new OAuth providers)
- after any security incident, and in any case every 3 months

## Open items, in priority order

1. **Deploy, then apply** migrations `20261120040000` (admin MFA and action log: A-3, A-6) and
   `20261120050000` (coupon lookup: R-2) with `pnpm db:push`. Until then T11 and T15 stay open in
   the database. Each admin sets up an authenticator app on their next admin visit.
2. **E-1** Move `SUPABASE_ACCESS_TOKEN` out of `.env` (owner: run `supabase login`, then delete
   the line).
3. Run the local-DB tests (needs Docker: `supabase start`, then `pnpm test`) and record the results
   in AUTH.md's evidence table.
4. **S-7** Rate limits on coupon checks and email-sending actions.
5. **R-3, S-4, S-5, E-4, T23, T25 hardening.**

Done 2026-11-20:
- S-6: dependency audit and CI
- A-7 / T26: hosted settings and redirect allowlist recorded
- A-8: hosted 8-digit email codes fixed to 6
- A-4: admin 12-hour re-check
- the code side of A-3, A-6 and R-2
