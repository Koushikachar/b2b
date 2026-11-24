-- Undo/redo fix (2026-11-23): block customer-only changes by kind (payment
-- claim, quotation rejection) instead of by actor. The old actor check hid
-- undo whenever the supplier was also the order's buyer.

create or replace function public.order_step_history(p_order_id uuid, p_action text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_order public.orders%rowtype;
  v_last public.order_events%rowtype;
  v_field text;
  v_from text;   -- value the field has now
  v_to text;     -- value it will get
  v_current text;
begin
  if v_uid is null then
    raise exception 'You must be signed in' using errcode = '28000';
  end if;
  if p_action not in ('undo', 'redo') then
    raise exception 'Unknown action';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found or not internal.member_can_orders(v_order.supplier_id) then
    raise exception 'Order not found';
  end if;

  select * into v_last
  from public.order_events
  where order_id = p_order_id
    and event in ('status_changed', 'payment_status_changed', 'step_undone', 'step_redone')
  order by created_at desc, id desc
  limit 1;
  if not found then
    raise exception 'Nothing to %', p_action;
  end if;

  if p_action = 'redo' then
    if v_last.event <> 'step_undone' then
      raise exception 'Nothing to redo';
    end if;
    v_field := v_last.data->>'field';
    v_from := v_last.data->>'to';
    v_to := v_last.data->>'from';
  else
    if v_last.event = 'step_undone' then
      raise exception 'Nothing to undo';
    end if;
    v_field := case v_last.event
      when 'payment_status_changed' then 'payment_status'
      when 'status_changed' then 'status'
      else v_last.data->>'field'
    end;
    v_from := v_last.data->>'to';
    v_to := v_last.data->>'from';
    -- Customer-only changes (payment claim, quotation rejection) are decided by
    -- the kind of change, not by who made it: a supplier testing with their own
    -- buyer account must still be able to undo their supplier actions.
    if (v_field = 'payment_status' and v_from = 'claimed')
       or (v_field = 'status' and v_to = 'quoted' and v_from = 'new') then
      raise exception 'That change was made by the customer and can''t be undone';
    end if;
  end if;

  v_current := case v_field when 'status' then v_order.status else v_order.payment_status end;
  if v_field not in ('status', 'payment_status') or v_current is distinct from v_from or v_to is null then
    raise exception 'This order changed since; refresh and try again';
  end if;
  if v_field = 'status' and v_from = 'cancelled' and v_order.wallet_amount > 0 then
    raise exception 'This cancellation refunded wallet credit, so it can''t be undone';
  end if;

  perform set_config('app.order_step_history', 'on', true);
  if v_field = 'status' then
    update public.orders
    set status = v_to,
        -- Leaving a stage clears its timestamp; reaching one sets it.
        shipped_at = case when v_to = 'shipped' then coalesce(shipped_at, now())
                          when v_to in ('new', 'quoted', 'confirmed', 'processing') then null
                          else shipped_at end,
        delivered_at = case when v_to = 'delivered' then coalesce(delivered_at, now())
                            when v_to <> 'delivered' then null end,
        cancelled_at = case when v_to = 'cancelled' then coalesce(cancelled_at, now()) else null end,
        rejection_reason = case when v_to = 'cancelled'
                                then coalesce(rejection_reason, v_last.data->>'reason')
                                else null end
    where id = p_order_id;
  else
    update public.orders
    set payment_status = v_to,
        payment_confirmed_by = case when v_to = 'paid' then v_uid else null end,
        payment_confirmed_at = case when v_to = 'paid' then now() else null end
    where id = p_order_id;
  end if;
  perform set_config('app.order_step_history', 'off', true);

  -- clock_timestamp() sorts after the audit row written in this transaction.
  insert into public.order_events (order_id, event, actor_id, data, created_at)
  values (
    p_order_id,
    case p_action when 'undo' then 'step_undone' else 'step_redone' end,
    v_uid,
    jsonb_build_object('field', v_field, 'from', v_from, 'to', v_to, 'reason', v_order.rejection_reason),
    clock_timestamp()
  );

  return jsonb_build_object('field', v_field, 'from', v_from, 'to', v_to);
end;
$$;

revoke all on function public.order_step_history(uuid, text) from public, anon;
grant execute on function public.order_step_history(uuid, text) to authenticated;
