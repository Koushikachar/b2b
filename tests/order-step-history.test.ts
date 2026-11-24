import { describe, expect, it } from "vitest";
import { orderStepHistory } from "../lib/orders/step-history";

let n = 0;
const ev = (event: string, data: Record<string, unknown>) => ({
  event,
  data,
  created_at: `2026-11-23T10:00:${String(n++).padStart(2, "0")}Z`,
});

describe("orderStepHistory on cancelled orders that used wallet credit", () => {
  // The database refuses to leave "cancelled" once the wallet credit was refunded.
  it("offers no undo of the cancellation when wallet credit was used", () => {
    const events = [ev("status_changed", { from: "new", to: "cancelled" })];
    expect(orderStepHistory(events, 100).undo).toBeNull();
  });

  it("still offers the undo when no wallet credit was used", () => {
    const events = [ev("status_changed", { from: "new", to: "cancelled" })];
    expect(orderStepHistory(events, 0).undo).toEqual({ field: "status", from: "cancelled", to: "new" });
  });
});

describe("orderStepHistory", () => {
  it("offers nothing on a fresh order", () => {
    expect(orderStepHistory([ev("order_created", {})])).toEqual({ undo: null, redo: null });
  });

  it("offers to undo the latest status change", () => {
    const events = [ev("order_created", {}), ev("status_changed", { from: "new", to: "confirmed" })];
    expect(orderStepHistory(events)).toEqual({
      undo: { field: "status", from: "confirmed", to: "new" },
      redo: null,
    });
  });

  it("offers to undo a payment confirmation", () => {
    const events = [ev("payment_status_changed", { from: "pending", to: "paid" })];
    expect(orderStepHistory(events).undo).toEqual({ field: "payment_status", from: "paid", to: "pending" });
  });

  it("works when the supplier is also the buyer on the order (own test orders)", () => {
    // No actor check: the kind of change decides, not who made it.
    const events = [ev("status_changed", { from: "confirmed", to: "processing" })];
    expect(orderStepHistory(events).undo).toEqual({ field: "status", from: "processing", to: "confirmed" });
  });

  it("after an undo, offers redo only", () => {
    const events = [
      ev("status_changed", { from: "processing", to: "shipped" }),
      ev("status_changed", { from: "shipped", to: "processing" }),
      ev("step_undone", { field: "status", from: "shipped", to: "processing" }),
    ];
    expect(orderStepHistory(events)).toEqual({
      undo: null,
      redo: { field: "status", from: "processing", to: "shipped" },
    });
  });

  it("after a redo, offers to undo it again", () => {
    const events = [
      ev("step_undone", { field: "status", from: "shipped", to: "processing" }),
      ev("status_changed", { from: "processing", to: "shipped" }),
      ev("step_redone", { field: "status", from: "processing", to: "shipped" }),
    ];
    expect(orderStepHistory(events).undo).toEqual({ field: "status", from: "shipped", to: "processing" });
  });

  it("never undoes a customer action: a payment claim", () => {
    const events = [ev("payment_status_changed", { from: "pending", to: "claimed" })];
    expect(orderStepHistory(events)).toEqual({ undo: null, redo: null });
  });

  it("never undoes a customer action: rejecting a quotation", () => {
    const events = [ev("status_changed", { from: "quoted", to: "new" })];
    expect(orderStepHistory(events)).toEqual({ undo: null, redo: null });
  });
});
