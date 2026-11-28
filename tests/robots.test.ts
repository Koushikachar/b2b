import { describe, expect, it } from "vitest";
import robots from "../app/robots";
import nextConfig, { PRIVATE_PREFIXES } from "../next.config";

describe("search engines and private areas", () => {
  it("robots.txt does not block private areas (that would hide their noindex from Google)", () => {
    const rules = [robots().rules].flat();
    for (const rule of rules) expect(rule.disallow ?? []).toEqual([]);
  });

  it("every private area sends a noindex header", async () => {
    const headers = await nextConfig.headers!();
    for (const prefix of ["/account", "/cart", "/checkout", "/orders", "/auth", "/supplier", "/admin"]) {
      expect(PRIVATE_PREFIXES).toContain(prefix);
      for (const source of [prefix, `${prefix}/:path*`]) {
        const entry = headers.find((h) => h.source === source);
        expect(entry?.headers).toContainEqual({ key: "X-Robots-Tag", value: "noindex, nofollow" });
      }
    }
  });

  it("public pages are not marked noindex", async () => {
    const headers = await nextConfig.headers!();
    const noindexed = headers.filter((h) => h.headers.some((x) => x.key === "X-Robots-Tag")).map((h) => h.source);
    for (const path of ["/", "/products", "/categories", "/stores", "/collections/:path*", "/under/:path*"]) {
      expect(noindexed).not.toContain(path);
    }
  });
});

describe("stores that are not launched yet", () => {
  it("Select (coming soon) is kept out of search", async () => {
    const headers = await nextConfig.headers!();
    for (const source of ["/select", "/select/:path*"]) {
      expect(headers.find((h) => h.source === source)?.headers).toContainEqual({ key: "X-Robots-Tag", value: "noindex, nofollow" });
    }
  });
});
