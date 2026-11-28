import { createHmac, timingSafeEqual } from "node:crypto";
import { isValidUserPhone, normalizeUserPhone } from "@/lib/user-phone";

/**
 * Mobile OTP via MSG91. Supabase generates and checks the codes (phone
 * sign-in and phone verification); its Send SMS hook calls our
 * /api/auth/sms-hook, which delivers the code through MSG91.
 *
 * Env (server only):
 *   MSG91_AUTH_KEY          MSG91 → Auth Key
 *   MSG91_OTP_TEMPLATE_ID   MSG91 OTP template id (DLT-approved)
 *   SEND_SMS_HOOK_SECRET    Supabase → Auth → Hooks → Send SMS secret (v1,whsec_…)
 */
export function isSmsEnabled(): boolean {
  return Boolean(process.env.MSG91_AUTH_KEY && process.env.MSG91_OTP_TEMPLATE_ID && process.env.SEND_SMS_HOOK_SECRET);
}

/** "+91XXXXXXXXXX" for a valid Indian mobile, else null. */
export function toIndianE164(raw: string): string | null {
  return isValidUserPhone(raw) ? `+91${normalizeUserPhone(raw)}` : null;
}

const MAX_AGE_SECONDS = 5 * 60;

/**
 * Standard Webhooks check for the Supabase hook: HMAC-SHA256 over
 * "id.timestamp.body" with the base64 secret after "v1,whsec_". Rejects
 * stale timestamps (replays) and compares in constant time.
 */
export function verifyHookSignature(
  body: string,
  headers: Record<string, string | null | undefined>,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): boolean {
  const id = headers["webhook-id"];
  const timestamp = headers["webhook-timestamp"];
  const signatures = headers["webhook-signature"];
  if (!id || !timestamp || !signatures || !secret) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(nowSeconds - ts) > MAX_AGE_SECONDS) return false;

  // Several secrets may be configured for rotation, separated by "|".
  const keys = secret
    .split("|")
    .map((s) => s.trim().replace(/^v1,whsec_/, ""))
    .filter(Boolean)
    .map((s) => Buffer.from(s, "base64"));
  const sent = signatures
    .split(" ")
    .map((s) => s.split(",")[1])
    .filter(Boolean)
    .map((s) => Buffer.from(s, "base64"));

  for (const key of keys) {
    const expected = createHmac("sha256", key).update(`${id}.${ts}.${body}`).digest();
    if (sent.some((s) => s.length === expected.length && timingSafeEqual(s, expected))) return true;
  }
  return false;
}

/**
 * MSG91 v5 OTP request delivering Supabase's code. The code goes both as
 * the `otp` param and as the template variable `OTP`, so either style of
 * MSG91 OTP template (##OTP## or a named variable) receives it. The auth
 * key stays in a header, never in the URL (URLs end up in logs).
 */
export function msg91OtpRequest(
  e164: string,
  otp: string,
  config: { authKey: string; templateId: string },
): { url: string; init: RequestInit } {
  const url = new URL("https://control.msg91.com/api/v5/otp");
  url.searchParams.set("template_id", config.templateId);
  url.searchParams.set("mobile", e164.replace(/^\+/, ""));
  url.searchParams.set("otp", otp);
  return {
    url: url.toString(),
    init: {
      method: "POST",
      headers: { authkey: config.authKey, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ OTP: otp }),
    },
  };
}
