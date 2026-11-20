import { describe, expect, it } from "vitest";
import { isStorefrontTabActive } from "../lib/nav";

describe("bottom nav active tab", () => {
  it("treats D2H Select as a store home page, not the stores list", () => {
    for (const path of ["/select", "/select/winning", "/select/under/9"]) {
      expect(isStorefrontTabActive("home", path), path).toBe(true);
      expect(isStorefrontTabActive("store", path), path).toBe(false);
    }
  });

  it("keeps Home on / and Store on the stores pages", () => {
    expect(isStorefrontTabActive("home", "/")).toBe(true);
    for (const path of ["/stores", "/stores/d2h-core", "/store/abc", "/events/diwali-2026"]) {
      expect(isStorefrontTabActive("store", path), path).toBe(true);
      expect(isStorefrontTabActive("home", path), path).toBe(false);
    }
  });
});
