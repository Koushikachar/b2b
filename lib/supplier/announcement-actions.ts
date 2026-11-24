"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth/session";
import { getSupplierContext } from "@/lib/auth/guard";
import { canAccess } from "@/lib/supplier/permissions";
import { announcementSchema } from "@/lib/supplier/announcement-schema";

export type AnnouncementState = { ok: boolean; message: string };

/**
 * Post a notice to buyers' Notifications. The company comes from the caller's
 * session, never the browser; RLS re-checks products access on insert.
 */
export async function postAnnouncement(
  _prev: AnnouncementState,
  formData: FormData,
): Promise<AnnouncementState> {
  const parsed = announcementSchema.safeParse({
    title: formData.get("title"),
    message: formData.get("message"),
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the notice." };
  }

  const supabase = await createClient();
  const user = await getAuthUser(supabase);
  if (!user) return { ok: false, message: "You must be signed in." };
  const ctx = await getSupplierContext(supabase, user.id);
  if (!ctx || !canAccess(ctx.role, "products")) {
    return { ok: false, message: "You can't post notices for this business." };
  }

  const { error } = await supabase.from("announcements").insert({
    supplier_id: ctx.companyId,
    title: parsed.data.title,
    message: parsed.data.message,
    created_by: user.id,
  });
  if (error) {
    console.error("postAnnouncement failed:", error.code);
    return { ok: false, message: "Could not send the notice. Try again." };
  }
  revalidatePath("/account/notifications");
  return { ok: true, message: "Sent. Buyers see it in their notifications." };
}
