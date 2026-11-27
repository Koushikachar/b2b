import type { OrderStatus } from "@/lib/orders/lifecycle";

/** Store policy: free cancellation before the order is shipped. Mirrors cancel_my_order. */
const BUYER_CANCELLABLE: readonly OrderStatus[] = ["new", "quoted", "confirmed", "processing"];

export function canBuyerCancel(status: OrderStatus): boolean {
  return BUYER_CANCELLABLE.includes(status);
}

export const BUYER_CANCEL_REASONS = [
  "Ordered by mistake",
  "Found a better price elsewhere",
  "Delivery is taking too long",
  "Want to change items or quantity",
  "Want to change the delivery address",
  "No longer need these products",
  "Other",
] as const;

export const MAX_CANCEL_DETAILS = 400;

/**
 * The reason saved on the order (shown to the supplier and buyer): the chosen
 * reason, plus the buyer's own words when given. "Other" needs those words.
 */
export function buyerCancelReason(
  choice: string,
  details: string,
): { ok: true; reason: string } | { ok: false; message: string } {
  const text = details.trim();
  if (!(BUYER_CANCEL_REASONS as readonly string[]).includes(choice)) {
    return { ok: false, message: "Choose a reason." };
  }
  if (text.length > MAX_CANCEL_DETAILS) {
    return { ok: false, message: `Keep it under ${MAX_CANCEL_DETAILS} characters.` };
  }
  if (choice === "Other") {
    return text ? { ok: true, reason: text } : { ok: false, message: "Tell us why you're cancelling." };
  }
  return { ok: true, reason: text ? `${choice} — ${text}` : choice };
}
