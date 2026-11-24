-- Undo / redo for supplier order changes (owner request, 2026-11-23).
--
-- A supplier who taps the wrong action (accept, shipped, delivered, payment
-- received, cancel) can step back once, and step forward again. History comes
-- from order_events, which the audit trigger already writes for every change:
--   undo  reverses the latest supplier change (status or payment status)
--   redo  re-applies the step that was just undone
-- Rules:
--   * only members who can manage the company's orders
--     (internal.member_can_orders)
--   * never a change the buyer made
--   * the order must still be in the state the step left it in
--   * a cancellation can't be undone when wallet credit was refunded
--     (that would let the credit be spent twice)
-- The guard below is the current one (20261029000000) plus a transaction-local
-- bypass that only this function sets.
create or replace function internal.guard_order_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_supplier_side boolean;
begin
  -- Undo/redo (public.order_step_history) already checked the caller and the
  -- step; the flag is transaction-local and set only inside that function.
  if current_setting('app.order_step_history', true) = 'on' then
    return new;
  end if;

  -- Service role (seed/scripts) and admins bypass the guard.
  if v_uid is null or internal.is_admin() then
    return new;
  end if;

  -- Payment claim (claim_order_payment): order status unchanged, payment
  -- moves to 'claimed' with a reference, and nothing the supplier owns is
  -- touched. Checked before the supplier branch so a buyer who also belongs to
  -- the selling company can still claim. A buyer can never reach 'paid'.
  if new.buyer_id = v_uid
     and new.status is not distinct from old.status
     and old.payment_status in ('not_requested', 'pending')
     and new.payment_status = 'claimed'
     and new.payment_claim_reference is not null
     and new.payment_confirmed_by is not distinct from old.payment_confirmed_by
     and new.payment_confirmed_at is not distinct from old.payment_confirmed_at
     and new.subtotal is not distinct from old.subtotal
     and new.discount is not distinct from old.discount
     and new.item_count is not distinct from old.item_count
     and new.delivery is not distinct from old.delivery
     and new.buyer_note is not distinct from old.buyer_note
     and new.supplier_note is not distinct from old.supplier_note
     and new.reference is not distinct from old.reference
     and new.supplier_id is not distinct from old.supplier_id
     and new.created_at is not distinct from old.created_at
     and new.region is not distinct from old.region then
    return new;
  end if;

  v_supplier_side := internal.is_company_member(new.supplier_id);
  if not v_supplier_side then
    -- The only other buyer-side order write is the quote-rejection path
    -- performed by respond_to_quotation: status quoted -> new, nothing else
    -- touched, and only on their own order.
    if new.buyer_id = v_uid
       and old.status = 'quoted' and new.status = 'new'
       and new.payment_status is not distinct from old.payment_status
       and new.subtotal is not distinct from old.subtotal
       and new.delivery is not distinct from old.delivery
       and new.buyer_note is not distinct from old.buyer_note
       and new.supplier_note is not distinct from old.supplier_note then
      return new;
    end if;
    raise exception 'Only the supplier can update an order directly';
  end if;

  -- Immutable core: identity, ownership, money, delivery snapshot, buyer text.
  if new.id is distinct from old.id then
    raise exception 'id cannot be changed';
  end if;
  if new.supplier_id is distinct from old.supplier_id then
    raise exception 'supplier_id cannot be changed';
  end if;
  if new.buyer_id is distinct from old.buyer_id then
    raise exception 'buyer_id cannot be changed';
  end if;
  if new.reference is distinct from old.reference then
    raise exception 'reference cannot be changed';
  end if;
  if new.subtotal is distinct from old.subtotal then
    raise exception 'subtotal cannot be changed (revise via a quotation)';
  end if;
  if new.item_count is distinct from old.item_count then
    raise exception 'item_count cannot be changed';
  end if;
  if new.delivery is distinct from old.delivery then
    raise exception 'delivery snapshot cannot be changed';
  end if;
  if new.buyer_note is distinct from old.buyer_note then
    raise exception 'buyer_note cannot be changed';
  end if;
  if new.created_at is distinct from old.created_at then
    raise exception 'created_at cannot be changed';
  end if;
  if new.region is distinct from old.region then
    raise exception 'region cannot be changed';
  end if;

  -- Order status lifecycle.
  if new.status is distinct from old.status then
    if not exists (
      select 1 from (values
        ('new', 'quoted'),
        ('new', 'confirmed'),
        ('new', 'cancelled'),
        ('quoted', 'new'),
        ('quoted', 'confirmed'),
        ('quoted', 'cancelled'),
        ('confirmed', 'processing'),
        ('confirmed', 'cancelled'),
        ('processing', 'shipped'),
        ('processing', 'cancelled'),
        ('shipped', 'delivered')
      ) as t(from_status, to_status)
      where t.from_status = old.status and t.to_status = new.status
    ) then
      raise exception 'Order status cannot move from % to %', old.status, new.status;
    end if;

    -- Stage timestamps are recorded here so every writer gets them right.
    if new.status = 'shipped' and new.shipped_at is null then
      new.shipped_at := now();
    end if;
    if new.status = 'delivered' and new.delivered_at is null then
      new.delivered_at := now();
    end if;
    if new.status = 'cancelled' and new.cancelled_at is null then
      new.cancelled_at := now();
    end if;
  end if;

  -- Payment status is separate from order status and supplier-controlled.
  -- `claimed` is reached by the buyer RPC above; from there the supplier either
  -- confirms receipt ('paid') or reports the money did not arrive ('pending').
  if new.payment_status is distinct from old.payment_status then
    if not exists (
      select 1 from (values
        ('not_requested', 'pending'),
        ('not_requested', 'paid'),
        ('pending', 'paid'),
        ('claimed', 'paid'),
        ('claimed', 'pending')
      ) as t(from_status, to_status)
      where t.from_status = old.payment_status and t.to_status = new.payment_status
    ) then
      raise exception 'Payment status cannot move from % to %', old.payment_status, new.payment_status;
    end if;

    if new.payment_status = 'paid' then
      -- Record who confirmed receipt and when. Never derived from a buyer
      -- action; only a supplier-side actor reaches this branch. The buyer's
      -- claim reference is kept as history.
      new.payment_confirmed_by := v_uid;
      new.payment_confirmed_at := now();
    elsif new.payment_status = 'claimed' then
      new.payment_confirmed_by := null;
      new.payment_confirmed_at := null;
      if new.payment_claimed_at is null then
        new.payment_claimed_at := now();
      end if;
    else
      new.payment_confirmed_by := null;
      new.payment_confirmed_at := null;
      -- Back to 'pending' means the supplier did not receive the claim's
      -- money; clear the stale claim so the buyer can submit again.
      if new.payment_status = 'pending' then
        new.payment_claim_reference := null;
        new.payment_claimed_at := null;
      end if;
    end if;
  end if;

  return new;
end;
$$;

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
    if v_last.actor_id = v_order.buyer_id then
      raise exception 'That change was made by the customer and can''t be undone';
    end if;
    v_field := case v_last.event
      when 'payment_status_changed' then 'payment_status'
      when 'status_changed' then 'status'
      else v_last.data->>'field'
    end;
    v_from := v_last.data->>'to';
    v_to := v_last.data->>'from';
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
