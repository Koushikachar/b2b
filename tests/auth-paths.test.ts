import { describe, expect, it } from "vitest";
import { getSafeNextPath } from "../lib/auth/paths";

describe("getSafeNextPath (post-login redirect, AUTH.md A-1)", () => {
  it("keeps same-site paths with their query and hash", () => {
    expect(getSafeNextPath("/account")).toBe("/account");
    expect(getSafeNextPath("/supplier/dashboard?tab=orders#top")).toBe("/supplier/dashboard?tab=orders#top");
  });

  it("falls back to / for empty or relative values", () => {
    expect(getSafeNextPath(null)).toBe("/");
    expect(getSafeNextPath(undefined)).toBe("/");
    expect(getSafeNextPath("")).toBe("/");
    expect(getSafeNextPath("account")).toBe("/");
  });

  it("rejects anything a browser would send to another site", () => {
    for (const evil of [
      "//evil.example",
      "/\\evil.example",
      "/\\/evil.example",
      "https://evil.example",
      "/\tevil.example",
      "/%0a/evil.example",
    ]) {
      const safe = getSafeNextPath(evil);
      expect(safe.startsWith("/"), evil).toBe(true);
      expect(safe.startsWith("//"), evil).toBe(false);
      expect(safe.includes("\\"), evil).toBe(false);
      expect(new URL(safe, "https://shop.example").origin, evil).toBe("https://shop.example");
    }
  });
});
