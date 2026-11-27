"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth/session";
import { isBusinessType } from "@/lib/buyer/business-type";

export type BusinessTypeResult = { ok: boolean; message: string };

/** Save the one-time "what describes you best" answer on the buyer's own profile. */
export async function saveBusinessType(
  _prev: BusinessTypeResult,
  formData: FormData,
): Promise<BusinessTypeResult> {
  const value = formData.get("business_type");
  if (!isBusinessType(value)) return { ok: false, message: "Choose the option that fits you best." };

  const supabase = await createClient();
  const user = await getAuthUser(supabase);
  if (!user) return { ok: false, message: "Sign in again to continue." };

  const { error } = await supabase
    .from("profiles")
    .update({ business_type: value })
    .eq("id", user.id);
  if (error) {
    console.error("saveBusinessType failed:", error.code);
    return { ok: false, message: "Couldn't save that. Try again." };
  }
  revalidatePath("/", "layout");
  return { ok: true, message: "" };
}
