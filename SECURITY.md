# SECURITY.md

Status: DRAFT | Owner: UNKNOWN | Reviewed: 2026-11-20 (drafted from code; not yet reviewed by a person)

These are the rules every contributor, and every AI agent, must follow when changing this app.
Each rule lists how this codebase already meets it (**Existing**) and where it falls short
(**Gap**), so a change can follow the existing pattern instead of inventing one.

How people sign in, sessions and roles: see AUTH.md. Per-table database access:
RLS-POLICIES.md (to be written). Environment variables: ENV.md (to be written).

## Non-negotiable rules

### 1. Never hard-code secrets, or put them in prompts, logs, URLs or client bundles

Existing:
- `.env*` is git-ignored, and no `.env` file appears anywhere in git history (checked
  2026-11-20).
- Server-only secrets are read only in modules that import `server-only`, so a client import
  fails the build:
  - `SUPABASE_SERVICE_ROLE_KEY` in `lib/supabase/admin.ts`
  - `IMAGE_SEARCH_SERVICE_TOKEN` in `lib/ai/image-inference-client.ts`
  - `OPENWA_API_KEY` in `lib/notifications/whatsapp.ts`
- Only `NEXT_PUBLIC_*` values reach the browser, and these are public by design: the Supabase
  URL and publishable key, site URL, support contacts, GA id and test UPI id.
- Logs record error codes and messages, not request bodies or tokens. The failed-code log in
  `lib/auth/actions.ts` masks the email address.

Rules:
- A new secret goes in `.env` and the Vercel project settings, is read only in a `server-only`
  module, and is listed in ENV.md.
- Never give a secret a `NEXT_PUBLIC_` name.
- Never paste `.env` values into an AI chat, an issue or a commit. To check that a value is set,
  check its length, not its content.
- The test files contain the **standard local Supabase demo keys** (`tests/*-db.test.ts`). They
  are public and only work against `127.0.0.1`. Never put a real project key in a test.

### 2. Validate input on the server with explicit types, lengths and allowed values

Existing:
- Server Actions parse `FormData` with zod schemas. Examples:
  - `lib/supplier/products.ts`: title 10–140 characters, UUID category, numeric ranges
  - `lib/auth/actions.ts`: email, 6-digit code
  - `lib/admin/banners.ts`: link URL
- Enumerations are checked against fixed lists, for example `isMemberRole` and the banner
  slots.
- The database adds `check` constraints, such as `profiles_user_type_check` and
  `home_banners_slot_check`.

Rules:
- Every new Server Action or route handler validates its input with zod before using it.
- Never treat client-side validation (in forms or in `lib/shrink-image.ts`) as the check.
- A new enumerated value goes in both the TypeScript list and the database constraint, in the
  same change.

### 3. Use parameterized queries; encode output for where it is displayed

Existing:
- All database access goes through supabase-js query builders or RPCs with named parameters.
  The app builds no raw SQL strings.
- React escapes text output by default.
- Rich-text product descriptions are cleaned on the server with `sanitizeRichText`
  (`lib/supplier/sanitize.ts`).
  - It allows a short list of tags, with only `href`/`target`/`rel` on links.
  - Links can only be `http`, `https` or `mailto`, and are forced to
    `rel="noopener noreferrer nofollow"`.
  - Only the cleaned HTML reaches `dangerouslySetInnerHTML`
    (`components/storefront/expandable-rich-text.tsx`).
- JSON-LD `<script>` tags are built with `serializeJsonLd` (`lib/json-ld.ts`), which escapes
  `<`. See finding S-1.

Rules:
- `dangerouslySetInnerHTML` only ever receives `sanitizeRichText` output or `serializeJsonLd`
  output.
- Any other use needs a review note explaining why it is safe.
- Text going into URLs uses `encodeURIComponent` or `URLSearchParams`.
- Redirect targets taken from user input go through `getSafeNextPath` (`lib/auth/paths.ts`).

### 4. Check authorization on every protected operation; default to no access

Existing:
- Every protected page and Server Action resolves the user on the server, using
  `requireUser`, `requireAdmin`, `requireAccount`, `getSupplierContext` or
  `requireOwnerCompany`.
- Each query is then scoped to that user's own id or company id.
- RLS is on for every table. New tables get **no** Data API access until it is granted
  explicitly, and the migrations follow that pattern.
- The service-role client (`createAdminClient`) bypasses RLS. It is used only for the tasks
  listed in AUTH.md → Service, and each call site checks the caller's ownership first.

Rules:
- Never take a user id, company id or role from the request body as proof of who the caller
  is. Derive it on the server.
- Add an RLS policy and a matching app check together. RLS is the real security boundary; the
  app check only gives the user a friendly redirect.
- New uses of `createAdminClient()` need a comment explaining why RLS can't do the job, plus an
  ownership check before the call.

### 5. Apply abuse controls to public endpoints, login, uploads and costly AI calls

Existing:
- Login and email codes use Supabase Auth's rate limits. Hosted values are UNKNOWN; see
  AUTH.md A-7.
- Image search (`/api/search/image`, CLIP inference) is limited to 12 requests per minute per
  client (`lib/ai/image-search-rate-limit.ts`).
- Search suggestions are rate-limited too (`tests/search-suggest-rate-limit.test.ts`).
- Uploads are capped by Vercel's 4.5 MB request limit, plus per-file size and type checks in
  each upload action.

Gaps:
- The rate limits are kept in memory, separately in each serverless instance, so the real
  limit grows with the number of instances (stated in the file's own comment). That is fine
  for slowing abuse, but it is not a firm quota (finding S-3).
- The app has no rate limits of its own on Server Actions that send email (`addStaff`) or
  write data. Only Supabase's own email limit applies.

### 6. Verify webhook authenticity and prevent duplicate or replayed side effects

Existing: **there are no inbound webhooks** today; no route accepts calls from other services.
- WhatsApp notifications are outbound only (`lib/notifications/whatsapp.ts`).
- Payments are a test-mode UPI QR (`lib/orders/test-payment.ts`) with no provider callback.

Rule:
- The first real webhook (payment provider, WhatsApp delivery receipts) must:
  1. check the provider's signature with a constant-time comparison before parsing the body
  2. reject old timestamps
  3. record each event id, so a repeated delivery is ignored
- Add it to THREAT-MODEL.md at the same time.

### 7. Restrict upload type, size and storage permissions; treat filenames as untrusted

Existing:
- Server-side uploads check type and size before storing:
  - avatars: JPG/PNG/WebP, enforced in the action and by the bucket limits
  - banners and categories: 5 MB
  - product images: `validateProductImageFile`
- Product images are re-encoded by sharp (`lib/image-optimize.ts`), which drops any non-image
  content.
- Storage paths are generated by the server (`<uid>/…` and similar). The original filename is
  never used as the path.
- Bucket policies limit writes to the owner's folder or to admins. `company_docs` (KYB
  documents) is private; the image buckets are public-read.
- Remote image URLs in bulk import are fetched by `fetchRemoteImage`
  (`lib/supplier/fetch-remote-image.ts`). It refuses private and loopback addresses and does
  not follow redirects (SSRF protection).

Gaps:
- **Finding S-2 (fixed, applied 2026-11-20):** product photos chosen in the bulk
  importer upload **straight from the browser** to the public `product_images` bucket
  (`app/supplier/dashboard/products/import/product-import.tsx`).
  - That bucket, like the other image and document buckets, had no size or type limit. Only
    `avatars` did.
  - Migration `20261120020000_storage_bucket_limits.sql` sets limits on every bucket.
  - When you add a bucket, set `file_size_limit` and `allowed_mime_types` in the same
    migration.
- The SSRF check resolves DNS and then fetches as two separate steps, so DNS rebinding between
  them is theoretically possible. The risk is low because redirects are refused (finding S-5).

### 8. Repo-specific rules

- **Security headers** are set for every route in `next.config.ts`:
  - HSTS, `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy` and
    `Permissions-Policy`
  - a CSP limited to `frame-ancestors`, `base-uri` and `object-src`

  Don't weaken them. There is no script CSP yet (finding S-4). Adding one needs nonces and a
  test of every page, and is its own change.
- **Schema changes go in migrations** (`supabase/migrations/`), never ad-hoc. A migration is
  applied with `pnpm db:push` by the owner.
- **Don't weaken checks to make tests pass.** Fix the code or the test data.

## Findings

| ID | Finding | Change | Status |
|---|---|---|---|
| S-1 | Stored XSS: the product page JSON-LD used plain `JSON.stringify`, so a product title such as `…</script><script>…` (allowed by the 140-character title rule) could run in every visitor's browser | `serializeJsonLd` (`lib/json-ld.ts`) escapes `<`, as recommended by the Next 16 JSON-LD guide; used in `app/(storefront)/products/[id]/page.tsx` and `app/layout.tsx` | **Fixed 2026-11-20**; `tests/json-ld.test.ts` passes |
| S-2 | Storage buckets have no size or file-type limits; browser-direct product uploads can store any file publicly | Migration `20261120020000_storage_bucket_limits.sql`: JPG/PNG/WebP only, with `product_images` 10 MB, `banners` and `category_images` 5 MB, `company_logos` 2 MB, and `company_docs` PDF/images 10 MB, each at or above the app's own caps | **Applied** 2026-11-20; live bucket limits confirmed with a read-only check |
| S-3 | Rate limits are per-instance, in memory | A shared store (for example a Postgres table or Upstash) if exact limits become necessary | Accepted for now; revisit |
| S-4 | No script Content-Security-Policy | Nonce-based CSP through `proxy.ts`, tested on all routes | Proposed, separate change |
| S-5 | `fetchRemoteImage` DNS check and fetch are not pinned to the same address | Pin the resolved IP for the connection | Low priority |
| S-6 | Dependency vulnerabilities not reviewed | Audit run on 2026-11-20: 62 advisories (2 critical, 19 high). Fixes: `sanitize-html` 2.18.2, `zod` 4.6.7 and `shadcn` 4.23.0 (runtime); `vitest` 5.1.1 and Storybook 10.6.7 (dev); `overrides` in `pnpm-workspace.yaml` for flagged packages pulled in by other packages. Now 1 low remains, with no fix published (see below). CI (`.github/workflows/ci.yml`) runs `pnpm audit --audit-level high` with typecheck, lint and tests | Done 2026-11-20 |
| S-7 | Abuse limits on email-sending and write-heavy Server Actions | Decide which actions need limits | Decision needed |

### Accepted dependency advisories (2026-11-20)

`pnpm audit` shows 1 low advisory. Everything else is fixed: `uuid` was pinned to 11.x and
`minimatch` to 11.x through `overrides` in `pnpm-workspace.yaml`, after checking how `exceljs`,
`ts-morph` and `@typescript-eslint` call them.

| Package | Severity | Pulled in by | Why accepted |
|---|---|---|---|
| `elliptic` ≤6.6.1 | low | `@storybook/nextjs` → `node-polyfill-webpack-plugin` → `crypto-browserify` (dev only) | **No fixed version exists**; 6.6.1 is the latest release. It only runs inside the local Storybook UI build, never in the app or on Vercel. It disappears only if Storybook is removed |

**Release-age rule:** pnpm holds back packages published less than a day ago. Don't add
`minimumReleaseAgeExclude` entries to get around it; pick the newest version that's old enough
(as was done for Storybook 10.6.7 on 2026-11-20).

## Before you ship a change, check

- [ ] Inputs validated on the server with zod
- [ ] Caller and ownership derived on the server; RLS policy present for any new table
- [ ] No secret in code, logs, URLs or `NEXT_PUBLIC_*`
- [ ] Any HTML or JSON-in-HTML goes through `sanitizeRichText` or `serializeJsonLd`
- [ ] Uploads: type and size checked, server-generated path, bucket policy scoped
- [ ] `pnpm typecheck`, `pnpm lint` and `pnpm test` pass (CI checks these plus `pnpm audit`); DB tests run locally if policies changed
