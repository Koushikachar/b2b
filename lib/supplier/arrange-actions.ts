"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth/session";
import { refreshCatalogue } from "@/lib/supplier/catalogue-cache";

export type ArrangeResult = { ok: boolean; message: string };

const idsSchema = z.array(z.string().uuid()).min(1).max(500);

/**
 * Save the order of a supplier's Winning or Hot Selling products. The RPC runs
 * as the caller, so only their own products can be ranked.
 */
export async function saveShowcaseOrder(flag: "winning" | "hot_selling", ids: string[]): Promise<ArrangeResult> {
  if (flag !== "winning" && flag !== "hot_selling") return { ok: false, message: "Unknown list." };
  const parsed = idsSchema.safeParse(ids);
  if (!parsed.success) return { ok: false, message: "Nothing to save." };

  const supabase = await createClient();
  if (!(await getAuthUser(supabase))) return { ok: false, message: "Sign in again to continue." };

  const { error } = await supabase.rpc("set_showcase_order", { p_flag: flag, p_ids: parsed.data });
  if (error) {
    console.error("set_showcase_order failed:", error.code);
    return { ok: false, message: "Couldn't save the order. Try again." };
  }
  refreshCatalogue();
  return { ok: true, message: "Order saved. The home page shows it now." };
}

/** Save the site-wide category order (admins and the Core store only; the RPC checks). */
export async function saveCategoryOrder(ids: string[]): Promise<ArrangeResult> {
  const parsed = idsSchema.safeParse(ids);
  if (!parsed.success) return { ok: false, message: "Nothing to save." };

  const supabase = await createClient();
  if (!(await getAuthUser(supabase))) return { ok: false, message: "Sign in again to continue." };

  const { error } = await supabase.rpc("set_category_order", { p_ids: parsed.data });
  if (error) {
    console.error("set_category_order failed:", error.code);
    return {
      ok: false,
      message: error.code === "42501" ? "Only the Core store can arrange categories." : "Couldn't save the order. Try again.",
    };
  }
  refreshCatalogue();
  updateTag("nav");
  return { ok: true, message: "Category order saved." };
}
