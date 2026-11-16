"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { HugeiconsIcon } from "@hugeicons/react"
import { Cancel01Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog"

const SEEN_KEY = "d2h:new-seller-offer-seen"
const DELAY_MS = 4000

/**
 * Starter-offer pamphlet: opens 4s after landing, once per browser session.
 * Rendered for signed-out visitors only (see the home page).
 */
export function NewSellerOfferPopup() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    try {
      if (sessionStorage.getItem(SEEN_KEY)) return
    } catch {
      // Storage blocked (private mode): still show it once for this page view.
    }
    const timer = setTimeout(() => {
      // Don't steal focus from someone typing (e.g. in search); try next visit.
      if (document.activeElement?.matches("input, textarea, [contenteditable]")) return
      setOpen(true)
      try {
        sessionStorage.setItem(SEEN_KEY, "1")
      } catch {}
    }, DELAY_MS)
    return () => clearTimeout(timer)
  }, [])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent showCloseButton={false} className="max-w-[calc(100%-2rem)] overflow-hidden p-0 sm:max-w-3xl">
        <DialogTitle className="sr-only">New Seller Starter Offer</DialogTitle>
        <Link href="/products" onClick={() => setOpen(false)} className="block">
          <Image
            src="/promos/new-seller-offer.webp"
            alt="New Seller Starter Offer: MOV from ₹2,500, 100% damage protection, 24-hour support, pan India delivery. Shop now"
            width={1200}
            height={600}
            sizes="(min-width: 640px) 768px, 100vw"
            className="h-auto w-full"
          />
        </Link>
        <DialogClose
          render={<Button variant="outline" size="icon-sm" className="absolute top-2 right-2 bg-white/90 shadow" />}
        >
          <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
          <span className="sr-only">Close</span>
        </DialogClose>
      </DialogContent>
    </Dialog>
  )
}
