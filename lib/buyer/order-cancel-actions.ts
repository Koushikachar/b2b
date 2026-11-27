"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";
import { buyerCancelReason } from "@/lib/orders/cancel";

export type CancelOrderResult = { ok: boolean; message: string };

/**
 * Buyer cancels their own order with a reason. cancel_my_order enforces who
 * and when (own order, not yet shipped); this only shapes the reason.
 */
export async function cancelMyOrder(
  _prev: CancelOrderResult,
  formData: FormData,
): Promise<CancelOrderResult> {
  const orderId = z.string().uuid().safeParse(formData.get("orderId"));
  if (!orderId.success) return { ok: false, message: "Invalid order." };

  const reason = buyerCancelReason(
    String(formData.get("reason") ?? ""),
    String(formData.get("details") ?? ""),
  );
  if (!reason.ok) return { ok: false, message: reason.message };

  const supabase = await createClient();
  const user = await getSessionUser(supabase);
  if (!user) return { ok: false, message: "Sign in to cancel this order." };

  const { error } = await supabase.rpc("cancel_my_order", {
    p_order_id: orderId.data,
    p_reason: reason.reason,
  });
  if (error) {
    console.error("cancel_my_order failed:", error.code);
    return {
      ok: false,
      message:
        error.code === "P0001"
          ? "This order can no longer be cancelled — it may have shipped. Message us on WhatsApp for help."
          : "Couldn't cancel the order. Try again.",
    };
  }

  revalidatePath(`/orders/${orderId.data}`);
  revalidatePath("/orders");
  revalidatePath("/supplier/dashboard/orders");
  revalidatePath(`/supplier/dashboard/orders/${orderId.data}`);
  return { ok: true, message: "Order cancelled." };
}
