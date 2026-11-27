-- Fix for 20261127030000: the guard bypass also skips the guard's own
-- cancelled_at stamp, so cancel_my_order sets it itself.
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
         rejection_reason = v_reason,
         cancelled_at = now()
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
