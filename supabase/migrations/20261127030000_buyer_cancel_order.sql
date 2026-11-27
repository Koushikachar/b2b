-- Buyers cancel their own order, with a reason, until it ships (owner request,
-- 2026-11-27; store policy: "cancelled free of charge before they are
-- shipped"). Mirrors canBuyerCancel in lib/orders/cancel.ts.
--
-- The order guard only lets the supplier change status, so this function
-- checks the buyer rules itself and then uses the guard's transaction-local
-- bypass (the same one order_step_history uses). The audit trigger still
-- records 'order_cancelled' with the reason, and the wallet trigger still
-- refunds any wallet credit.
create or replace function public.cancel_my_order(p_order_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_reason text := btrim(coalesce(p_reason, ''));
  v_rows integer;
begin
  if v_uid is null then
    raise exception 'Sign in to cancel an order' using errcode = '28000';
  end if;
  if char_length(v_reason) < 3 or char_length(v_reason) > 500 then
    raise exception 'Give a reason for cancelling' using errcode = '22023';
  end if;

  perform set_config('app.order_step_history', 'on', true);
  update public.orders
     set status = 'cancelled',
         rejection_reason = v_reason
   where id = p_order_id
     and buyer_id = v_uid
     and status in ('new', 'quoted', 'confirmed', 'processing');
  get diagnostics v_rows = row_count;
  perform set_config('app.order_step_history', 'off', true);

  if v_rows = 0 then
    raise exception 'This order can no longer be cancelled' using errcode = 'P0001';
  end if;
end;
$$;

revoke all on function public.cancel_my_order(uuid, text) from public, anon;
grant execute on function public.cancel_my_order(uuid, text) to authenticated;
