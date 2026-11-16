"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import {
  Home01Icon,
  Menu01Icon,
  ShoppingCart01Icon,
  Store01Icon,
  UserIcon,
} from "@hugeicons/core-free-icons"
import { cn } from "cn"
import { isStorefrontTabActive } from "@/lib/nav"

type User = { email: string; user_type: string; isStaff?: boolean } | null

function itemClass(active: boolean): string {
  return cn(
    "relative flex min-w-0 flex-1 press touch-manipulation flex-col items-center justify-center gap-0.5 px-0.5 text-xs font-medium tracking-tight whitespace-nowrap",
    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset",
    active
      ? "font-semibold text-brand-700"
      : "text-muted-foreground hover:text-foreground"
  )
}

function ItemContent({
  icon,
  label,
  active,
}: {
  icon: IconSvgElement
  label: string
  active: boolean
}) {
  return (
    <>
      <HugeiconsIcon
        icon={icon}
        strokeWidth={active ? 2.4 : 2}
        className={cn("size-6", active ? "text-primary" : undefined)}
      />
      <span>{label}</span>
    </>
  )
}

export function StorefrontBottomNav({
  user,
  cartCount = 0,
}: {
  user: User
  cartCount?: number
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const hasSearch =
    Boolean(searchParams.get("q")) || Boolean(searchParams.get("img"))

  const homeActive = isStorefrontTabActive("home", pathname)
  const storeActive = isStorefrontTabActive("store", pathname)
  const cartActive = pathname === "/cart"
  const accountActive = isStorefrontTabActive("account", pathname)
  // "More" opens More Services, which also carries search + catalogue links.
  const moreActive =
    pathname === "/services" ||
    isStorefrontTabActive("products", pathname, hasSearch) ||
    isStorefrontTabActive("search", pathname, hasSearch) ||
    isStorefrontTabActive("categories", pathname)

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 overflow-hidden bg-card pb-(--safe-area-bottom) shadow-[0_-4px_16px_-8px_color-mix(in_oklch,var(--foreground)_18%,transparent)] before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-border before:content-[''] lg:hidden">
      <nav
        aria-label="Storefront"
        className="mx-auto flex h-(--bottom-nav-height) max-w-7xl items-stretch"
      >
        <Link
          href="/"
          aria-current={homeActive ? "page" : undefined}
          className={itemClass(homeActive)}
        >
          <ItemContent icon={Home01Icon} label="Home" active={homeActive} />
        </Link>

        <Link
          href="/stores"
          aria-current={storeActive ? "page" : undefined}
          className={itemClass(storeActive)}
        >
          <ItemContent icon={Store01Icon} label="Store" active={storeActive} />
        </Link>

        <Link
          href="/cart"
          aria-label={cartCount > 0 ? `Cart, ${cartCount} items` : "Cart"}
          aria-current={cartActive ? "page" : undefined}
          className={itemClass(cartActive)}
        >
          <span className="relative">
            <HugeiconsIcon
              icon={ShoppingCart01Icon}
              strokeWidth={cartActive ? 2.4 : 2}
              className={cn("size-6", cartActive ? "text-primary" : undefined)}
            />
            {cartCount > 0 ? (
              <span className="absolute -top-1.5 -right-2 flex min-w-4 items-center justify-center rounded-sm bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            ) : null}
          </span>
          <span>Cart</span>
        </Link>

        <Link
          href={user ? "/account" : "/auth/login?next=/account"}
          aria-current={accountActive ? "page" : undefined}
          className={itemClass(accountActive)}
        >
          <ItemContent icon={UserIcon} label="My Account" active={accountActive} />
        </Link>

        <Link
          href="/services"
          aria-current={moreActive ? "page" : undefined}
          className={itemClass(moreActive)}
        >
          <ItemContent icon={Menu01Icon} label="More" active={moreActive} />
        </Link>
      </nav>
    </div>
  )
}
