"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { dashboardHref, navLinksFor } from "@/lib/nav"
import { Logo } from "@/components/layout/logo"
import { MobileNav } from "@/components/layout/mobile-nav"
import { StorefrontSearchOverlay } from "@/components/layout/storefront-search-overlay"
import { useHeroSearchVisible } from "@/components/layout/use-hero-search"
import { CartIconLink } from "@/components/storefront/cart-icon-link"
import type { MegaMenuCategory } from "@/components/storefront/search-mega-menu"
import { Button } from "@/components/ui/button"
import { HugeiconsIcon } from "@hugeicons/react"
import { DashboardSquare01Icon, UserIcon } from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"

type User = { email: string; user_type: string; isStaff?: boolean } | null
type NavCategory = { slug: string; name: string }

export function StorefrontHeader({
  user,
  categories = [],
  megaCategories = [],
  cartCount = 0,
}: {
  user: User
  categories?: NavCategory[]
  megaCategories?: MegaMenuCategory[]
  cartCount?: number
}) {
  const navLinks = navLinksFor(user)
  const pathname = usePathname()
  const searchParams = useSearchParams()
  // Remount the overlay on navigation so an open panel can never stay over the
  // next route/query without an extra state-sync effect.
  const routeKey = `${pathname}?${searchParams.toString()}`
  const heroSearch = useHeroSearchVisible()
  const showSearch = pathname !== "/" || heroSearch === false

  return (
    <header
      className="sticky top-0 z-50 hidden bg-card pt-(--safe-area-top) lg:block"
    >
      {/* ---- Tier 1: logo + nav + actions ---- */}{" "}
      <div>
        <div className="mx-auto flex h-(--storefront-header-height) max-w-7xl items-center gap-2 px-4">
          {/* Mobile menu */}
          <MobileNav user={user} categories={categories} />

          {/* Logo */}
          <Logo className="size-8" />

          {/* Nav links (desktop) */}
          <nav className="hidden items-center gap-0.5 lg:flex">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/services"
              aria-current={pathname === "/services" ? "page" : undefined}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground",
                pathname === "/services" ? "text-primary" : "text-foreground/80"
              )}
            >
              More Services
            </Link>
          </nav>

          {/* Cart (mobile; desktop has it in right actions) */}
          <CartIconLink count={cartCount} className="ml-auto size-10 lg:hidden" />

          {/* Right actions (desktop; mobile uses the bottom navigation) */}
          <div className="ml-auto hidden shrink-0 items-center gap-2 lg:flex">
            {/* Sticky header search, so search never needs a scroll back up. It
                fades out while the homepage hero search is on screen (no two
                search boxes at once) but keeps its space so nothing shifts. */}
            <div
              aria-hidden={!showSearch}
              inert={!showSearch}
              className={cn(
                "w-72 transition-opacity duration-200 xl:w-80",
                !showSearch && "pointer-events-none opacity-0",
              )}
            >
              <StorefrontSearchOverlay
                key={routeKey}
                categories={megaCategories}
                variant="field"
              />
            </div>
            <CartIconLink count={cartCount} />
            {user && dashboardHref(user.user_type, user.isStaff) !== "/" ? (
              <Link
                href={dashboardHref(user.user_type, user.isStaff)}
                aria-current={pathname?.startsWith(dashboardHref(user.user_type, user.isStaff)) ? "page" : undefined}
                className={cn(
                  "press flex h-9 items-center gap-2 rounded-lg px-2.5 text-sm font-semibold hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  pathname?.startsWith(dashboardHref(user.user_type, user.isStaff))
                    ? "text-primary"
                    : "text-foreground"
                )}
              >
                <HugeiconsIcon icon={DashboardSquare01Icon} strokeWidth={2} className="size-5" />
                Dashboard
              </Link>
            ) : null}
            {user ? (
              <Link
                href="/account"
                aria-current={pathname?.startsWith("/account") ? "page" : undefined}
                className={cn(
                  "press flex h-9 items-center gap-2 rounded-lg px-2.5 text-sm font-semibold hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  pathname?.startsWith("/account") ? "text-primary" : "text-foreground"
                )}
              >
                <HugeiconsIcon icon={UserIcon} strokeWidth={2} className="size-5" />
                My Account
              </Link>
            ) : (
              <Link href="/auth/login">
                <Button size="sm">Sign In</Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
