import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
const { adminMfaState, ADMIN_MFA_MAX_AGE_SECONDS } = await import("../lib/auth/admin-mfa");

const now = 1_800_000_000;

describe("adminMfaState (AUTH.md A-3/A-4)", () => {
  it("asks an admin with no authenticator to set one up", () => {
    expect(adminMfaState({ currentLevel: "aal1", nextLevel: "aal1", methods: [{ method: "otp", timestamp: now }], nowSeconds: now })).toBe("enroll");
  });

  it("asks for a code when an authenticator exists but this session hasn't used it", () => {
    expect(adminMfaState({ currentLevel: "aal1", nextLevel: "aal2", methods: [{ method: "otp", timestamp: now }], nowSeconds: now })).toBe("verify");
  });

  it("lets a session through that verified a code recently", () => {
    const methods = [{ method: "totp", timestamp: now - 60 }, { method: "otp", timestamp: now - 3600 }];
    expect(adminMfaState({ currentLevel: "aal2", nextLevel: "aal2", methods, nowSeconds: now })).toBe("ok");
  });

  it("asks again once the last code is older than 12 hours", () => {
    const methods = [{ method: "totp", timestamp: now - ADMIN_MFA_MAX_AGE_SECONDS - 1 }];
    expect(adminMfaState({ currentLevel: "aal2", nextLevel: "aal2", methods, nowSeconds: now })).toBe("verify");
  });

  it("does not trust an aal2 session with no MFA entry in its sign-in methods", () => {
    expect(adminMfaState({ currentLevel: "aal2", nextLevel: "aal2", methods: ["otp"], nowSeconds: now })).toBe("verify");
  });
});
