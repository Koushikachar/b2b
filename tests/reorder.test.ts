import { describe, expect, it } from "vitest";
import { canReorder, reorderLines } from "../lib/orders/reorder";

describe("order again", () => {
  it("is offered once an order is delivered or cancelled", () => {
    expect(canReorder("delivered")).toBe(true);
    expect(canReorder("cancelled")).toBe(true);
    expect(canReorder("new")).toBe(false);
    expect(canReorder("shipped")).toBe(false);
  });

  it("re-adds each product once, merging repeated lines, skipping deleted products", () => {
    expect(
      reorderLines([
        { product_id: "p1", variant_id: null, quantity: 10 },
        { product_id: "p1", variant_id: null, quantity: 5 },
        { product_id: "p1", variant_id: "v1", quantity: 2 },
        { product_id: null, variant_id: null, quantity: 3 },
      ]),
    ).toEqual([
      { productId: "p1", variantId: null, quantity: 15 },
      { productId: "p1", variantId: "v1", quantity: 2 },
    ]);
  });
});
