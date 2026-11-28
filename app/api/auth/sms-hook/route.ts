import { isSmsEnabled, msg91OtpRequest, verifyHookSignature } from "@/lib/auth/sms";

/**
 * Supabase Auth "Send SMS" hook (Dashboard → Authentication → Hooks): Supabase
 * generates the code for phone sign-in / phone verification and POSTs it
 * here; we deliver it through MSG91. Only Supabase can call it: the request
 * must carry a valid Standard Webhooks signature made with
 * SEND_SMS_HOOK_SECRET. Supabase allows 5 s in total, so MSG91 gets 4 s.
 */
const json = (status: number, body: unknown, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...extra } });
const fail = (status: number, message: string) => json(status, { error: { http_code: status, message } });

type HookPayload = { user?: { phone?: string }; sms?: { otp?: string } };

export async function POST(request: Request) {
  if (!isSmsEnabled()) return fail(503, "SMS is not configured");

  const body = await request.text();
  const headers = Object.fromEntries(request.headers);
  if (!verifyHookSignature(body, headers, process.env.SEND_SMS_HOOK_SECRET!)) {
    return fail(401, "Invalid signature");
  }

  let payload: HookPayload;
  try {
    payload = JSON.parse(body);
  } catch {
    return fail(400, "Invalid payload");
  }
  const phone = payload.user?.phone ?? "";
  const otp = payload.sms?.otp ?? "";
  // Supabase stores phones without "+"; only Indian mobiles are allowed here.
  const e164 = `+${phone.replace(/\D/g, "")}`;
  if (!/^\+91[6-9]\d{9}$/.test(e164) || !/^\d{4,8}$/.test(otp)) return fail(400, "Unsupported phone number");

  const { url, init } = msg91OtpRequest(e164, otp, {
    authKey: process.env.MSG91_AUTH_KEY!,
    templateId: process.env.MSG91_OTP_TEMPLATE_ID!,
  });
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(4000) });
    const result = (await res.json().catch(() => ({}))) as { type?: string; message?: string };
    if (!res.ok || result.type === "error") {
      // Never log the code; the number is masked.
      console.error(JSON.stringify({ event: "sms.msg91_failed", status: res.status, message: result.message ?? null, to: `${e164.slice(0, 5)}*****${e164.slice(-2)}` }));
      return fail(503, "Could not send the SMS");
    }
    return json(200, {});
  } catch (error) {
    console.error(JSON.stringify({ event: "sms.msg91_unreachable", error: (error as Error).name }));
    // Retryable: Supabase retries 503 + retry-after within its time budget.
    return json(503, { error: { http_code: 503, message: "SMS provider unreachable" } }, { "retry-after": "true" });
  }
}
