"use client"

import { usePathname, useSearchParams } from "next/navigation"
import { StorefrontSearchOverlay } from "@/components/layout/storefront-search-overlay"
import { useHeroSearchVisible } from "@/components/layout/use-hero-search"
import type { MegaMenuCategory } from "@/components/storefront/search-mega-menu"
import { glassBarClass } from "@/components/storefront/glass"
import { cn } from "@/lib/utils"

/** Product-browsing pages that get the floating search icon on phones. */
const BROWSE_PAGES = /^\/(products|categories|category\/[^/]+|select(\/.*)?)$/

/**
 * Phone search (desktop has it in the sticky header), Blinkit-style glass:
 * - homepage: a full search bar that slides in once the hero search has
 *   scrolled away (never two search boxes at once);
 * - product-browsing pages (BROWSE_PAGES): a floating glass search button,
 *   top right;
 * - everything else, including product pages (their own top row has search):
 *   nothing.
 */
export function MobileSearchBar({ categories }: { categories: MegaMenuCategory[] }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isHome = pathname === "/"
  const heroSearch = useHeroSearchVisible()
  const key = `${pathname}?${searchParams.toString()}`

  if (!isHome) {
    // Only where people browse products; Store, Account, More, Orders, Cart
    // and Checkout don't need it. Product pages have their own top-row icon.
    if (!BROWSE_PAGES.test(pathname ?? "")) return null
    return (
      // <header>: the search panel opens directly below the element it lives in.
      <header className="pointer-events-none fixed top-[calc(var(--safe-area-top)+0.5rem)] right-3 z-40 lg:hidden">
        <div className="pointer-events-auto">
          <StorefrontSearchOverlay key={key} categories={categories} variant="glass" />
        </div>
      </header>
    )
  }

  const visible = heroSearch === false
  return (
    <header
      aria-hidden={!visible}
      inert={!visible}
      className={cn(
        "fixed inset-x-0 top-0 z-40 px-4 pt-[calc(var(--safe-area-top)+0.5rem)] pb-2 shadow-xs transition-transform duration-200 ease-(--motion-settle) lg:hidden",
        glassBarClass,
        !visible && "-translate-y-full",
      )}
    >
      <StorefrontSearchOverlay key={key} categories={categories} variant="field" />
    </header>
  )
}
