"use client"

import { useTransition } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowTurnBackwardIcon, ArrowTurnForwardIcon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import {
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  parseOrderStatus,
  parsePaymentStatus,
} from "@/lib/orders/lifecycle"
import type { OrderStepChange } from "@/lib/orders/step-history"
import { changeOrderStep } from "@/lib/supplier/order-actions"

function label(change: OrderStepChange, value: string): string {
  if (change.field === "status") {
    const status = parseOrderStatus(value)
    return status ? ORDER_STATUS_LABELS[status] : value
  }
  const payment = parsePaymentStatus(value)
  return payment ? `Payment: ${PAYMENT_STATUS_LABELS[payment]}` : value
}

const describe = (change: OrderStepChange) => `${label(change, change.from)} → ${label(change, change.to)}`

/**
 * Undo the latest change on this order (wrong button pressed) or redo the
 * step just undone. Always visible; each button says what it will do, and is
 * disabled when there is nothing to undo or redo.
 */
export function OrderUndoRedo({
  orderId,
  undo,
  redo,
}: {
  orderId: string
  undo: OrderStepChange | null
  redo: OrderStepChange | null
}) {
  const [pending, startTransition] = useTransition()

  function run(direction: "undo" | "redo") {
    startTransition(async () => {
      const result = await changeOrderStep(orderId, direction)
      toast.add({ type: result.ok ? "success" : "error", title: result.message })
    })
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card px-4 py-3 sm:flex-row sm:items-center">
      <div className="min-w-0 sm:mr-auto">
        <p className="text-sm font-semibold">Made a mistake?</p>
        <p className="text-xs text-muted-foreground">
          {undo
            ? `Undo reverses the last change: ${describe(undo)}.`
            : redo
              ? `Redo puts back what you undid: ${describe(redo)}.`
              : "Nothing to undo yet. After you accept, confirm payment, ship or deliver, you can reverse it here."}
        </p>
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          disabled={pending || !undo}
          onClick={() => run("undo")}
          title={undo ? `Undo: ${describe(undo)}` : "Nothing to undo"}
        >
          <HugeiconsIcon icon={ArrowTurnBackwardIcon} strokeWidth={2} data-icon="inline-start" />
          {pending ? "Working…" : "Undo"}
        </Button>
        <Button
          variant="outline"
          disabled={pending || !redo}
          onClick={() => run("redo")}
          title={redo ? `Redo: ${describe(redo)}` : "Nothing to redo"}
        >
          <HugeiconsIcon icon={ArrowTurnForwardIcon} strokeWidth={2} data-icon="inline-start" />
          Redo
        </Button>
      </div>
    </div>
  )
}
