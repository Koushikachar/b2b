"use client"

import { useEffect, useState } from "react"
import { getImageProps } from "next/image"
import Link from "next/link"
import { HugeiconsIcon } from "@hugeicons/react"
import { Cancel01Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog"

const SEEN_KEY = "d2h:new-seller-offer-seen"
const DELAY_MS = 3000

export type PopupImage = { src: string; width: number; height: number }

/**
 * Offer popup: opens 3s after landing, once per browser session. Phones get
 * the portrait image, md and up the landscape one; either may be the same
 * image (Dashboard → Banners with only one uploaded). The image is sized to
 * fit the screen, so any shape works on any device. Shown to every visitor,
 * signed in or not.
 */
export function NewSellerOfferPopup({
  desktop,
  mobile,
  href,
  alt,
}: {
  desktop: PopupImage
  mobile: PopupImage
  href: string
  alt: string
}) {
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

  const {
    props: { srcSet: desktopSet },
  } = getImageProps({ ...desktop, alt, sizes: "768px" })
  const {
    props: { srcSet: mobileSet, ...img },
  } = getImageProps({ ...mobile, alt, sizes: "100vw" })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        showCloseButton={false}
        className="w-auto max-w-none gap-0 overflow-hidden p-0 sm:max-w-none"
      >
        <DialogTitle className="sr-only">{alt}</DialogTitle>
        <Link href={href} onClick={() => setOpen(false)} className="block">
          <picture>
            <source media="(min-width: 768px)" srcSet={desktopSet} sizes="768px" />
            {/* Fit inside the viewport whatever the image's shape. */}
            <img
              {...img}
              srcSet={mobileSet}
              alt={alt}
              className="block h-auto max-h-[85dvh] w-auto max-w-[calc(100vw-2rem)] md:max-w-3xl"
            />
          </picture>
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
