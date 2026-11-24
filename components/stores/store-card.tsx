import Image from "next/image"
import Link from "next/link"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
  DeliveryBox01Icon,
  Package01Icon,
  ShieldCheckIcon,
  ShoppingCart01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons"
import { formatRupees } from "@/lib/format"
import type { StoreProgramme } from "@/lib/stores"

/** Compact store card (Store tab list), mirroring the D2H Core card mockup. */
export function StoreCard({
  store,
  productCount,
  priority = false,
}: {
  store: StoreProgramme
  productCount: number
  priority?: boolean
}) {
  const stats = [
    { icon: Package01Icon, value: productCount > 0 ? `${productCount.toLocaleString("en-IN")}` : "—", label: "Products" },
    { icon: ShoppingCart01Icon, value: formatRupees(store.minOrderValue), label: "Min. Order Value" },
    { icon: UserGroupIcon, value: store.audience.split(" ")[0], label: store.audience.split(" ").slice(1).join(" ") || "Friendly" },
    { icon: ShieldCheckIcon, value: "Buyer", label: "Protection" },
  ]

  return (
    <article className="@container relative overflow-hidden rounded-2xl border border-brand-200 bg-card shadow-sm">
      <div className="relative flex items-center gap-3 overflow-hidden bg-gradient-to-r from-card via-brand-50 to-brand-100 p-4">
        <Image
          src={store.logo}
          alt=""
          width={56}
          height={56}
          priority={priority}
          className="size-14 shrink-0 rounded-xl border border-border bg-card object-contain p-2"
        />
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-1.5 text-lg font-extrabold tracking-tight">
            {store.name}
            <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2.2} className="size-5 text-primary" aria-label="Verified" />
          </h2>
          <p className="mt-1 inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
            <HugeiconsIcon icon={DeliveryBox01Icon} strokeWidth={2} className="size-3.5" />
            {store.badge}
          </p>
        </div>
        <HugeiconsIcon icon={DeliveryBox01Icon} strokeWidth={1.4} aria-hidden className="absolute -right-3 -bottom-4 size-24 text-primary/15" />
      </div>

      <dl className="mx-3 grid grid-cols-2 gap-y-2.5 rounded-xl border border-border bg-card py-2.5 @[22rem]:grid-cols-4 @[22rem]:gap-y-0 @[22rem]:divide-x @[22rem]:divide-border">
        {stats.map((stat) => (
          <div key={stat.label} className="flex flex-col items-center gap-0.5 px-1 text-center">
            <HugeiconsIcon icon={stat.icon} strokeWidth={1.8} className="size-5 text-primary" aria-hidden />
            <dd className="text-xs font-bold tabular-nums">{stat.value}</dd>
            <dt className="text-[10px] leading-tight text-muted-foreground">{stat.label}</dt>
          </div>
        ))}
      </dl>

      <div className="flex flex-col gap-3 p-4 @[24rem]:flex-row @[24rem]:items-end">
        <ul className="flex-1 space-y-1">
          {store.highlights.map((h) => (
            <li key={h} className="flex items-center gap-1.5 text-xs font-medium">
              <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} className="size-4 text-primary" />
              {h}
            </li>
          ))}
        </ul>
        <Link
          href={store.href}
          className="press inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-primary px-4 text-sm font-bold text-primary hover:bg-primary/5 after:absolute after:inset-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          View Store
          <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2.2} className="size-4" />
        </Link>
      </div>
    </article>
  )
}
