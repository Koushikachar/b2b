import { describe, expect, it } from "vitest";
import { BUY_AGAIN_LIMIT, frequentProductIds } from "../lib/buyer/buy-again";

describe("frequentProductIds (Frequently bought)", () => {
  it("is empty for an account with no orders", () => {
    expect(frequentProductIds([])).toEqual([]);
  });

  it("puts the most often ordered products first and lists each once", () => {
    const items = [
      { product_id: "p1" },
      { product_id: "p2" },
      { product_id: "p2" },
      { product_id: "p3" },
      { product_id: "p2" },
      { product_id: "p3" },
    ];
    expect(frequentProductIds(items)).toEqual(["p2", "p3", "p1"]);
  });

  it("breaks ties by the most recent order (input is newest first)", () => {
    const items = [{ product_id: "p3" }, { product_id: "p1" }, { product_id: "p3" }, { product_id: "p1" }];
    expect(frequentProductIds(items)).toEqual(["p3", "p1"]);
  });

  it("skips deleted products and stops at the limit", () => {
    const items = [{ product_id: null }, ...Array.from({ length: 20 }, (_, i) => ({ product_id: `p${i}` }))];
    const ids = frequentProductIds(items);
    expect(ids).toHaveLength(BUY_AGAIN_LIMIT);
    expect(ids[0]).toBe("p0");
  });
});
