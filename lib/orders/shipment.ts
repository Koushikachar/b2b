import { z } from "zod";

/**
 * Shipment details a supplier records when marking an order shipped. Carrier
 * and tracking number are required so the buyer can always track the parcel.
 * Kept out of the "use server" actions file so it can be unit-tested.
 */
export const shipmentSchema = z.object({
  orderId: z.string().uuid("Invalid order."),
  carrier: z
    .string({ error: "Enter the carrier." })
    .trim()
    .min(1, "Enter the carrier.")
    .max(120, "Keep the carrier name under 120 characters."),
  trackingRef: z
    .string({ error: "Enter the tracking number." })
    .trim()
    .min(1, "Enter the tracking number.")
    .max(80, "Keep the tracking number under 80 characters."),
  shipmentNotes: z.string().trim().max(500, "Keep the notes under 500 characters.").optional(),
});
