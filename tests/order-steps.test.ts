import { describe, expect, it } from "vitest";
import { orderSteps } from "../lib/orders/order-steps";

const labels = (steps: ReturnType<typeof orderSteps>) => steps.map((s) => `${s.label}:${s.state}`);

describe("orderSteps", () => {
  it("starts under review right after the order is placed", () => {
    expect(labels(orderSteps("new", false))).toEqual([
      "Order placed:done",
      "Order under review:current",
      "Payment awaiting:upcoming",
      "Awaiting shipment:upcoming",
      "Delivery:upcoming",
    ]);
  });

  it("marks the order reviewed once the supplier accepts it, then waits for payment", () => {
    expect(labels(orderSteps("confirmed", false))).toEqual([
      "Order placed:done",
      "Order reviewed:done",
      "Payment awaiting:current",
      "Awaiting shipment:upcoming",
      "Delivery:upcoming",
    ]);
  });

  it("shows payment done once the supplier confirms the money arrived", () => {
    expect(labels(orderSteps("processing", true)).slice(2)).toEqual([
      "Payment done:done",
      "Awaiting shipment:current",
      "Delivery:upcoming",
    ]);
  });

  it("finishes at delivered", () => {
    expect(labels(orderSteps("delivered", true)).slice(3)).toEqual(["Shipped:done", "Delivered:done"]);
  });

  it("stops at cancelled when the supplier rejects the order", () => {
    expect(labels(orderSteps("cancelled", false))).toEqual(["Order placed:done", "Order cancelled:failed"]);
  });

  it("treats an old quoted order as still under review", () => {
    expect(orderSteps("quoted", false)[1].label).toBe("Order under review");
  });
});
