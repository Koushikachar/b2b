-- Order numbers continue straight after the latest real order (2026-11-27).
-- Test orders created and deleted on this database had used up numbers
-- (a sequence never re-issues one), which left gaps. Point the sequence at
-- the highest number actually in use, so the next order is max + 1. Existing
-- orders keep their numbers.
select setval(
  'public.order_reference_seq',
  greatest(
    (select coalesce(max(substring(reference from '([0-9]+)$')::bigint), 0) from public.orders),
    1
  )
);
