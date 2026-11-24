import { orderAtOrBeyond, type OrderStatus } from "@/lib/orders/lifecycle";

export type OrderStepState = "done" | "current" | "upcoming" | "failed";

export type OrderStep = {
  key: "placed" | "review" | "payment" | "shipment" | "delivery";
  label: string;
  state: OrderStepState;
};

/**
 * The order as both sides see it: placed → under review (reviewed, or
 * cancelled) → payment awaiting (done once the supplier confirms the money)
 * → awaiting shipment → delivered. Pure, so it unit-tests without a page.
 */
export function orderSteps(status: OrderStatus, paid: boolean): OrderStep[] {
  const placed: OrderStep = { key: "placed", label: "Order placed", state: "done" };
  if (status === "cancelled") {
    return [placed, { key: "review", label: "Order cancelled", state: "failed" }];
  }

  const reviewed = orderAtOrBeyond(status, "confirmed");
  const shipped = orderAtOrBeyond(status, "shipped");
  const delivered = status === "delivered";
  const steps: Omit<OrderStep, "state">[] = [
    { key: "review", label: reviewed ? "Order reviewed" : "Order under review" },
    { key: "payment", label: paid ? "Payment done" : "Payment awaiting" },
    { key: "shipment", label: shipped ? "Shipped" : "Awaiting shipment" },
    { key: "delivery", label: delivered ? "Delivered" : "Delivery" },
  ];
  const done = [reviewed, paid, shipped, delivered];
  const current = done.indexOf(false);

  return [
    placed,
    ...steps.map((step, index) => ({
      ...step,
      state: (done[index] ? "done" : index === current ? "current" : "upcoming") as OrderStepState,
    })),
  ];
}
