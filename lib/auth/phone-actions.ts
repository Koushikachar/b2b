"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth/session";
import { getSafeNextPath } from "@/lib/auth/paths";
import { ensureProfile } from "@/lib/auth/profile";
import { isSmsEnabled, toIndianE164 } from "@/lib/auth/sms";
import type { AuthActionState } from "@/lib/auth/actions";

/**
 * Mobile OTP flows. Supabase creates and checks every code; the SMS itself
 * goes out through MSG91 (see app/api/auth/sms-hook). A confirmed number is
 * copied to the profile as verified by a database trigger, so nothing here
 * can mark a number verified on its own.
 */

const NOT_READY = "Mobile login isn't available yet. Use your email for now.";
const BAD_NUMBER = "Enter a valid 10-digit Indian mobile number.";
const tokenSchema = z.string().regex(/^\d{6}$/, "Enter the 6-digit code.");

function sendError(error: { code?: string; message: string }): string {
  if (error.code === "over_sms_send_rate_limit" || /rate limit|seconds/i.test(error.message)) {
    return "Please wait a minute before asking for another code.";
  }
  if (error.code === "phone_exists") return "That number is already used by another account.";
  return "Could not send the SMS. Try again in a moment.";
}

/** Login / sign-up with a mobile number: send the code. */
export async function requestPhoneLogin(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState | never> {
  if (!isSmsEnabled()) return { ok: false, message: NOT_READY };
  const phone = toIndianE164(String(formData.get("phone") ?? ""));
  if (!phone) return { ok: false, message: BAD_NUMBER };
  const next = getSafeNextPath(formData.get("next")?.toString());

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({ phone, options: { shouldCreateUser: true } });
  if (error) {
    console.error("requestPhoneLogin failed:", error.code, error.status);
    return { ok: false, message: sendError(error) };
  }
  redirect(`/auth/verify?${new URLSearchParams({ phone, next }).toString()}`);
}

/** Login / sign-up with a mobile number: check the code. */
export async function verifyPhoneLogin(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState | never> {
  const phone = toIndianE164(String(formData.get("phone") ?? ""));
  const token = tokenSchema.safeParse(formData.get("token"));
  if (!phone || !token.success) return { ok: false, message: "Enter the 6-digit code." };
  const next = getSafeNextPath(formData.get("next")?.toString());

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ phone, token: token.data, type: "sms" });
  if (error) {
    console.warn(JSON.stringify({ event: "auth.verify_sms_failed", phone: `${phone.slice(0, 5)}*****${phone.slice(-2)}`, code: error.code ?? null }));
    return { ok: false, message: "That code did not work. Check it and try again." };
  }
  await ensureProfile(supabase);
  redirect(next);
}

export type PhoneVerifyState = { ok: boolean; message: string };

/** Account → verify my number: send a code to the number on the profile. */
export async function sendPhoneVerification(rawPhone: string): Promise<PhoneVerifyState> {
  if (!isSmsEnabled()) return { ok: false, message: "SMS verification isn't available yet." };
  const phone = toIndianE164(rawPhone);
  if (!phone) return { ok: false, message: BAD_NUMBER };
  const supabase = await createClient();
  if (!(await getAuthUser(supabase))) return { ok: false, message: "Sign in again to continue." };

  const { error } = await supabase.auth.updateUser({ phone });
  if (error) {
    console.error("sendPhoneVerification failed:", error.code, error.status);
    return { ok: false, message: sendError(error) };
  }
  return { ok: true, message: `Code sent to ${phone.replace(/^\+91/, "+91 ")}.` };
}

/** Account → verify my number: check the code. Supabase confirms the number; a trigger marks the profile verified. */
export async function confirmPhoneVerification(rawPhone: string, rawToken: string): Promise<PhoneVerifyState> {
  const phone = toIndianE164(rawPhone);
  const token = tokenSchema.safeParse(rawToken);
  if (!phone || !token.success) return { ok: false, message: "Enter the 6-digit code." };
  const supabase = await createClient();
  if (!(await getAuthUser(supabase))) return { ok: false, message: "Sign in again to continue." };

  const { error } = await supabase.auth.verifyOtp({ phone, token: token.data, type: "phone_change" });
  if (error) return { ok: false, message: "That code did not work. Check it and try again." };
  revalidatePath("/account", "layout");
  return { ok: true, message: "Mobile number verified." };
}
