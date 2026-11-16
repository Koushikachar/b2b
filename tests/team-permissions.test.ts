import { describe, expect, it } from "vitest";
import { areaAccess, canAccess, homeFor, isMemberRole } from "../lib/supplier/permissions";

describe("team roles", () => {
  it("owner and supplier can open everything", () => {
    expect(areaAccess("owner")).toEqual({ products: true, orders: true, all: true });
    expect(areaAccess("supplier")).toEqual({ products: true, orders: true, all: true });
  });

  it("staff: products and orders only", () => {
    expect(areaAccess("staff")).toEqual({ products: true, orders: true, all: false });
  });

  it("product manager: products only; order manager: orders only", () => {
    expect(areaAccess("product_manager")).toEqual({ products: true, orders: false, all: false });
    expect(areaAccess("order_manager")).toEqual({ products: false, orders: true, all: false });
  });

  it("sends each role to a section it can open", () => {
    expect(homeFor("owner")).toBe("/supplier/dashboard");
    expect(homeFor("staff")).toBe("/supplier/dashboard/orders");
    expect(homeFor("product_manager")).toBe("/supplier/dashboard/products");
    expect(homeFor("order_manager")).toBe("/supplier/dashboard/orders");
    for (const role of ["staff", "product_manager", "order_manager"] as const) {
      const home = homeFor(role);
      const area = home.endsWith("/products") ? "products" : home.endsWith("/orders") ? "orders" : "all";
      expect(canAccess(role, area)).toBe(true);
    }
  });

  it("rejects unknown roles", () => {
    expect(isMemberRole("admin")).toBe(false);
    expect(isMemberRole("order_manager")).toBe(true);
  });
});
