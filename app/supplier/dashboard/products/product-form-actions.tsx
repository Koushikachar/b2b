"use client"

import { HugeiconsIcon } from "@hugeicons/react"
import { LinkSquare02Icon, SendIcon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

type ActionsProps = {
  pending: boolean
  pendingAction: "draft" | "submit" | null
  onSaveDraft: () => void
  onSaveSubmit: () => void
  showSubmit?: boolean
  saveLabel?: string
  /** Edit page of a live product: opens the storefront page in a new tab. */
  liveHref?: string
}

/** Publish / save buttons (+ live view), shared by the sidebar and sticky bar. */
function ActionButtons({
  pending,
  pendingAction,
  onSaveDraft,
  onSaveSubmit,
  showSubmit = true,
  saveLabel = "Save draft",
  liveHref,
}: ActionsProps) {
  const submitting = pending && pendingAction === "submit"
  const saving = pending && pendingAction === "draft"

  return (
    <div className="flex flex-col gap-2">
      {showSubmit ? (
        <Button type="button" disabled={pending} onClick={onSaveSubmit}>
          {submitting ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <HugeiconsIcon icon={SendIcon} strokeWidth={2} data-icon="inline-start" />
          )}
          {submitting ? "Submitting…" : "Save & publish"}
        </Button>
      ) : null}
      <Button type="button" variant="outline" disabled={pending} onClick={onSaveDraft}>
        {saving ? <Spinner data-icon="inline-start" /> : null}
        {saving ? "Saving…" : saveLabel}
      </Button>
      {liveHref ? (
        <Button
          variant="ghost"
          nativeButton={false}
          render={<a href={liveHref} target="_blank" rel="noopener noreferrer" />}
          className="text-primary hover:text-primary"
        >
          <HugeiconsIcon icon={LinkSquare02Icon} strokeWidth={2} data-icon="inline-start" />
          View live product
        </Button>
      ) : null}
    </div>
  )
}

export function ProductFormActions(props: ActionsProps) {
  return <ActionButtons {...props} />
}

export function ProductFormStickyActions(props: ActionsProps) {
  return (
    <div className="@3xl/content:hidden">
      <div
        data-scrolled="true"
        data-edge="above"
        className="scroll-edge sticky bottom-0 z-10 -mx-4 mt-4 bg-background px-4 py-3"
      >
        <ActionButtons {...props} />
      </div>
    </div>
  )
}
