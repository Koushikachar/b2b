"use client"

import { HugeiconsIcon } from "@hugeicons/react"
import { Share08Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import { glassIconClass } from "@/components/storefront/glass"

/**
 * Share this page: the phone's share sheet (WhatsApp, etc.) where available,
 * otherwise copy the link.
 */
export function ShareButton({ title }: { title: string }) {
  const share = async () => {
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({ title, url })
      } catch {
        // Closing the share sheet rejects; nothing to do.
      }
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      toast.add({ type: "success", title: "Link copied" })
    } catch {
      toast.add({ type: "error", title: "Couldn't copy the link" })
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label="Share"
      title="Share"
      onClick={share}
      className={glassIconClass}
    >
      <HugeiconsIcon icon={Share08Icon} strokeWidth={2} className="size-5" />
    </Button>
  )
}
