"use client"

import { usePathname, useSearchParams } from "next/navigation"
import { StorefrontSearchOverlay } from "@/components/layout/storefront-search-overlay"
import { useHeroSearchVisible } from "@/components/layout/use-hero-search"
import type { MegaMenuCategory } from "@/components/storefront/search-mega-menu"
import { cn } from "@/lib/utils"

/**
 * Phone search bar that stays on screen while scrolling (desktop has it in the
 * sticky header). On the homepage it slides in only once the hero search has
 * scrolled away, so two search boxes never show at once.
 */
export function MobileSearchBar({ categories }: { categories: MegaMenuCategory[] }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isHome = pathname === "/"
  const heroSearch = useHeroSearchVisible()
  const visible = !isHome || heroSearch === false

  return (
    <header
      aria-hidden={!visible}
      inert={!visible}
      className={cn(
        "top-0 z-40 border-b border-border bg-card/95 px-4 pt-[calc(var(--safe-area-top)+0.5rem)] pb-2 shadow-xs backdrop-blur-sm lg:hidden",
        // Home: overlays the page and slides in; elsewhere it sits in the flow.
        isHome ? "fixed inset-x-0 transition-transform duration-200 ease-(--motion-settle)" : "sticky",
        isHome && !visible && "-translate-y-full",
      )}
    >
      <StorefrontSearchOverlay
        key={`${pathname}?${searchParams.toString()}`}
        categories={categories}
        variant="field"
      />
    </header>
  )
}
