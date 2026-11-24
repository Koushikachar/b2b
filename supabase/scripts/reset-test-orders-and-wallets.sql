-- ONE-OFF RESET (owner request, 2026-11-23). NOT a migration: run it once,
-- deliberately, in the Supabase SQL editor (or psql) for the project you mean.
--
-- Deletes every order (with its items, quotations, events and notification
-- rows) and every wallet transaction, so all wallet balances return to Rs 0.
-- Each account then receives the Rs 100 signup bonus again the next time it
-- signs in (claim_signup_bonus). This cannot be undone: take a backup first.

begin;

-- Order children first, in case any foreign key lacks ON DELETE CASCADE.
delete from public.notification_outbox;
delete from public.order_events;
delete from public.quotation_items;
delete from public.quotations;
delete from public.order_items;
delete from public.order_checkout_requests;
delete from public.orders;

-- Wallet ledger (promo claims point at wallet rows).
delete from public.promo_event_claims;
delete from public.wallet_transactions;

commit;
