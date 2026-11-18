"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

type StoreTab = {
  id: string
  /** Short brand name on the card ("Core"); `fullName` is for screen readers. */
  name: string
  fullName: string
  /** Brand icon in public/stores (transparent WebP, 128px tall). */
  icon: { src: string; width: number }
  /** null = not open yet ("Soon"). */
  href: string | null
}

/** The store brands inside Direct2Hub. Core and Select are live. */
const STORE_TABS: StoreTab[] = [
  { id: "core", name: "Core", fullName: "D2H Core", icon: { src: "/stores/store-core.webp", width: 118 }, href: "/" },
  { id: "select", name: "Select", fullName: "D2H Select", icon: { src: "/stores/store-select.webp", width: 179 }, href: "/select" },
  { id: "package", name: "Package", fullName: "Ecom Package", icon: { src: "/stores/store-package.webp", width: 122 }, href: null },
  { id: "dropship", name: "Dropship", fullName: "Dropship", icon: { src: "/stores/store-dropship.webp", width: 190 }, href: null },
]

function isActiveTab(tab: StoreTab, pathname: string): boolean {
  if (tab.id === "core") return pathname === "/"
  if (tab.id === "select") return pathname === "/select" || pathname.startsWith("/select/")
  return false
}

// White card, brand icon over the name (store-brands design); the active
// store gets an orange border. A touch smaller on desktop.
const CARD =
  "relative flex h-full flex-col items-center justify-center gap-1 rounded-2xl border bg-card px-1 py-2.5 shadow-xs transition-[border-color,box-shadow] sm:gap-1.5 sm:py-3 lg:gap-1 lg:py-2.5"

function CardBody({ tab, soon }: { tab: StoreTab; soon: boolean }) {
  return (
    <>
      <Image
        src={tab.icon.src}
        alt=""
        aria-hidden
        width={tab.icon.width}
        height={128}
        priority
        unoptimized
        className="h-7 w-auto shrink-0 sm:h-8 lg:h-7"
      />
      <span className="w-full truncate text-center text-sm leading-tight font-extrabold tracking-tight text-foreground sm:text-base">
        {tab.name}
      </span>
      {soon ? (
        <span className="absolute top-1.5 right-1.5 rounded-md border border-border bg-card px-1 text-[10px] font-bold tracking-wide text-foreground/70 uppercase shadow-xs">
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
                      ? "border-primary shadow-sm ring-1 ring-primary"
                      : "border-border hover:border-primary/50",
                  )}
                >
                  <CardBody tab={tab} soon={false} />
                </Link>
              ) : (
                <div
                  aria-disabled="true"
                  title={`${tab.fullName} — coming soon`}
                  className={cn(CARD, "border-border opacity-80")}
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
