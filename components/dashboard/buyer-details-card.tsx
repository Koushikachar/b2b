import { HugeiconsIcon } from "@hugeicons/react"
import { Invoice01Icon, Store01Icon, UserIcon } from "@hugeicons/core-free-icons"
import { Card } from "@/components/ui/card"
import { CopyButton } from "@/components/orders/copy-button"
import { BUSINESS_TYPES } from "@/lib/buyer/business-type"

/** Row of public.order_buyer_details (the supplier's view of their buyer). */
export type BuyerDetails = {
  full_name: string | null
  phone: string | null
  gstin: string | null
  gst_business_name: string | null
  gst_address: string | null
  no_gstin: boolean | null
  business_type: string | null
}

/**
 * Supplier order page: who the buyer is. Their GSTIN (for the GST invoice /
 * input credit), registered name and address, and the one-time
 * "what describes you best" answer.
 */
export function BuyerDetailsCard({ details }: { details: BuyerDetails | null }) {
  if (!details) return null
  const kind = BUSINESS_TYPES.find((type) => type.value === details.business_type)?.label ?? null

  return (
    <Card className="flex-col! gap-3 rounded-lg p-4 sm:flex-row! sm:items-start sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
          <HugeiconsIcon icon={UserIcon} strokeWidth={2} className="size-5 text-muted-foreground" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Buyer</p>
          <p className="truncate text-sm font-semibold">{details.full_name || "Name not set"}</p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <HugeiconsIcon icon={Store01Icon} strokeWidth={2} className="size-3.5 shrink-0" />
            {kind ?? "Hasn't said what describes them yet"}
          </p>
        </div>
      </div>

      <div className="min-w-0 rounded-md border border-border bg-muted/30 px-3 py-2 sm:max-w-sm">
        <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          <HugeiconsIcon icon={Invoice01Icon} strokeWidth={2} className="size-3.5" />
          Buyer GST
        </p>
        {details.gstin ? (
          <>
            <p className="mt-1 flex items-center gap-1 text-sm font-semibold tabular-nums">
              {details.gstin}
              <CopyButton value={details.gstin} label="GSTIN" />
            </p>
            {details.gst_business_name ? <p className="text-xs">{details.gst_business_name}</p> : null}
            {details.gst_address ? <p className="text-xs text-muted-foreground">{details.gst_address}</p> : null}
          </>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">
            {details.no_gstin ? "Not GST registered (buyer said they have no GST number)." : "No GST number added."}
          </p>
        )}
      </div>
    </Card>
  )
}
