"use client"

import type { ReactNode } from "react"
import { toast } from "@/components/ui/toast"

/**
 * "Share the App" row: native share sheet where supported, otherwise copies
 * the site link to the clipboard.
 */
export function ShareAppRow({
  url,
  title,
  className,
  children,
}: {
  url: string
  title: string
  className: string
  children: ReactNode
}) {
  const onShare = async () => {
    const data = { title, text: `Source wholesale products on ${title}`, url }
    try {
      if (typeof navigator.share === "function") {
        await navigator.share(data)
        return
      }
      await navigator.clipboard.writeText(url)
      toast.add({ type: "success", title: "Link copied", description: url })
    } catch (error) {
      if ((error as DOMException)?.name === "AbortError") return
      toast.add({ type: "error", title: "Could not share", description: url })
    }
  }

  return (
    <button type="button" onClick={onShare} className={className}>
      {children}
    </button>
  )
}
