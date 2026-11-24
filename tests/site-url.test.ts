import { describe, expect, it } from "vitest"
import { resolveSiteUrl } from "@/lib/site"

describe("resolveSiteUrl (canonical links, sitemap and schema must never point at localhost in production)", () => {
  it("uses the configured URL, without a trailing slash", () => {
    expect(resolveSiteUrl("https://direct2hub.in/", "production")).toBe("https://direct2hub.in")
  })

  it("falls back to the real domain in production when the setting is missing", () => {
    expect(resolveSiteUrl(undefined, "production")).toBe("https://direct2hub.in")
  })

  it("ignores a localhost URL in production", () => {
    expect(resolveSiteUrl("http://localhost:3000", "production")).toBe("https://direct2hub.in")
  })

  it("keeps localhost during local development", () => {
    expect(resolveSiteUrl("http://localhost:3000", "development")).toBe("http://localhost:3000")
    expect(resolveSiteUrl(undefined, "development")).toBe("http://localhost:3000")
  })
})
