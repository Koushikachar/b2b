"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";
import { addToCart, getCartCount } from "@/lib/buyer/cart-actions";
import { parseOrderStatus } from "@/lib/orders/lifecycle";
import { canReorder, reorderLines } from "@/lib/orders/reorder";

export type ReorderResult = { ok: boolean; message: string; added: number; skipped: number; cartCount?: number };

/**
 * Put a finished order's products back in the cart. Each line goes through
 * addToCart, so availability, stock, variant and MOQ rules all still apply;
 * lines that no longer qualify are skipped and counted.
 */
export async function reorderOrder(orderId: string): Promise<ReorderResult> {
  const fail = (message: string): ReorderResult => ({ ok: false, message, added: 0, skipped: 0 });
  if (!z.string().uuid().safeParse(orderId).success) return fail("Invalid order.");

  const supabase = await createClient();
  const user = await getSessionUser(supabase);
  if (!user) return fail("Sign in to order again.");

  // RLS limits orders to their buyer; the filter keeps intent explicit.
  const { data: order } = await supabase
    .from("orders")
    .select("id, status")
    .eq("id", orderId)
    .eq("buyer_id", user.id)
    .maybeSingle();
  const status = parseOrderStatus((order?.status as string) ?? "");
  if (!order || !status) return fail("Order not found.");
  if (!canReorder(status)) return fail("You can order again once this order is delivered or cancelled.");

  const { data: items } = await supabase
    .from("order_items")
    .select("product_id, variant_id, quantity")
    .eq("order_id", orderId);
  const rows = (items ?? []) as { product_id: string | null; variant_id: string | null; quantity: number }[];
  const lines = reorderLines(rows);

  let added = 0;
  // Products deleted since the order count as skipped too.
  let skipped = rows.filter((row) => !row.product_id).length;
  for (const line of lines) {
    const form = new FormData();
    form.set("productId", line.productId);
    if (line.variantId) form.set("variantId", line.variantId);
    form.set("quantity", String(line.quantity));
    const result = await addToCart({ ok: false, message: "" }, form);
    if (result.ok) added += 1;
    else skipped += 1;
  }

  if (added === 0) {
    return { ...fail("None of these products can be ordered right now."), skipped };
  }
  return {
    ok: true,
    message: skipped > 0 ? `Added ${added} to your cart. ${skipped} no longer available.` : `Added ${added} to your cart.`,
    added,
    skipped,
    cartCount: await getCartCount(supabase, user.id),
  };
}
