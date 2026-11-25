"use client"

import type { ReactNode } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons"
import { StorefrontSearchOverlay } from "@/components/layout/storefront-search-overlay"
import { glassBarClass } from "@/components/storefront/glass"
import { ShareButton } from "@/components/storefront/share-button"
import { cn } from "@/lib/utils"

/**
 * Product page top row (Blinkit-style on phones): Back on the left; search,
 * share and the wishlist heart (`actions`) on the right, pinned in frosted
 * glass while scrolling. On desktop the sticky site header already has
 * search, so the row sits in the page with Back, share and wishlist.
 */
export function ProductBackButton({ title, actions }: { title: string; actions?: ReactNode }) {
  return (
    // <header>: the search panel opens directly below the element it lives in.
    <header
      className={cn(
        "sticky top-0 z-30 -mx-4 mb-1 flex items-center gap-2 px-4 pt-[calc(var(--safe-area-top)+0.5rem)] pb-2",
        glassBarClass,
        "lg:static lg:mx-0 lg:mb-4 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none",
      )}
    >
      <button
        type="button"
        onClick={() => window.history.back()}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 hover:underline"
      >
        <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
        Back
      </button>
      <div className="ml-auto flex items-center gap-2">
        <div className="lg:hidden">
          <StorefrontSearchOverlay categories={[]} variant="glass" />
        </div>
        <ShareButton title={title} />
        {actions}
      </div>
    </header>
  )
}
