# RLS-POLICIES.md

Status: DRAFT | Owner: UNKNOWN | Reviewed: 2026-11-20 (drafted from migrations; not yet compared with the live database)

Who can read and write each table, as enforced by Postgres row-level security (RLS) and grants.
RLS is the security boundary in this app. Page and Server Action checks (AUTH.md → Permissions)
only send users to the right screen.

**How this was produced:** a script replayed all 88 migrations in `supabase/migrations/` in
order, applying every `create`, `drop` and `alter` of a policy or grant, and listed what remains.

> **Limit: staff policies are rewritten inside the database.** Migrations `20261114050000`,
> `…050100` and `…050200` add role conditions to staff policies by reading `pg_policies` inside
> `DO` blocks. The final text of those policies only exists in the database. Their effect is
> described under "Team roles" below.
>
> Before trusting this file for a decision, compare it with the live database:
> ```sql
> select schemaname, tablename, policyname, cmd, roles, qual, with_check
> from pg_policies where schemaname in ('public','storage') order by 1,2,3;
> ```

## Who's who

| Term | Meaning |
|---|---|
| anon | not signed in |
| buyer | any signed-in user, for their own rows (`buyer_id` / `user_id` / `profile_id` = `auth.uid()`) |
| owner | the supplier company's owner (`companies.owner_id = auth.uid()`) |
| member | a row in `company_members`; access depends on role (see "Team roles") |
| admin | `internal.is_admin()`, which checks `profiles.user_type = 'admin'` **and**, once migration `20261120040000` is applied, an MFA-verified (`aal2`) session |
| service | the service-role key: bypasses RLS entirely (server only; see AUTH.md → Service) |

## Defaults that apply everywhere

- **RLS is enabled on every table in `public`** (all 35). No table is open just because a policy
  is missing.
- Tables get **no Data API access until a grant is added**. Migrations grant each table
  explicitly to `anon` or `authenticated`, then restrict rows with policies.
- **Private prices are hidden by column.** On `products` and `product_variants`, the price
  columns (`price_per_unit`, `price_slabs`, `sample_price`, variant `price`) are left out of the
  `select` grants.
  - Buyers and anon see margin-adjusted prices through the `storefront_prices` view.
  - Suppliers see their own base prices through the `supplier_prices` view.
- **Order history can only be written by the database itself.** `order_events`, `quotations`,
  `quotation_items`, `notification_outbox`, `wallet_transactions`, `order_checkout_requests`
  and `audit_logs` grant clients `select` only. Writes happen in SECURITY DEFINER functions and
  triggers.
- **`product_image_embeddings`** has RLS on, no grants and no policies. Only the service role
  can use it (image search).
- The `internal.*` helper functions are SECURITY DEFINER with `search_path = ''`, and live in a
  schema the Data API doesn't expose.

## Tables

### Accounts

| Table | anon | buyer (own rows) | supplier side | admin | Notes |
|---|---|---|---|---|---|
| `profiles` | — | read, insert, update | — | read all | Insert must be `user_type = 'buyer'` (migration `20261120010000`, applied). `prevent_role_escalation` trigger blocks role changes except buyer → supplier |
| `buyer_addresses` | — | full | — | full | |
| `wallet_transactions` | — | read | — | — | written by the database |
| `promo_event_claims` | — | read | — | — | written by the database |
| `audit_logs` | — | — | — | read | written by the database: status-change triggers, plus the admin action log on 17 tables (`20261120040000`, column names only) |
| `account_stores` | **read all** | read all; "manage own" policy exists but **only `select` is granted** | — | full | See R-3 |

### Catalogue

| Table | anon / buyer | owner | member | admin | Notes |
|---|---|---|---|---|---|
| `categories` | read active | — | — | full | |
| `stores` | read `status = 'active'` | — | — | full | |
| `home_banners` | read active | — | — | full | |
| `promo_events` | read all | — | — | — | |
| `products` | read `approved` and not hidden; base price columns not granted | read own; insert as `draft`; update/delete own `draft`/`rejected`/`approved` | same as owner, if role has products | full | Status changes are enforced by state-machine triggers (`20260916110000`) |
| `product_images` | read if the product is public | full on own products | same as owner, if role has products | full | |
| `product_variants` | read if the product is public; `price` not granted | full on own products | same as owner, if role has products | full | |
| `global_products`, `global_product_images` | read approved | — | — | full | |
| `store_products`, `store_product_variants`, `store_inventory` | read listed or available in active stores | — | — | full | |

### Supplier business

| Table | anon / buyer | owner | member | admin | Notes |
|---|---|---|---|---|---|
| `companies` | — (public fields come from the `storefront_suppliers` view) | read, update, delete own; insert as `draft` | read own company (any role) | full | |
| `company_members` | read own membership row | add/remove members; **update `role` column only** | read own row | — | Column grant: `update (role)` (`20261114050300`) |
| `coupons` | no table read once `20261120050000` is applied; exact (store, code) lookup through `lookup_active_coupons()` | full on own | full, if role `supplier` | full | R-2 |
| `store_customers` | — | full on own | full, if role `supplier` | full | |
| `storefront_events` | — | read own | read, if role `supplier` | full | analytics |

### Buying and orders

| Table | buyer (own) | owner | member | admin | Notes |
|---|---|---|---|---|---|
| `cart_items`, `cart_coupons` | full | — | — | full | |
| `saved_products` | read, insert, delete | — | — | full | |
| `recently_viewed` | full | — | — | full | |
| `order_checkout_requests` | read | — | — | — | checkout runs through an RPC |
| `orders` | read | read, update | orders roles: read, update (R-1, applied) | full | State changes go through triggers (`harden_order_and_event_writes`) |
| `order_items` | read | read | orders roles: read (R-1) | full | "Has this product been ordered?" goes through `ordered_product_ids()` |
| `order_events` | read | read | orders roles: read (R-1) | read | |
| `quotations`, `quotation_items` | read | read | orders roles: read (R-1) | read | |
| `notification_outbox` | read own or own order's | read their orders' | orders roles (R-1) | — | |

### Views (run as the database owner; each one filters its own rows)

None of the views use `security_invoker`, so each runs with the owner's rights and skips the RLS
of the tables underneath. Each one was checked on 2026-11-20 to filter its rows itself:

| View | Granted to | Filter |
|---|---|---|
| `storefront_prices` | anon, authenticated | approved and not hidden products; margin-adjusted prices only |
| `storefront_suppliers` | anon, authenticated | `kyb_status = 'verified'`; public fields only (name, city, state, logo) |
| `storefront_supplier_directory` | anon, authenticated | built on `storefront_suppliers` plus approved products |
| `supplier_featured_images` | anon, authenticated | verified suppliers' latest approved product images |
| `category_product_counts` | anon, authenticated | active categories, approved products only |
| `supplier_prices` | authenticated | rows where caller is owner, member, or admin |
| `order_supplier_contact` | authenticated | `orders.buyer_id = auth.uid()` |

**Rule:** a new view either filters by `auth.uid()` or public status, exposing only public
columns, or is created `with (security_invoker = true)`. Anything else leaks across users.

### Storage (`storage.objects`)

| Bucket | Public read | Write | Size and type limits |
|---|---|---|---|
| `product_images` | yes | upload to own folder `<uid>/…`; team members with product roles can also update and delete in their owner's folder | 10 MB, JPG/PNG/WebP (`20261120020000`, applied and confirmed live) |
| `company_logos` | yes | own folder | 2 MB, images (confirmed live) |
| `avatars` | yes | own folder | 2 MB, images (existing) |
| `banners`, `category_images` | yes | admin only | 5 MB, images (confirmed live) |
| `company_docs` | **no** (own folder plus admin) | own folder | 10 MB, PDF/images (confirmed live) |

## Team roles

The app's role table (`lib/supplier/permissions.ts`):

| Role | Can use |
|---|---|
| `supplier` | everything except owner-only pages |
| `staff` | products and orders |
| `product_manager` | products |
| `order_manager` | orders |

At the database level, migrations `20261114050000`–`050200` add a `role = any(...)` condition
to every staff policy that was written with `internal.is_company_staff(...)` or an inline
`company_members.user_id = auth.uid()` match:

| Area | Roles allowed |
|---|---|
| products, `product_images`, `product_variants`, storage | supplier, staff, product_manager |
| orders, `order_items` (the "staff all" policies) | supplier, staff, order_manager |
| everything else (coupons, customers, analytics) | supplier |

**Not covered (finding R-1):** order-side policies and functions written with
`internal.is_company_member(...)`. That helper lets the owner **or any member** through,
whatever their role, and those migrations never rewrote it. It's used by:
- `orders_supplier_select` and `orders_supplier_update`
- `order_items_supplier_select`
- `order_events_select_supplier`
- the quotation, payment-claim and notification functions

So a `product_manager` could read and update orders through the Data API, even though the app
hides orders from them. Migration `20261120030000` redefines the helper as "owner, or a member
with an orders role", which closed this when it was applied on 2026-11-20.

## Rules for new tables and policies

1. Enable RLS in the same migration that creates the table.
2. Grant only the commands the client needs. Leave columns that must stay private out of the
   grant.
3. Write one policy per command (`select`/`insert`/`update`/`delete`). Every `update` needs
   both `using` and `with check`.
4. Compare with `(select auth.uid())` (wrapped, so it is evaluated once) and index the column
   being compared.
5. Supplier-side access uses `internal.is_company_owner(x)` for owner-only operations,
   `internal.member_can_products(x)` / `member_can_orders(x)` / `member_can_all(x)` for team
   members, and `internal.is_admin()` for admins.
   `internal.is_company_member(x)` means order-side access (owner, or an orders role) and is
   only for order data.
6. Add a DB test next to `tests/*-db.test.ts`. It should show the owner can do the operation
   and that another user and anon can't.
7. Update this file in the same change.

## Findings

| ID | Finding | Proposed change | Status |
|---|---|---|---|
| R-1 | `internal.is_company_member` ignored team roles, so product managers could read and update orders, quotations and order notifications | Migration `20261120030000_company_member_order_roles.sql` redefines it as `is_company_owner(p) or member_can_orders(p)`. It also adds `public.ordered_product_ids(uuid[])`, so the product delete guard (`lib/supplier/product-actions.ts`) still knows a product has orders; it answers yes/no only, for products the caller can manage. Test: `tests/team-order-roles-db.test.ts` | **Applied** 2026-11-20; `ordered_product_ids` confirmed live. The app change can be deployed |
| R-2 | Any signed-in user can list every supplier's active coupon codes (`coupons_select_active`, deliberate for checkout validation) | Migration `20261120050000_coupon_lookup_rpc.sql`: `public.lookup_active_coupons(supplier_ids, codes)` returns only exact active (store, code) pairs, for signed-in users only; the broad policy is dropped. `lib/buyer/cart-actions.ts` and `lib/buyer/checkout-queries.ts` use it; the checkout RPC already reads coupons itself. Test: `tests/coupon-lookup-db.test.ts` | Code done 2026-11-20. **Migration not applied: deploy first, then `pnpm db:push`** |
| R-3 | `account_stores` is readable by anyone, revealing which accounts are linked to which stores | Restrict the read to `profile_id = auth.uid()` or admin, if nothing public needs it. The "manage own" policy is only safe because there is no insert/update grant, so never add one | Decision needed |
| R-4 | The final staff policy text exists only in the live database, not in the migrations | Dump `pg_policies` from the linked project and reconcile it with this file | To do |
