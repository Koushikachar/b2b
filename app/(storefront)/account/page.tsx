import Link from "next/link"
import { redirect } from "next/navigation"
import type { Metadata } from "next"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import {
  ArrowRight01Icon,
  Call02Icon,
  CreditCardIcon,
  CustomerSupportIcon,
  DashboardSquare01Icon,
  FavouriteIcon,
  Invoice01Icon,
  Location01Icon,
  Mail01Icon,
  Notification01Icon,
  Package01Icon,
  PencilEdit02Icon,
  SecurityCheckIcon,
  Share08Icon,
  Store01Icon,
  File01Icon,
  Clock01Icon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons"
import { createClient } from "@/lib/supabase/server"
import { getSessionUser } from "@/lib/auth/session"
import { BUSINESS_TYPES } from "@/lib/buyer/business-type"
import { dashboardHref } from "@/lib/nav"
import { SITE_URL } from "@/lib/site"
import {
  displayName,
  getBuyerProfile,
  getWallet,
} from "@/lib/buyer/account-queries"
import { AccountAvatar } from "@/components/account/account-avatar"
import { LogoutButton } from "@/components/account/logout-button"
import { ShareAppRow } from "@/components/account/share-app-row"
import { Logo } from "@/components/layout/logo"
import { CartIconLink } from "@/components/storefront/cart-icon-link"

export const metadata: Metadata = {
  title: "My Account",
  description: "Your Direct2Hub profile, wallet, orders, wishlist and account settings.",
  robots: { index: false, follow: false },
}

/** Old `?tab=` deep links (account menu, recently-viewed rail) keep working. */
const LEGACY_TABS: Record<string, string> = {
  saved: "/account/wishlist",
  recent: "/account/recent",
  addresses: "/account/addresses",
}

type MenuItem = { label: string; href: string; icon: IconSvgElement }

const MENU: MenuItem[] = [
  { label: "Address Book", href: "/account/addresses", icon: Location01Icon },
  { label: "GST Details", href: "/account/gst", icon: Invoice01Icon },
  { label: "Payments & Refunds", href: "/account/payments", icon: CreditCardIcon },
  { label: "Account Statement", href: "/account/statement", icon: File01Icon },
  { label: "Recently Viewed", href: "/account/recent", icon: Clock01Icon },
  { label: "Account Privacy", href: "/account/privacy", icon: SecurityCheckIcon },
]

const MENU_TAIL: MenuItem[] = [
  { label: "Contact Us", href: "/contact", icon: CustomerSupportIcon },
  { label: "Notifications", href: "/account/notifications", icon: Notification01Icon },
]

const ROW =
  "press flex min-h-13 w-full items-center gap-3 px-4 text-left text-[15px] font-medium sm:min-h-14 sm:gap-4 sm:px-5 sm:text-base text-foreground hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none"

function RowBody({ item }: { item: Pick<MenuItem, "label" | "icon"> }) {
  return (
    <>
      <HugeiconsIcon icon={item.icon} strokeWidth={1.8} className="size-6 shrink-0 text-foreground/80" />
      <span className="flex-1">{item.label}</span>
      <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-5 text-muted-foreground" />
    </>
  )
}

function formatPhone(phone: string): string {
  return `+91 ${phone.slice(0, 5)} ${phone.slice(5)}`
}

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab } = await searchParams
  if (tab && LEGACY_TABS[tab]) redirect(LEGACY_TABS[tab])

  const supabase = await createClient()
  const user = await getSessionUser(supabase)
  if (!user) redirect("/auth/login?next=/account")

  const [profile, wallet] = await Promise.all([
    getBuyerProfile(supabase, user.id, user.email),
    getWallet(supabase, user.id, 0),
  ])
  const name = displayName(profile)
  const businessLabel = BUSINESS_TYPES.find((type) => type.value === profile.businessType)?.label ?? null
  const workspace = dashboardHref(user.user_type, user.isStaff)

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-5">
      <h1 className="sr-only">My Account</h1>
      {/* Mobile app bar (the storefront header is desktop-only). */}
      <div className="-mt-1 mb-3 flex items-center justify-between lg:hidden">
        <Logo className="h-9 w-auto" />
        <div className="flex items-center gap-1">
          <Link
            href="/account/notifications"
            aria-label="Notifications"
            className="press flex size-10 items-center justify-center rounded-lg text-foreground hover:bg-muted"
          >
            <HugeiconsIcon icon={Notification01Icon} strokeWidth={2} className="size-6" />
          </Link>
          <CartIconLink count={0} className="size-10" />
        </div>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:items-start lg:gap-6">
        <div className="flex flex-col gap-4">
          {/* 1. Profile card */}
          <section
            aria-label="Profile"
            className="flex min-w-0 items-center gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-sm sm:gap-4 sm:p-5"
          >
            <AccountAvatar path={profile.avatarPath} name={name} priority className="size-16 sm:size-20" />
            <div className="hidden h-16 w-px shrink-0 bg-border min-[380px]:block" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-bold tracking-tight sm:text-xl">{name}</p>
              <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                <HugeiconsIcon icon={Call02Icon} strokeWidth={2} className="size-4 shrink-0" />
                {profile.phone ? (
                  <span className="truncate tabular-nums">{formatPhone(profile.phone)}</span>
                ) : (
                  <Link href="/account/profile" className="font-medium text-primary hover:underline">
                    Add mobile number
                  </Link>
                )}
              </p>
              <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                <HugeiconsIcon icon={Mail01Icon} strokeWidth={2} className="size-4 shrink-0" />
                <span className="truncate">{profile.email}</span>
              </p>
              <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                <HugeiconsIcon icon={Store01Icon} strokeWidth={2} className="size-4 shrink-0" />
                {businessLabel ? (
                  <span className="truncate">{businessLabel}</span>
                ) : (
                  <Link href="/account/profile" className="font-medium text-primary hover:underline">
                    Tell us what describes you
                  </Link>
                )}
              </p>
            </div>
            <Link
              href="/account/profile"
              aria-label="Edit profile"
              className="press flex size-10 shrink-0 items-center justify-center self-start rounded-xl bg-primary/10 text-primary hover:bg-primary/15 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={2} className="size-5" />
            </Link>
          </section>

          {/* Mobile only: desktop reaches the dashboard from the header. */}
          {workspace !== "/" ? (
            <Link
              href={workspace}
              className="press flex h-16 min-w-0 items-center gap-3 rounded-2xl border border-primary/40 bg-primary/5 px-4 shadow-sm hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none lg:hidden"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <HugeiconsIcon icon={DashboardSquare01Icon} strokeWidth={2} className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base font-bold text-foreground">
                  {workspace.startsWith("/admin") ? "Admin dashboard" : "Supplier dashboard"}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {workspace.startsWith("/admin")
                    ? "Categories, banners and products"
                    : "Products, orders and analytics"}
                </span>
              </span>
              <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-5 shrink-0 text-primary" />
            </Link>
          ) : null}

          {/* 2. Wallet */}
          <Link
            href="/account/wallet"
            className="press relative flex h-16 min-w-0 items-center gap-2.5 overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-destructive px-4 sm:h-[4.5rem] sm:gap-3 sm:px-5 text-primary-foreground shadow-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            <span aria-hidden className="absolute -bottom-10 left-10 h-20 w-48 rounded-[100%] bg-white/10" />
            <HugeiconsIcon icon={Wallet01Icon} strokeWidth={1.8} className="relative size-7 shrink-0 sm:size-8" />
            <span className="relative min-w-0 flex-1 truncate text-base font-bold tracking-tight sm:text-lg">Direct2Hub Wallet</span>
            <span aria-hidden className="relative hidden h-9 w-px bg-white/40 min-[380px]:block" />
            <span className="relative shrink-0 rounded-xl bg-card px-3 py-1 text-lg font-extrabold sm:px-4 sm:py-1.5 sm:text-xl tracking-tight text-destructive tabular-nums">
              ₹{wallet.balance.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
            </span>
          </Link>

          {/* 3. Orders & Wishlist */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Orders", href: "/orders", icon: Package01Icon },
              { label: "Wishlist", href: "/account/wishlist", icon: FavouriteIcon },
            ].map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className="press flex h-14 min-w-0 items-center gap-2 rounded-xl border border-border bg-card px-3 shadow-sm sm:h-16 sm:gap-3 sm:px-4 hover:border-brand-300 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <HugeiconsIcon icon={card.icon} strokeWidth={1.8} className="size-6 shrink-0 text-primary sm:size-7" />
                <span className="min-w-0 flex-1 truncate text-sm font-bold sm:text-base">{card.label}</span>
                <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-4 shrink-0 text-muted-foreground sm:size-5" />
              </Link>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {/* 4. Account management */}
          <nav
            aria-label="Account settings"
            className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
          >
            <ul className="divide-y divide-border">
              {MENU.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={ROW}>
                    <RowBody item={item} />
                  </Link>
                </li>
              ))}
              <li>
                <ShareAppRow url={SITE_URL} title="Direct2Hub" className={ROW}>
                  <RowBody item={{ label: "Share the App", icon: Share08Icon }} />
                </ShareAppRow>
              </li>
              {MENU_TAIL.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={ROW}>
                    <RowBody item={item} />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* 5. Logout */}
          <LogoutButton />
        </div>
      </div>
    </div>
  )
}
