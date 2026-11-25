"use client"

import type { ReactNode } from "react"
import { usePathname } from "next/navigation"
import { StorefrontHeader } from "@/components/layout/storefront-header"
import { StorefrontFooter } from "@/components/layout/storefront-footer"
import { StorefrontBottomNav } from "@/components/layout/storefront-bottom-nav"
import { MobileSearchBar } from "@/components/layout/mobile-search-bar"
import { StoreTabs } from "@/components/storefront/store-tabs"
import { StorefrontSession } from "@/components/storefront/storefront-session"
import { SignupBonus } from "@/components/storefront/signup-bonus"
import type { MegaMenuCategory } from "@/components/storefront/search-mega-menu"


type User = { email: string; user_type: string; isStaff?: boolean } | null
type NavCategory = { slug: string; name: string }

export function StorefrontShell({
  user,
  categories,
  megaCategories,
  cartCount = 0,
  children,
}: {
  user: User
  categories?: NavCategory[]
  megaCategories?: MegaMenuCategory[]
  cartCount?: number
  children: ReactNode
}) {
  const pathname = usePathname()
  // Product detail pages own a sticky buy bar, so the bottom nav (and its
  // reserved padding) is hidden there.
  const hideBottomNav = /^\/products\/[^/]+$/.test(pathname ?? "")

  return (
    <div
      className={
        hideBottomNav
          ? "flex min-h-screen flex-col lg:pb-0"
          : "flex min-h-screen flex-col pb-(--bottom-nav-offset) lg:pb-0"
      }
    >
      <StorefrontSession />
      {user ? <SignupBonus accountKey={user.email} /> : null}
      {pathname === "/" || pathname === "/select" || pathname?.startsWith("/select/") ? (
        <StoreTabs />
      ) : null}
      <StorefrontHeader
        user={user}
        categories={categories}
        megaCategories={megaCategories}
        cartCount={cartCount}
      />
      <MobileSearchBar categories={megaCategories ?? []} />
      {/* Light brand tint on the side margins (all screen sizes), fading to the
          page background toward the centre so content stays clean. */}
      {/* pb-8: breathing room between the last product row and the footer. */}
      <main className="flex-1 bg-[linear-gradient(90deg,var(--brand-50),var(--background)_22%,var(--background)_78%,var(--brand-50))] pb-8">
        {children}
      </main>
      <StorefrontFooter user={user} />
      {!hideBottomNav && (
        <StorefrontBottomNav user={user} cartCount={cartCount} />
      )}
    </div>
  )
}
