import { describe, expect, it } from "vitest";
import {
  BUYER_CANCEL_REASONS,
  buyerCancelReason,
  canBuyerCancel,
} from "../lib/orders/cancel";

describe("buyer order cancellation", () => {
  it("is allowed until the order ships", () => {
    expect(canBuyerCancel("new")).toBe(true);
    expect(canBuyerCancel("quoted")).toBe(true);
    expect(canBuyerCancel("confirmed")).toBe(true);
    expect(canBuyerCancel("processing")).toBe(true);
    expect(canBuyerCancel("shipped")).toBe(false);
    expect(canBuyerCancel("delivered")).toBe(false);
    expect(canBuyerCancel("cancelled")).toBe(false);
  });

  it("offers between 5 and 7 reasons, ending with Other", () => {
    expect(BUYER_CANCEL_REASONS.length).toBeGreaterThanOrEqual(5);
    expect(BUYER_CANCEL_REASONS.length).toBeLessThanOrEqual(7);
    expect(BUYER_CANCEL_REASONS.at(-1)).toBe("Other");
  });

  it("stores the chosen reason, with the buyer's words when given", () => {
    expect(buyerCancelReason("Ordered by mistake", "")).toEqual({ ok: true, reason: "Ordered by mistake" });
    expect(buyerCancelReason("Ordered by mistake", "  wrong colour ")).toEqual({
      ok: true,
      reason: "Ordered by mistake — wrong colour",
    });
    expect(buyerCancelReason("Other", "Shop closed for Diwali")).toEqual({ ok: true, reason: "Shop closed for Diwali" });
  });

  it("rejects an unknown reason, a blank Other, and very long text", () => {
    expect(buyerCancelReason("Hacked reason", "").ok).toBe(false);
    expect(buyerCancelReason("Other", "   ").ok).toBe(false);
    expect(buyerCancelReason("Ordered by mistake", "x".repeat(401)).ok).toBe(false);
  });
});
