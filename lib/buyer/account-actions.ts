"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth/session";
import { buildAuthCallbackUrl } from "@/lib/auth/origin";
import { sniffImageType } from "@/lib/storage";
import { isValidUserPhone, normalizeUserPhone } from "@/lib/user-phone";
import { isBusinessType } from "@/lib/buyer/business-type";

export type AccountFormState = {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
};

const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const AVATAR_EXT = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as const;

function firstErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}

function revalidateAccount(...paths: string[]) {
  revalidatePath("/account");
  for (const path of paths) revalidatePath(path);
}

// ---------------------------------------------------------------------------
// Profile: name, mobile, photo
// ---------------------------------------------------------------------------

const profileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Enter your name.")
    .max(80, "Keep your name under 80 characters."),
  phone: z
    .string()
    .trim()
    .refine((v) => v === "" || isValidUserPhone(v), "Enter a valid 10-digit Indian mobile number."),
  // "What describes you best" (also asked once after login); blank = unchanged.
  businessType: z
    .string()
    .refine((v) => v === "" || isBusinessType(v), "Choose an option from the list."),
});

export async function updateProfile(
  _prev: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const parsed = profileSchema.safeParse({
    fullName: formData.get("fullName") ?? "",
    phone: formData.get("phone") ?? "",
    businessType: formData.get("businessType") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, message: "Check the highlighted fields.", fieldErrors: firstErrors(parsed.error) };
  }

  const supabase = await createClient();
  const user = await getAuthUser(supabase);
  if (!user) return { ok: false, message: "Your session expired. Sign in again." };

  const { data: current } = await supabase
    .from("profiles")
    .select("avatar_path")
    .eq("id", user.id)
    .maybeSingle();
  const previousAvatar = (current?.avatar_path as string | null) ?? null;

  let avatarPath: string | null | undefined;
  const removeAvatar = formData.get("removeAvatar") === "true";
  const avatar = formData.get("avatar");

  if (avatar instanceof File && avatar.size > 0) {
    if (avatar.size > AVATAR_MAX_BYTES) {
      return { ok: false, message: "Photo must be 2 MB or smaller.", fieldErrors: { avatar: "Photo must be 2 MB or smaller." } };
    }
    // file.type is client-supplied: sniff the bytes instead.
    const type = await sniffImageType(avatar);
    if (type !== "image/jpeg" && type !== "image/png" && type !== "image/webp") {
      return { ok: false, message: "Use a JPG, PNG or WebP photo.", fieldErrors: { avatar: "Use a JPG, PNG or WebP photo." } };
    }
    const path = `${user.id}/${Date.now()}.${AVATAR_EXT[type]}`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, avatar, { contentType: type, upsert: false, cacheControl: "31536000" });
    if (uploadError) {
      console.error("updateProfile avatar upload failed:", uploadError.message);
      return { ok: false, message: "Could not upload your photo. Please try again." };
    }
    avatarPath = path;
  } else if (removeAvatar) {
    avatarPath = null;
  }

  const phone = parsed.data.phone ? normalizeUserPhone(parsed.data.phone) : null;
  const update: Record<string, unknown> = { full_name: parsed.data.fullName, phone };
  if (avatarPath !== undefined) update.avatar_path = avatarPath;
  if (parsed.data.businessType) update.business_type = parsed.data.businessType;

  const { error } = await supabase.from("profiles").update(update).eq("id", user.id);
  if (error) {
    console.error("updateProfile failed:", error.code, error.message);
    return { ok: false, message: "Could not save your profile. Please try again." };
  }

  if (avatarPath !== undefined && previousAvatar && previousAvatar !== avatarPath) {
    await supabase.storage.from("avatars").remove([previousAvatar]);
  }

  revalidateAccount("/account/profile");
  return { ok: true, message: "Profile saved." };
}

// ---------------------------------------------------------------------------
// Email change — Supabase sends a confirmation link to the new address and
// only switches the login email once it is clicked.
// ---------------------------------------------------------------------------

const emailSchema = z.object({ email: z.email("Enter a valid email address.") });

export async function requestEmailChange(
  _prev: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const parsed = emailSchema.safeParse({ email: String(formData.get("email") ?? "").trim() });
  if (!parsed.success) {
    return { ok: false, message: "Enter a valid email address.", fieldErrors: firstErrors(parsed.error) };
  }

  const supabase = await createClient();
  const user = await getAuthUser(supabase);
  if (!user) return { ok: false, message: "Your session expired. Sign in again." };
  if (parsed.data.email.toLowerCase() === user.email.toLowerCase()) {
    return { ok: false, message: "That is already your email address." };
  }

  const emailRedirectTo = buildAuthCallbackUrl(await headers(), "/account/profile") ?? undefined;
  const { error } = await supabase.auth.updateUser(
    { email: parsed.data.email },
    { emailRedirectTo },
  );
  if (error) {
    console.error("requestEmailChange failed:", error.code, error.message);
    return {
      ok: false,
      message:
        error.code === "email_exists"
          ? "Another account already uses that email."
          : "Could not start the email change. Please try again later.",
    };
  }

  return {
    ok: true,
    message: `We sent a confirmation link to ${parsed.data.email}. Your email changes once you open it.`,
  };
}

// ---------------------------------------------------------------------------
// GST details
// ---------------------------------------------------------------------------

const GSTIN_RE = /^(0[1-9]|[1-3][0-9])[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

const gstSchema = z.object({
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .regex(GSTIN_RE, "Enter a valid 15-character GSTIN, e.g. 24ABCDE1234F1Z5."),
  businessName: z.string().trim().min(2, "Enter the registered business name.").max(120),
  address: z.string().trim().min(10, "Enter the full registered billing address.").max(300),
});

export async function saveGstDetails(
  _prev: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  if (formData.get("intent") === "remove") {
    const supabase = await createClient();
    const user = await getAuthUser(supabase);
    if (!user) return { ok: false, message: "Your session expired. Sign in again." };
    const { error } = await supabase
      .from("profiles")
      .update({ gstin: null, gst_business_name: null, gst_address: null })
      .eq("id", user.id);
    if (error) return { ok: false, message: "Could not remove GST details." };
    revalidateAccount("/account/gst");
    return { ok: true, message: "GST details removed." };
  }

  const parsed = gstSchema.safeParse({
    gstin: formData.get("gstin") ?? "",
    businessName: formData.get("businessName") ?? "",
    address: formData.get("address") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, message: "Check the highlighted fields.", fieldErrors: firstErrors(parsed.error) };
  }

  const supabase = await createClient();
  const user = await getAuthUser(supabase);
  if (!user) return { ok: false, message: "Your session expired. Sign in again." };

  const { error } = await supabase
    .from("profiles")
    .update({
      gstin: parsed.data.gstin,
      gst_business_name: parsed.data.businessName,
      gst_address: parsed.data.address,
      // Having a GSTIN replaces an earlier "I don't have a GST number".
      no_gstin: false,
    })
    .eq("id", user.id);
  if (error) {
    console.error("saveGstDetails failed:", error.code, error.message);
    return { ok: false, message: "Could not save GST details. Please try again." };
  }

  revalidateAccount("/account/gst");
  return { ok: true, message: "GST details saved. They will be used on your invoices." };
}

/**
 * "I don't have a GST number": stop asking at checkout. Orders and invoices
 * then go out without a buyer GSTIN; adding one later clears this.
 */
export async function declareNoGstin(): Promise<AccountFormState> {
  const supabase = await createClient();
  const user = await getAuthUser(supabase);
  if (!user) return { ok: false, message: "Your session expired. Sign in again." };
  const { error } = await supabase.from("profiles").update({ no_gstin: true }).eq("id", user.id);
  if (error) {
    console.error("declareNoGstin failed:", error.code);
    return { ok: false, message: "Could not save that. Please try again." };
  }
  revalidateAccount("/account/gst");
  revalidatePath("/checkout");
  return { ok: true, message: "Noted: no GST number. You can add one any time." };
}

// ---------------------------------------------------------------------------
// Privacy
// ---------------------------------------------------------------------------

export async function setMarketingOptIn(optIn: boolean): Promise<AccountFormState> {
  const supabase = await createClient();
  const user = await getAuthUser(supabase);
  if (!user) return { ok: false, message: "Your session expired. Sign in again." };
  const { error } = await supabase
    .from("profiles")
    .update({ marketing_opt_in: optIn })
    .eq("id", user.id);
  if (error) return { ok: false, message: "Could not update your preference." };
  revalidatePath("/account/privacy");
  return { ok: true, message: optIn ? "You'll receive offers and event updates." : "Offer messages turned off." };
}
