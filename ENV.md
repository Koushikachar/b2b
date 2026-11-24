# ENV.md

Status: DRAFT | Owner: UNKNOWN | Reviewed: 2026-11-20 (drafted from code and the names in the local `.env`)

Every environment variable this project reads: what it does, where it's used, whether it's a
secret, and what happens when it's missing. **This file never holds values.** Real values live in:

| Environment | Where values live | Who can see them |
|---|---|---|
| development | `.env` in the project root (git-ignored; never committed, checked 2026-11-20) | the developer's machine |
| production | Vercel → Project → Settings → Environment Variables | Vercel project members |
| image-search service | the host running `services/image-search` (e.g. Fly.io secrets) | that host's members |
| staging | none exists today. Vercel preview deployments use the Preview values; UNKNOWN whether those are set separately from production | — |

## Rules

- **`NEXT_PUBLIC_*` = public.**
  - Next.js copies these into the browser JavaScript at build time.
  - Anyone can read them in the page source, so never give a secret that prefix.
  - Changing one requires a **new build or deploy**, not just a restart.
- **Secrets are read only on the server,** in a module that imports `server-only` (see
  SECURITY.md rule 1). A client import of that module fails the build.
- To check a secret exists, check its **presence or length**, never its value. Don't paste
  values into AI chats, issues, logs or commits.
- Adding a variable: add it to `.env`, to Vercel (Production + Preview), and to this file, in
  the same change.
- **Rotation:** rotate a secret immediately if it was ever pasted somewhere public or logged,
  or when someone with access leaves. Procedures are under each secret below.

## Variables

### Supabase

| Name | Secret? | Used in | Required | If missing |
|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | public | `lib/supabase/{server,client,middleware,admin}.ts`, `lib/storage.ts`, `lib/storefront-cache.ts`, image URLs in dashboard pages | **yes**, everywhere | app can't reach the database; pages fail |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | public (RLS protects the data, see RLS-POLICIES.md) | Supabase clients, `lib/search-suggestions-server.ts`, `lib/supplier/staff-actions.ts` | **yes** | same as above |
| `SUPABASE_SERVICE_ROLE_KEY` | **SECRET, bypasses all RLS** | `lib/supabase/admin.ts` (`server-only`); `scripts/upscale-product-images.ts` | yes in production | `createAdminClient()` throws. These fail with a message, not a crash: supplier account deletion, team invites for new emails, image-search indexing, product image file cleanup, order notifications, festival events |
| `SUPABASE_ACCESS_TOKEN` | **SECRET, a personal access token for the whole Supabase account** | not read by app code; used by the Supabase CLI (`pnpm db:push`) | local only | CLI asks you to log in |

- Rotate the service-role key: Supabase dashboard → Project Settings → API → generate a new
  key. Update Vercel and `.env`, then redeploy.
- **`SUPABASE_ACCESS_TOKEN` should not be in the app's `.env`.** It can manage every project on
  the account, and anything that loads `.env` can read it (dev server, scripts, tests). Prefer
  `supabase login`, which stores it in the CLI's own config. **Never add it to Vercel.**
  (Finding E-1.)

### Site and support

| Name | Secret? | Used in | Required | If missing |
|---|---|---|---|---|
| `NEXT_PUBLIC_APP_URL` | public | `lib/site.ts`: canonical URLs, JSON-LD, sitemap, robots, llms.txt, product offer URLs | **yes in production**: `https://direct2hub.in` (the main domain, also on the backup domain's deployment) | in production a missing or localhost value falls back to `https://direct2hub.in` (`resolveSiteUrl`); in development, `http://localhost:3000` |

Auth email and OAuth links (`lib/auth/origin.ts`) don't use this variable. They're built from
the request's `x-forwarded-proto`/`x-forwarded-host` (set by Vercel) or the `Host` header, so a
visitor on either domain stays on that domain. Supabase only accepts them if they match
**Supabase → Authentication → URL Configuration → Redirect URLs**. List exactly the live domains
(`https://direct2hub.in/**` and `https://direct2hub.com/**`) and localhost for dev; nothing else.
| `NEXT_PUBLIC_SUPPORT_EMAIL` | public | `lib/site.ts` → Contact page, account-deletion email link, Organization JSON-LD | optional | channel hidden; deletion link goes to `/account/contact` |
| `NEXT_PUBLIC_SUPPORT_PHONE` | public | `lib/site.ts` | optional | channel hidden |
| `NEXT_PUBLIC_SUPPORT_WHATSAPP` | public | `lib/site.ts` | optional | channel hidden |
| `NEXT_PUBLIC_GA_ID` | public | `components/layout/analytics-consent.tsx` (loads only after the visitor consents) | optional | no analytics and no consent banner |

### Image search (CLIP inference service)

| Name | Secret? | Used in | Required | If missing |
|---|---|---|---|---|
| `IMAGE_SEARCH_SERVICE_URL` | not secret, but keep it server-only | `lib/ai/image-inference-client.ts` (`server-only`), `scripts/backfill-product-image-embeddings.ts` | for image search | image search returns "Image search is not configured." and new product images aren't indexed |
| `IMAGE_SEARCH_SERVICE_TOKEN` | **SECRET, shared** between the app and `services/image-search` | app: `lib/ai/image-inference-client.ts`; service: `services/image-search/src/server.js` | for image search; **must match on both sides** | app: same as above. Service: rejects **every** request (fails closed) |
| `IMAGE_SEARCH_MODEL` | no | service only | optional | `Xenova/clip-vit-base-patch32` |
| `PORT` | no | service only | optional | `8000` |
| `IMAGE_SEARCH_MODEL_TESTS` | no | `tests/image-embeddings.test.ts` | optional | real-model tests skip |

- Rotate the token: generate a long random value (at least 32 bytes, for example
  `openssl rand -hex 32`). Set it on the service host first, then Vercel, then redeploy. Image
  search fails while the two differ.
- The local value is short (10 characters; only its length was checked). Confirm the
  production value is long and random (finding E-2).

The old `NEXT_PUBLIC_TEST_UPI_*`, `OPENWA_*` and `ORDER_ALERT_WHATSAPP` settings are no longer
read by any code (the test pay page and WhatsApp alerts were removed). Don't set them on Vercel.

### Local tools

| Name | Secret? | Used in | Required | If missing |
|---|---|---|---|---|
| `REALESRGAN_PATH` | no (a file path on your PC) | `scripts/ai-upscale-product-images.ts` (`pnpm images:ai-upscale --apply`) | only to AI-upscale photos; never on Vercel | the script stops with instructions. A dry run without `--apply` works without it |

### Set by the platform

| Name | Notes |
|---|---|
| `NODE_ENV` | set by Next.js. `next.config.ts` allows the image optimizer to reach local IPs **only** in development |

## Deploy on Vercel (direct2hub.in main, direct2hub.com backup)

> **The site is self-hosted on our own server with automatic deploys from GitHub: see
> `DEPLOY.md`.** The Vercel steps below only apply if the project moves to Vercel.

1. **Region:** `vercel.json` pins functions to `sin1` (Singapore), next to the Supabase
   database (`ap-southeast-1`). Every page queries the database, so this is the main speed setting.
2. **Environment variables** (Production): `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (secret),
   `NEXT_PUBLIC_APP_URL=https://direct2hub.in`, plus the optional support/analytics and
   image-search values above. **Never** add `SUPABASE_ACCESS_TOKEN`.
3. **Domains** (Project → Settings → Domains): add `direct2hub.in` (primary) and
   `direct2hub.com`, both serving the same production deployment; add `www.direct2hub.in` and
   `www.direct2hub.com` as 308 redirects to their bare domains. Google treats `.in` as the
   original because every page's canonical link uses `NEXT_PUBLIC_APP_URL`.
4. **Supabase → Authentication → URL Configuration:** Site URL `https://direct2hub.in`; Redirect
   URLs `https://direct2hub.in/**`, `https://direct2hub.com/**`, `http://localhost:3000/**`.
5. **Image search:** not hosted. Leave `IMAGE_SEARCH_SERVICE_URL` unset on Vercel; photo search
   then shows "not configured" and everything else works.
6. **After deploy:** open `/`, a product, `/robots.txt`, `/sitemap.xml`, `/llms.txt` on both
   domains, sign in on each, then submit `https://direct2hub.in/sitemap.xml` in Google Search Console.

What the backup domain covers: a problem with the `.in` domain or its DNS. Both domains run on
the same Vercel project, so a Vercel or Supabase outage affects both.

## Local state on 2026-11-20

Checked by name and length only. Values were not read.

| Name | In local `.env` |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_APP_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ACCESS_TOKEN`, `IMAGE_SEARCH_SERVICE_URL`, `IMAGE_SEARCH_SERVICE_TOKEN`, `OPENWA_API_URL`, `OPENWA_API_KEY`, `OPENWA_SESSION_ID` | set |
| `NEXT_PUBLIC_TEST_UPI_ID`, `NEXT_PUBLIC_TEST_UPI_NAME`, `NEXT_PUBLIC_SUPPORT_WHATSAPP`, `NEXT_PUBLIC_SUPPORT_EMAIL`, `NEXT_PUBLIC_SUPPORT_PHONE` | present but empty |
| `NEXT_PUBLIC_GA_ID` | not present |

Production (Vercel) values: **UNKNOWN** in this file. Use the table above as the checklist when
reviewing Vercel.

## Findings

| ID | Finding | Proposed change | Status |
|---|---|---|---|
| E-1 | `SUPABASE_ACCESS_TOKEN` (account-wide) sits in the app's `.env`, where the dev server, scripts and tests all load it | Remove it from `.env`; use `supabase login` | Owner action |
| E-2 | Local `IMAGE_SEARCH_SERVICE_TOKEN` is short; production strength unknown | Check production uses a random value of at least 32 bytes; rotate if not | Owner action |
| E-3 | No `.env.example`, so new contributors can't see which variables to set | Add one with names only (`.gitignore` already allows it), matching this file | Proposed |
| E-4 | The image-search service compares the token with `!==`, not in constant time | Use `crypto.timingSafeEqual` in `services/image-search/src/server.js` | Low priority |
| E-5 | Not recorded whether Preview deployments use production secrets | Check Vercel; give Preview its own Supabase project or at least its own keys | Decision needed |
