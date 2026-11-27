"use client"

import { useActionState, useState } from "react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { BUYER_CANCEL_REASONS, MAX_CANCEL_DETAILS } from "@/lib/orders/cancel"
import { cancelMyOrder, type CancelOrderResult } from "@/lib/buyer/order-cancel-actions"

const initial: CancelOrderResult = { ok: false, message: "" }

/** Cancel this order (until it ships): pick a reason, optionally add your own words. */
export function CancelOrderButton({ orderId }: { orderId: string }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<string>("")
  const [state, action, pending] = useActionState(async (prev: CancelOrderResult, formData: FormData) => {
    const result = await cancelMyOrder(prev, formData)
    if (result.ok) setOpen(false)
    return result
  }, initial)
  const isOther = reason === "Other"

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="text-destructive hover:text-destructive">
        Cancel order
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel this order?</DialogTitle>
            <DialogDescription>Tell us why — it helps the supplier.</DialogDescription>
          </DialogHeader>
          <form action={action} className="flex flex-col gap-3">
            <input type="hidden" name="orderId" value={orderId} />
            <input type="hidden" name="reason" value={reason} />
            <RadioGroup value={reason} onValueChange={(value) => setReason(String(value))} aria-label="Reason" className="flex flex-col gap-1.5">
              {BUYER_CANCEL_REASONS.map((option) => (
                <label
                  key={option}
                  className="flex cursor-pointer items-center gap-3 rounded-md border border-border px-3 py-2.5 text-sm has-data-checked:border-primary has-data-checked:bg-brand-50"
                >
                  <RadioGroupItem value={option} />
                  {option}
                </label>
              ))}
            </RadioGroup>
            <div className="flex flex-col gap-1">
              <label htmlFor="cancel-details" className="text-sm font-medium">
                {isOther ? "Your reason" : "Anything else? (optional)"}
              </label>
              <Textarea
                id="cancel-details"
                name="details"
                rows={2}
                maxLength={MAX_CANCEL_DETAILS}
                required={isOther}
                placeholder={isOther ? "Type your reason" : "Add details for the supplier"}
              />
            </div>
            {!state.ok && state.message ? (
              <Alert variant="destructive">
                <AlertDescription>{state.message}</AlertDescription>
              </Alert>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Keep order
              </Button>
              <Button type="submit" variant="destructive" disabled={pending || !reason}>
                {pending ? "Cancelling…" : "Cancel order"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
