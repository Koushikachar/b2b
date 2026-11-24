import { describe, expect, it } from "vitest";
import { shipmentSchema } from "../lib/orders/shipment";

const orderId = "11111111-1111-4111-8111-111111111111";

describe("shipmentSchema", () => {
  it("accepts a carrier and tracking number so the buyer can track the parcel", () => {
    const parsed = shipmentSchema.safeParse({ orderId, carrier: " Delhivery ", trackingRef: "AWB123" });
    expect(parsed.success && parsed.data).toEqual({ orderId, carrier: "Delhivery", trackingRef: "AWB123" });
  });

  it("requires the tracking number", () => {
    const parsed = shipmentSchema.safeParse({ orderId, carrier: "Delhivery", trackingRef: "  " });
    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(parsed.error.issues[0].message).toBe("Enter the tracking number.");
  });

  it("requires the carrier", () => {
    const parsed = shipmentSchema.safeParse({ orderId, trackingRef: "AWB123" });
    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(parsed.error.issues[0].message).toBe("Enter the carrier.");
  });
});
