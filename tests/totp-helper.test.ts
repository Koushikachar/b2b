import { describe, expect, it } from "vitest";
import { totpCode } from "./helpers/totp";

// RFC 6238 Appendix B test vectors (SHA-1 secret "12345678901234567890"),
// truncated to the 6 digits authenticator apps use.
const RFC_SECRET_BASE32 = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

describe("test TOTP helper", () => {
  it.each([
    [59, "287082"],
    [1111111109, "081804"],
    [1234567890, "005924"],
    [2000000000, "279037"],
  ])("matches RFC 6238 at t=%i", (seconds, expected) => {
    expect(totpCode(RFC_SECRET_BASE32, seconds * 1000)).toBe(expected);
  });
});
