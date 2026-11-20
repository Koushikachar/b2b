import { describe, expect, it } from "vitest";
import { pickFreeSlug, slugify } from "../lib/admin/unique-slug";

describe("slugify", () => {
  it("keeps only a–z, 0–9 and single hyphens (no LIKE wildcards)", () => {
    expect(slugify("Kitchen & Dining!", "category")).toBe("kitchen-dining");
    expect(slugify("  50%_off__deals ", "category")).toBe("50-off-deals");
    expect(slugify("***", "store")).toBe("store");
  });
});

describe("pickFreeSlug (one query instead of up to 10)", () => {
  it("uses the base when free, then base-2 … base-10", () => {
    expect(pickFreeSlug("shoes", new Set())).toBe("shoes");
    expect(pickFreeSlug("shoes", new Set(["shoes"]))).toBe("shoes-2");
    expect(pickFreeSlug("shoes", new Set(["shoes", "shoes-2", "shoes-3"]))).toBe("shoes-4");
    // Unrelated slugs that merely start with the base don't block it.
    expect(pickFreeSlug("shoes", new Set(["shoes-rack", "shoes-2x"]))).toBe("shoes");
  });

  it("falls back to a timestamped slug when base … base-10 are all taken", () => {
    const taken = new Set(["shoes", ...Array.from({ length: 9 }, (_, i) => `shoes-${i + 2}`)]);
    expect(pickFreeSlug("shoes", taken)).toMatch(/^shoes-\d{13}$/);
  });
});
