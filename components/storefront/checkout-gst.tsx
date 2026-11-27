"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { HugeiconsIcon } from "@hugeicons/react"
import { CheckmarkCircle02Icon, Invoice01Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import { declareNoGstin } from "@/lib/buyer/account-actions"

/**
 * GST at checkout: shows the GSTIN the invoice will use, or asks once for it
 * with an "I don't have a GST number" way out that stops the asking.
 */
export function CheckoutGst({
  gstin,
  businessName,
  noGstin: initialNoGstin,
}: {
  gstin: string | null
  businessName: string | null
  noGstin: boolean
}) {
  const [noGstin, setNoGstin] = useState(initialNoGstin)
  const [pending, startTransition] = useTransition()

  const box = "flex flex-wrap items-center gap-3 rounded-lg border p-4"
  if (gstin) {
    return (
      <div className={`${box} border-success/30 bg-success/5`}>
        <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} className="size-5 shrink-0 text-success" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">GST invoice{businessName ? ` for ${businessName}` : ""}</p>
          <p className="text-xs text-muted-foreground">
            GSTIN <span className="font-semibold text-foreground tabular-nums">{gstin}</span> — claim input tax credit on this order.
          </p>
        </div>
        <Link href="/account/gst" className="text-sm font-semibold text-primary hover:underline">
          Change
        </Link>
      </div>
    )
  }

  if (noGstin) {
    return (
      <div className={`${box} border-border bg-card`}>
        <HugeiconsIcon icon={Invoice01Icon} strokeWidth={2} className="size-5 shrink-0 text-muted-foreground" />
        <p className="min-w-0 flex-1 text-sm text-muted-foreground">No GST number on this order.</p>
        <Link href="/account/gst" className="text-sm font-semibold text-primary hover:underline">
          Add one
        </Link>
      </div>
    )
  }

  return (
    <div className={`${box} border-primary/30 bg-brand-50`}>
      <HugeiconsIcon icon={Invoice01Icon} strokeWidth={2} className="size-5 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Have a GST number?</p>
        <p className="text-xs text-muted-foreground">Add it to get a GST invoice and claim 100% input tax credit.</p>
      </div>
      <div className="flex w-full flex-wrap gap-2 sm:w-auto">
        <Button render={<Link href="/account/gst" />} nativeButton={false} size="sm" className="flex-1 sm:flex-none">
          Add GST number
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          className="flex-1 sm:flex-none"
          onClick={() =>
            startTransition(async () => {
              const result = await declareNoGstin()
              if (result.ok) setNoGstin(true)
              else toast.add({ type: "error", title: result.message })
            })
          }
        >
          {pending ? <Spinner className="size-4" /> : null}
          I don&apos;t have a GST number
        </Button>
      </div>
    </div>
  )
}
