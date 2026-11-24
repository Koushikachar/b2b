import { describe, expect, it } from "vitest";
import { orderSearchFilter, orderSearchTerm } from "../lib/orders/search";

describe("orderSearchTerm with a repeated ?q= (Next passes an array)", () => {
  it("uses the first value instead of crashing", () => {
    expect(orderSearchTerm(["D2H-100118", "ravi"])).toBe("100118");
    expect(orderSearchTerm([])).toBeNull();
  });
});

describe("orderSearchTerm", () => {
  it("finds an order by its number alone", () => {
    expect(orderSearchTerm("100118")).toBe("100118");
  });

  it("matches old B2B- and new D2H- numbers to the same order", () => {
    expect(orderSearchTerm("B2B-100118")).toBe("100118");
    expect(orderSearchTerm(" d2h-100118 ")).toBe("100118");
  });

  it("keeps a buyer name search", () => {
    expect(orderSearchTerm("Koushik A")).toBe("Koushik A");
  });

  it("strips characters that would change the PostgREST filter", () => {
    expect(orderSearchTerm("a,reference.eq.x)%_*")).toBe("areferenceeqx");
  });

  it("ignores empty and oversized input", () => {
    expect(orderSearchTerm("   ")).toBeNull();
    expect(orderSearchTerm(undefined)).toBeNull();
    expect(orderSearchTerm("x".repeat(200))).toHaveLength(60);
  });
});

describe("orderSearchFilter", () => {
  it("searches the order number and the buyer's name", () => {
    expect(orderSearchFilter("100118")).toBe(
      "reference.ilike.%100118%,delivery->>fullName.ilike.%100118%",
    );
  });
});
