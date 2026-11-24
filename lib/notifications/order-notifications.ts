// In-app order notifications. Each call records one row in
// notification_outbox; the buyer's Notifications page reads those rows.
// Nothing is sent over WhatsApp: everyone follows orders on the website.
// Failure here never affects the order, which has already committed.

import type { SupabaseClient } from "@supabase/supabase-js";

/** Buyer-facing order events shown on Account → Notifications. */
export type NotificationTemplate =
  | "order_confirmed_buyer"
  | "order_rejected_buyer"
  | "order_shipped_buyer"
  | "order_delivered_buyer"
  | "payment_confirmed_buyer";

export async function recordOrderNotification(
  supabase: SupabaseClient,
  orderId: string,
  template: NotificationTemplate,
): Promise<void> {
  const { error } = await supabase.rpc("queue_order_notification", {
    p_order_id: orderId,
    p_template: template,
  });
  if (error) console.error("queue_order_notification failed:", error.code);
}
