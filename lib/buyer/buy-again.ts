import type { SupabaseClient } from "@supabase/supabase-js";

/** Most products shown in the "Frequently bought" rail (also the card loader's limit). */
export const BUY_AGAIN_LIMIT = 12;

type OrderedItem = { product_id: string | null };

/**
 * Distinct product ids from order lines already sorted newest first, most
 * often ordered first; ties keep the most recent purchase first. Deleted
 * products (null id) are skipped. Pure, so it unit-tests without a database.
 */
export function frequentProductIds(items: OrderedItem[], limit = BUY_AGAIN_LIMIT): string[] {
  const counts = new Map<string, number>(); // insertion order = most recent first
  for (const item of items) {
    if (item.product_id) counts.set(item.product_id, (counts.get(item.product_id) ?? 0) + 1);
  }
  // Array.prototype.sort is stable, so equal counts stay newest first.
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);
}

/**
 * Products this buyer orders most, from their latest 100 order lines. Reads
 * only their own order lines (RLS: order_items_buyer_select_own). A new
 * account has none, so the section stays hidden.
 */
export async function getBuyAgainProductIds(supabase: SupabaseClient, buyerId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("order_items")
    .select("product_id, orders!inner(buyer_id)")
    .eq("orders.buyer_id", buyerId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    console.error("Frequently bought lookup failed:", error.code, error.message);
    return [];
  }
  return frequentProductIds((data ?? []) as OrderedItem[]);
}
