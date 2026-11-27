"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import { declareNoGstin } from "@/lib/buyer/account-actions"

/** Buyers without a GSTIN say so once; checkout then stops asking. */
export function NoGstinChoice({ noGstin: initial }: { noGstin: boolean }) {
  const [noGstin, setNoGstin] = useState(initial)
  const [pending, startTransition] = useTransition()

  if (noGstin) {
    return (
      <p className="mt-3 rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
        You told us you don&apos;t have a GST number. Fill in the form above any time to add one.
      </p>
    )
  }
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card px-4 py-3">
      <p className="text-sm text-muted-foreground">Not GST registered?</p>
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await declareNoGstin()
            toast.add({ type: result.ok ? "success" : "error", title: result.message })
            if (result.ok) setNoGstin(true)
          })
        }
      >
        {pending ? <Spinner className="size-4" /> : null}
        I don&apos;t have a GST number
      </Button>
    </div>
  )
}
