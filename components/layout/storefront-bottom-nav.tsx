"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import {
  ArrowRight01Icon,
  CustomerSupportIcon,
  DashboardSquare01Icon,
  FavouriteIcon,
  GridViewIcon,
  Home01Icon,
  Menu01Icon,
  Package01Icon,
  ShoppingCart01Icon,
  Store01Icon,
  Tag01Icon,
  UserIcon,
} from "@hugeicons/core-free-icons"
import { cn } from "cn"
import { dashboardHref, isStorefrontTabActive } from "@/lib/nav"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { StorefrontSearchForm } from "@/components/storefront/storefront-search-form"

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

/** Ignore browser-chrome deltas; only lift for a real software keyboard. */
const KEYBOARD_MIN_INSET = 120

type KeyboardViewport = { inset: number; height: number }

const CLOSED_VIEWPORT: KeyboardViewport = { inset: 0, height: 0 }

/**
 * Software-keyboard geometry for fixed bottom sheets.
 *
 * A fixed bottom sheet is anchored to the layout viewport, which iOS Safari
 * (and Chromium with `resizes-visual`) does not shrink when the keyboard
 * opens. The inset lifts the sheet above the keyboard, and the height caps it
 * to the visible area so it can grow upward for suggestions without escaping
 * the screen.
 */
function useKeyboardViewport(active: boolean) {
  const [viewport, setViewport] = useState<KeyboardViewport>(CLOSED_VIEWPORT)

  useEffect(() => {
    if (!active) return
    const visualViewport = window.visualViewport
    if (!visualViewport) return

    let frame = 0
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const gap =
          window.innerHeight - visualViewport.height - visualViewport.offsetTop
        const next = {
          inset: gap > KEYBOARD_MIN_INSET ? Math.round(gap) : 0,
          height: Math.round(visualViewport.height),
        }
        setViewport((previous) =>
          previous.inset === next.inset && previous.height === next.height
            ? previous
            : next
        )
      })
    }

    update()
    visualViewport.addEventListener("resize", update)
    visualViewport.addEventListener("scroll", update)
    return () => {
      cancelAnimationFrame(frame)
      visualViewport.removeEventListener("resize", update)
      visualViewport.removeEventListener("scroll", update)
    }
  }, [active])

  return active ? viewport : CLOSED_VIEWPORT
}

type MoreLink = { label: string; href: string; icon: IconSvgElement }

/**
 * "More" tab: a bottom sheet with search on top and the secondary
 * destinations below. The shell persists across navigation, so the parent
 * remounts this component (keyed by route + query) and an open sheet closes as
 * soon as the buyer navigates.
 */
function MoreSheet({ active, user }: { active: boolean; user: User }) {
  const [open, setOpen] = useState(false)
  const keyboard = useKeyboardViewport(open)

  const links: MoreLink[] = [
    { label: "All Products", href: "/products", icon: Package01Icon },
    { label: "Categories", href: "/categories", icon: GridViewIcon },
    { label: "D2H Select deals", href: "/select", icon: Tag01Icon },
    { label: "Suppliers", href: "/suppliers", icon: Store01Icon },
    ...(user
      ? [
          { label: "My Orders", href: "/orders", icon: Package01Icon },
          { label: "Wishlist", href: "/account/wishlist", icon: FavouriteIcon },
          { label: "Contact Us", href: "/account/contact", icon: CustomerSupportIcon },
        ]
      : []),
  ]
  const workspace = user ? dashboardHref(user.user_type, user.isStaff) : "/"
  if (workspace !== "/") {
    links.push({ label: "Workspace dashboard", href: workspace, icon: DashboardSquare01Icon })
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <button
            type="button"
            aria-current={active ? "page" : undefined}
            className={itemClass(active || open)}
          />
        }
      >
        <ItemContent icon={Menu01Icon} label="More" active={active || open} />
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="max-h-[85dvh] overflow-y-auto rounded-t-2xl pb-(--safe-area-bottom)"
        style={{
          bottom: keyboard.inset > 0 ? keyboard.inset : undefined,
          maxHeight: keyboard.height > 0 ? keyboard.height : undefined,
        }}
      >
        <SheetHeader>
          <SheetTitle>More</SheetTitle>
        </SheetHeader>
        <div className="px-4 pb-6">
          <StorefrontSearchForm inlineSuggestions />
          <ul className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="press flex min-h-12 items-center gap-3 px-4 text-sm font-medium hover:bg-muted/60"
                >
                  <HugeiconsIcon icon={link.icon} strokeWidth={1.8} className="size-5 text-foreground/80" />
                  <span className="flex-1">{link.label}</span>
                  <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-4 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
          {!user ? (
            <Link
              href="/auth/login"
              onClick={() => setOpen(false)}
              className="press mt-4 flex h-11 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground hover:bg-brand-dark"
            >
              Sign in
            </Link>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
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
  // "More" holds search + catalogue destinations.
  const moreActive =
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

        <MoreSheet
          key={`${pathname}?${searchParams.toString()}`}
          active={moreActive}
          user={user}
        />
      </nav>
    </div>
  )
}
