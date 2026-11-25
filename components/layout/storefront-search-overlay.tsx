"use client"

import { useEffect, useRef, useState } from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { HugeiconsIcon } from "@hugeicons/react"
import { Search01Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import {
  SearchMegaMenu,
  type MegaMenuCategory,
} from "@/components/storefront/search-mega-menu"
import { TRENDING_SEARCHES } from "@/lib/search-suggest"

/**
 * Desktop search entry point.
 *
 * A top-bar icon opens the same mega menu used by the homepage hero, but as a
 * full-width panel directly below the header. The page behind it is blurred
 * and dimmed, so search never pushes the page content down or requires
 * scrolling back to the hero. Mobile keeps the bottom-nav search sheet.
 */
export function StorefrontSearchOverlay({
  categories,
  variant = "icon",
}: {
  categories: MegaMenuCategory[]
  /** "field": an always-visible search-box button (sticky header / mobile bar). */
  variant?: "icon" | "field"
}) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  // The store tabs row sits above the sticky header, so the header's bottom
  // edge moves with scroll. Measure it on open instead of assuming the header
  // starts at the top of the viewport (which made the header cover the input).
  const [top, setTop] = useState<number | null>(null)

  useEffect(() => {
    if (!open) return
    const measure = () => {
      const header = triggerRef.current?.closest("header")
      if (header) setTop(Math.max(0, Math.round(header.getBoundingClientRect().bottom)))
    }
    measure()
    window.addEventListener("resize", measure)
    return () => window.removeEventListener("resize", measure)
  }, [open])
  const offsetStyle = top == null ? undefined : { top, maxHeight: `calc(100dvh - ${top}px)` }

  // The dialog traps focus but intentionally allows pointer interaction
  // outside (so the header stays usable); lock page scroll while it is open.
  useEffect(() => {
    if (!open) return
    const { body, documentElement } = document
    const previousOverflow = body.style.overflow
    const previousPaddingRight = body.style.paddingRight
    const scrollbarWidth = window.innerWidth - documentElement.clientWidth
    body.style.overflow = "hidden"
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`
    }
    return () => {
      body.style.overflow = previousOverflow
      body.style.paddingRight = previousPaddingRight
    }
  }, [open])

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen} modal="trap-focus">
      <DialogPrimitive.Trigger
        ref={triggerRef}
        render={
          variant === "field" ? (
            <Button
              variant="outline"
              aria-label="Search products"
              className="h-10 w-full justify-start gap-2 bg-card px-3 font-normal text-muted-foreground hover:text-foreground"
            />
          ) : (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Search"
              className="hidden text-foreground/80 lg:inline-flex"
            />
          )
        }
      >
        <HugeiconsIcon icon={Search01Icon} strokeWidth={2} className="size-5" />
        {variant === "field" ? (
          <span className="truncate text-sm">Search products, categories…</span>
        ) : null}
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop
          data-slot="storefront-search-backdrop"
          style={top == null ? undefined : { top }}
          className="fixed inset-x-0 top-(--storefront-header-offset) bottom-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity duration-200 ease-(--motion-settle) data-ending-style:opacity-0 data-starting-style:opacity-0"
        />
        <DialogPrimitive.Popup
          data-slot="storefront-search-popup"
          style={offsetStyle}
          className="fixed inset-x-0 top-(--storefront-header-offset) z-40 max-h-[calc(100dvh-var(--storefront-header-offset))] overflow-y-auto border-b border-border bg-card shadow-lg transition duration-200 ease-(--motion-settle) outline-none data-ending-style:-translate-y-2 data-ending-style:opacity-0 data-starting-style:-translate-y-2 data-starting-style:opacity-0"
          onClick={(event) => {
            if (
              event.target instanceof Element &&
              event.target.closest("a[href]")
            ) {
              setOpen(false)
            }
          }}
        >
          <DialogPrimitive.Title className="sr-only">
            Search products
          </DialogPrimitive.Title>
          <SearchMegaMenu
            categories={categories}
            trending={TRENDING_SEARCHES}
            autoFocus
            showCategoryList={false}
            showCategoryChips={false}
          />
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
