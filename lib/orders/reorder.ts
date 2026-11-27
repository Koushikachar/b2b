import type { OrderStatus } from "@/lib/orders/lifecycle";

/** "Order again" is offered once an order is finished: delivered or cancelled. */
export function canReorder(status: OrderStatus): boolean {
  return status === "delivered" || status === "cancelled";
}

type OrderedLine = { product_id: string | null; variant_id: string | null; quantity: number };

/** Cart lines to re-add: one per product + variant (quantities merged); deleted products skipped. */
export function reorderLines(items: OrderedLine[]) {
  const lines = new Map<string, { productId: string; variantId: string | null; quantity: number }>();
  for (const item of items) {
    if (!item.product_id) continue;
    const key = `${item.product_id}:${item.variant_id ?? ""}`;
    const line = lines.get(key);
    if (line) line.quantity += item.quantity;
    else lines.set(key, { productId: item.product_id, variantId: item.variant_id, quantity: item.quantity });
  }
  return [...lines.values()];
}
