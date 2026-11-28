import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { msg91OtpRequest, toIndianE164, verifyHookSignature } from "../lib/auth/sms";

const RAW_SECRET = Buffer.from("super-secret-key-for-tests-1234567890").toString("base64");
const SECRET = `v1,whsec_${RAW_SECRET}`;
const sign = (id: string, ts: number, body: string, secret = RAW_SECRET) =>
  `v1,${createHmac("sha256", Buffer.from(secret, "base64")).update(`${id}.${ts}.${body}`).digest("base64")}`;

describe("verifyHookSignature (Supabase Send SMS hook)", () => {
  const body = JSON.stringify({ user: { phone: "919876543210" }, sms: { otp: "123456" } });
  const now = 1_800_000_000;

  it("accepts a correctly signed, fresh request", () => {
    const headers = { "webhook-id": "msg_1", "webhook-timestamp": String(now), "webhook-signature": sign("msg_1", now, body) };
    expect(verifyHookSignature(body, headers, SECRET, now)).toBe(true);
  });

  it("rejects a wrong signature, a tampered body, or a missing header", () => {
    const good = { "webhook-id": "msg_1", "webhook-timestamp": String(now), "webhook-signature": sign("msg_1", now, body) };
    expect(verifyHookSignature(body, { ...good, "webhook-signature": "v1,AAAA" }, SECRET, now)).toBe(false);
    expect(verifyHookSignature(body.replace("123456", "999999"), good, SECRET, now)).toBe(false);
    expect(verifyHookSignature(body, { ...good, "webhook-id": "" }, SECRET, now)).toBe(false);
    expect(verifyHookSignature(body, good, "", now)).toBe(false);
  });

  it("rejects replays older than 5 minutes", () => {
    const old = now - 301;
    const headers = { "webhook-id": "msg_1", "webhook-timestamp": String(old), "webhook-signature": sign("msg_1", old, body) };
    expect(verifyHookSignature(body, headers, SECRET, now)).toBe(false);
  });

  it("accepts any one of several signatures (secret rotation)", () => {
    const headers = { "webhook-id": "m", "webhook-timestamp": String(now), "webhook-signature": `v1,bad ${sign("m", now, body)}` };
    expect(verifyHookSignature(body, headers, SECRET, now)).toBe(true);
  });
});

describe("toIndianE164", () => {
  it("formats Indian mobiles as +91 and rejects anything else", () => {
    expect(toIndianE164("98765 43210")).toBe("+919876543210");
    expect(toIndianE164("+91 98765-43210")).toBe("+919876543210");
    expect(toIndianE164("09876543210")).toBe("+919876543210");
    expect(toIndianE164("12345")).toBeNull();
    expect(toIndianE164("5876543210")).toBeNull();
  });
});

describe("msg91OtpRequest", () => {
  it("sends Supabase's code to MSG91 without the + and with the auth key in a header", () => {
    const { url, init } = msg91OtpRequest("+919876543210", "123456", { authKey: "KEY", templateId: "TPL" });
    const u = new URL(url);
    expect(u.origin + u.pathname).toBe("https://control.msg91.com/api/v5/otp");
    expect(u.searchParams.get("template_id")).toBe("TPL");
    expect(u.searchParams.get("mobile")).toBe("919876543210");
    expect(u.searchParams.get("otp")).toBe("123456");
    expect(u.searchParams.has("authkey")).toBe(false);
    expect((init.headers as Record<string, string>).authkey).toBe("KEY");
    expect(JSON.parse(String(init.body))).toEqual({ OTP: "123456" });
  });
});
