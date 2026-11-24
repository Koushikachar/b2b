import { HugeiconsIcon } from "@hugeicons/react"
import { Tick01Icon } from "@hugeicons/core-free-icons"
import { cn } from "cn"
import type { OrderStatus } from "@/lib/orders/lifecycle"
import { orderSteps, type OrderStep, type OrderStepState } from "@/lib/orders/order-steps"

/** What each step means for the buyer right now. */
function describe(step: OrderStep, cancelledReason: string | null): string {
  switch (step.key) {
    case "placed":
      return "Your order was sent to Direct2Hub."
    case "review":
      if (step.state === "failed") return cancelledReason ? `Reason: ${cancelledReason}` : "This order was cancelled."
      return step.state === "done"
        ? "Your order was accepted."
        : "We are checking stock and prices for your order."
    case "payment":
      return step.state === "done"
        ? "We received your payment."
        : "We will contact you to arrange payment. Nothing is paid on the website."
    case "shipment":
      return step.state === "done"
        ? "Shipped — the carrier and tracking number are below."
        : "Your order ships once payment is received."
    case "delivery":
      return step.state === "done" ? "Your order was delivered." : "Final step."
  }
}

/**
 * The buyer's order in one ordered column: placed → under review → payment
 * awaiting → awaiting shipment → delivery (lib/orders/order-steps.ts).
 */
export function BuyerOrderFlow({
  status,
  paid,
  cancelledReason,
}: {
  status: OrderStatus
  paid: boolean
  cancelledReason: string | null
}) {
  const steps = orderSteps(status, paid)
  const current = steps.find((step) => step.state === "current" || step.state === "failed")

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-linear-to-r from-brand-50 to-card px-4 py-3">
        <h2 className="text-sm font-semibold">Order status</h2>
        <p className="text-xs text-muted-foreground">{current ? current.label : "Completed"}</p>
      </header>
      <ol className="divide-y divide-border">
        {steps.map((step, index) => (
          <li
            key={step.key}
            aria-current={step.state === "current" ? "step" : undefined}
            className={cn("flex gap-3 px-4 py-3", step.state === "current" && "bg-primary/4")}
          >
            <span className="pt-0.5">
              <StepMarker state={step.state} index={index} />
            </span>
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "text-sm font-medium",
                  step.state === "failed" ? "text-destructive" : step.state === "upcoming" ? "text-muted-foreground" : "text-foreground",
                )}
              >
                {step.label}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{describe(step, cancelledReason)}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

function StepMarker({ state, index }: { state: OrderStepState; index: number }) {
  if (state === "done") {
    return (
      <span className="flex size-5 items-center justify-center rounded-full bg-success text-white [&_svg]:size-3.5">
        <HugeiconsIcon icon={Tick01Icon} strokeWidth={3} />
      </span>
    )
  }
  return (
    <span
      className={cn(
        "flex size-5 items-center justify-center rounded-full border-2 text-micro font-bold tabular-nums",
        state === "current" && "border-primary bg-primary/10 text-primary",
        state === "failed" && "border-destructive bg-destructive/10 text-destructive",
        state === "upcoming" && "border-border bg-card text-muted-foreground",
      )}
    >
      {state === "failed" ? "✕" : index + 1}
    </span>
  )
}
