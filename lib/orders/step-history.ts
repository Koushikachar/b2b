// One-level undo / redo for supplier order changes, read from order_events.
// The database function order_step_history() applies the same rules; this
// module only decides which buttons are enabled and what they will do.

export type OrderStepField = "status" | "payment_status";

/** A change the button would make: set `field` from `from` to `to`. */
export type OrderStepChange = { field: OrderStepField; from: string; to: string };

type OrderEvent = {
  event: string;
  data: Record<string, unknown> | null;
  created_at: string;
};

const RELEVANT = new Set(["status_changed", "payment_status_changed", "step_undone", "step_redone"]);

/**
 * Changes only a customer can make. Decided by the kind of change, not by who
 * made it, so a supplier testing with their own buyer account can still undo.
 */
function isCustomerChange(field: OrderStepField, from: string, to: string): boolean {
  if (field === "payment_status") return to === "claimed";
  return from === "quoted" && to === "new";
}

/**
 * What "Undo" and "Redo" would do right now (null = not available).
 * `walletAmount`: a cancellation that refunded wallet credit can't be left
 * (order_step_history refuses it), so no button is offered for it.
 */
export function orderStepHistory(
  events: readonly OrderEvent[],
  walletAmount: number | string | null = 0,
): {
  undo: OrderStepChange | null;
  redo: OrderStepChange | null;
} {
  const result = stepHistory(events);
  const locked = (c: OrderStepChange | null) =>
    c && c.field === "status" && c.from === "cancelled" && Number(walletAmount ?? 0) > 0 ? null : c;
  return { undo: locked(result.undo), redo: locked(result.redo) };
}

function stepHistory(events: readonly OrderEvent[]): {
  undo: OrderStepChange | null;
  redo: OrderStepChange | null;
} {
  const last = [...events]
    .filter((e) => RELEVANT.has(e.event))
    .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at))
    .at(-1);
  if (!last) return { undo: null, redo: null };

  const data = last.data ?? {};
  const from = String(data.from ?? "");
  const to = String(data.to ?? "");

  if (last.event === "step_undone") {
    // Redo puts back the value the undo replaced.
    return { undo: null, redo: { field: data.field as OrderStepField, from: to, to: from } };
  }

  const field: OrderStepField =
    last.event === "step_redone"
      ? (data.field as OrderStepField)
      : last.event === "payment_status_changed"
        ? "payment_status"
        : "status";
  if (isCustomerChange(field, from, to)) return { undo: null, redo: null };
  return { undo: { field, from: to, to: from }, redo: null };
}
