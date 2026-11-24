// Buyer order history. Every query is scoped to the signed-in buyer (RLS
// enforces buyer_id = auth.uid() on orders; this helper just passes the
// session user explicitly for clarity).

import type { SupabaseClient } from "@supabase/supabase-js";
import { COMPANY } from "@/lib/company";
import { parseOrderStatus, type OrderStatus } from "@/lib/orders/lifecycle";
import { orderAmount } from "@/lib/orders/quotation";

export type BuyerOrderSummary = {
  id: string;
  reference: string;
  status: OrderStatus;
  /** Amount to pay: subtotal + GST (or an older accepted quotation), minus wallet. */
  total: number;
  hasAcceptedQuote: boolean;
  itemCount: number;
  supplierName: string | null;
  buyerName: string | null;
  createdAt: string;
};

const HISTORY_PAGE_SIZE = 50;

type OrderRow = {
  id: string;
  reference: string;
  status: string;
  subtotal: number;
  gst_amount: number;
  wallet_amount: number;
  item_count: number;
  delivery: { fullName?: string } | null;
  created_at: string;
};

/**
 * List the buyer's orders, newest first, decorated with the supplier's
 * business name and the accepted quotation total (if the buyer accepted one).
 */
export async function getBuyerOrders(
  supabase: SupabaseClient,
  buyerId: string,
): Promise<BuyerOrderSummary[]> {
  const { data: orderRows, error } = await supabase
    .from("orders")
    .select(
      "id, reference, status, subtotal, gst_amount, wallet_amount, item_count, delivery, created_at",
    )
    .eq("buyer_id", buyerId)
    .order("created_at", { ascending: false })
    .limit(HISTORY_PAGE_SIZE);
  if (error) {
    console.error("getBuyerOrders failed:", error.code, error.message);
    return [];
  }

  const orders = (orderRows ?? []) as unknown as OrderRow[];
  if (orders.length === 0) {
    return [];
  }

  const orderIds = orders.map((order) => order.id);

  // Only accepted quotations on older orders still change the total.
  const { data: quoteRows } = await supabase
    .from("quotations")
    .select("order_id, version, total, status")
    .in("order_id", orderIds)
    .eq("status", "accepted");

  const acceptedQuotes = new Map<string, { status: string; version: number; total: number }>();
  for (const row of (quoteRows ?? []) as { order_id: string; version: number; total: number; status: string }[]) {
    acceptedQuotes.set(row.order_id, row);
  }

  return orders.map((order) => {
    const acceptedQuote = acceptedQuotes.get(order.id) ?? null;
    return {
      id: order.id,
      reference: order.reference,
      status: parseOrderStatus(order.status) ?? "new",
      total: orderAmount(order.subtotal, acceptedQuote, order.gst_amount, order.wallet_amount),
      hasAcceptedQuote: acceptedQuote !== null,
      itemCount: order.item_count,
      // Only D2H Core is open; every order is sold by Direct2Hub.
      supplierName: COMPANY.legalName,
      buyerName: order.delivery?.fullName ?? null,
      createdAt: order.created_at,
    };
  });
}
