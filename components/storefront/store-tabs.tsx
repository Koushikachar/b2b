"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import {
  CrownIcon,
  Layers01Icon,
  PackageIcon,
  TruckDeliveryIcon,
} from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"

type StoreTab = {
  id: string
  /** Short brand name on the card ("Core"); `fullName` is for screen readers. */
  name: string
  fullName: string
  icon: IconSvgElement
  /** null = not open yet ("Soon"). */
  href: string | null
}

/** The store brands inside Direct2Hub. Core and Select are live. */
const STORE_TABS: StoreTab[] = [
  { id: "core", name: "Core", fullName: "D2H Core", icon: Layers01Icon, href: "/" },
  { id: "select", name: "Select", fullName: "D2H Select", icon: CrownIcon, href: "/select" },
  { id: "package", name: "Package", fullName: "Ecom Package", icon: PackageIcon, href: null },
  { id: "dropship", name: "Dropship", fullName: "Dropship", icon: TruckDeliveryIcon, href: null },
]

function isActiveTab(tab: StoreTab, pathname: string): boolean {
  if (tab.id === "core") return pathname === "/"
  if (tab.id === "select") return pathname === "/select" || pathname.startsWith("/select/")
  return false
}

// Icon over name, as in the store-brands design; a touch smaller on desktop.
const CARD =
  "relative flex h-full flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2.5 transition-[background-color,box-shadow] sm:gap-1.5 sm:py-3 lg:gap-1 lg:py-2.5"

function CardBody({ tab, soon }: { tab: StoreTab; soon: boolean }) {
  return (
    <>
      <HugeiconsIcon
        icon={tab.icon}
        strokeWidth={2.2}
        aria-hidden
        className="size-7 shrink-0 text-primary drop-shadow-[0_2px_3px_color-mix(in_oklch,var(--primary)_35%,transparent)] sm:size-8 lg:size-7"
      />
      <span className="w-full truncate text-center text-sm leading-tight font-extrabold tracking-tight text-foreground sm:text-base">
        {tab.name}
      </span>
      {soon ? (
        <span className="absolute top-1.5 right-1.5 rounded-md bg-card/90 px-1 text-[9px] font-bold tracking-wide text-muted-foreground uppercase">
          Soon
        </span>
      ) : null}
    </>
  )
}

/** Store brand switcher shown above every storefront page. */
export function StoreTabs() {
  const pathname = usePathname() ?? "/"
  return (
    <nav aria-label="Stores inside Direct2Hub" className="border-b border-border bg-card">
      <ul className="mx-auto grid w-full max-w-7xl grid-cols-4 gap-2 px-4 py-2.5 sm:gap-3 sm:py-3">
        {STORE_TABS.map((tab) => {
          const active = isActiveTab(tab, pathname)
          return (
            <li key={tab.id} className="min-w-0">
              {tab.href ? (
                <Link
                  href={tab.href}
                  aria-label={tab.fullName}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    CARD,
                    "press focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    active
                      ? "bg-brand-100 shadow-sm ring-2 ring-primary/70"
                      : "bg-brand-50 hover:bg-brand-100/70",
                  )}
                >
                  <CardBody tab={tab} soon={false} />
                </Link>
              ) : (
                <div
                  aria-disabled="true"
                  title={`${tab.fullName} — coming soon`}
                  className={cn(CARD, "bg-brand-50/70 opacity-80")}
                >
                  <CardBody tab={tab} soon />
                  <span className="sr-only">{tab.fullName}, coming soon</span>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
