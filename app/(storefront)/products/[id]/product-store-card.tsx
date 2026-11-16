import Image from "next/image"
import Link from "next/link"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import {
  ArrowRight01Icon,
  Building02Icon,
  CheckmarkBadge01Icon,
  CubeIcon,
  Location01Icon,
  ShoppingCart01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons"
import { formatRupees } from "@/lib/format"
import { publicImageUrl } from "@/lib/storage"
import { getStoreProgramme } from "@/lib/stores"

export type StoreCardSupplier = {
  id: string
  business_name: string
  city: string | null
  state: string | null
  logo_path: string | null
}

type CardModel = {
  name: string
  href: string
  logo: { src: string; programme: boolean } | null
  badge: { icon: IconSvgElement; label: string }
  stats: { icon: IconSvgElement; value: string; label: string }[]
}

/** Programme stores (D2H Core…) use their own copy; otherwise the supplier. */
function cardModel(supplier: StoreCardSupplier, storeSlug: string | null): CardModel {
  const programme = storeSlug ? getStoreProgramme(storeSlug) : null
  if (programme) {
    const [lead, ...rest] = programme.audience.split(" ")
    return {
      name: programme.name,
      href: programme.href,
      logo: { src: programme.logo, programme: true },
      badge: { icon: CubeIcon, label: programme.badge },
      stats: [
        { icon: ShoppingCart01Icon, value: formatRupees(programme.minOrderValue), label: "Min. Order" },
        { icon: UserGroupIcon, value: lead, label: rest.join(" ") },
      ],
    }
  }
  const location = [supplier.city, supplier.state].filter(Boolean).join(", ")
  return {
    name: supplier.business_name,
    href: `/store/${supplier.id}`,
    logo: supplier.logo_path
      ? { src: publicImageUrl("company_logos", supplier.logo_path), programme: false }
      : null,
    badge: { icon: Location01Icon, label: location || "Verified supplier" },
    stats: [],
  }
}

export function ProductStoreCard({
  supplier,
  storeSlug = null,
}: {
  supplier: StoreCardSupplier
  storeSlug?: string | null
}) {
  const card = cardModel(supplier, storeSlug)

  return (
    <section aria-labelledby="store-information-heading">
      <h2
        id="store-information-heading"
        className="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
      >
        Store Information
      </h2>
      {/* Compact rectangle; the whole card links to the store. */}
      <Link
        href={card.href}
        className="group mt-2 block rounded-lg border border-brand-200 bg-card p-3 shadow-xs transition-[border-color,box-shadow] hover:border-primary/60 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <span className="flex items-center gap-3">
          <span className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-card">
            {card.logo ? (
              <Image
                src={card.logo.src}
                alt=""
                fill
                sizes="48px"
                className={card.logo.programme ? "object-contain p-0.5" : "object-cover"}
              />
            ) : (
              <HugeiconsIcon icon={Building02Icon} strokeWidth={2} className="size-5 text-muted-foreground" />
            )}
          </span>
          <span className="flex min-w-0 flex-1 flex-col items-start gap-1">
            <span className="flex min-w-0 items-center gap-1">
              <span className="truncate text-base leading-tight font-bold tracking-tight">{card.name}</span>
              <HugeiconsIcon
                icon={CheckmarkBadge01Icon}
                strokeWidth={2}
                className="size-4 shrink-0 text-primary"
                aria-label="Verified"
              />
            </span>
            <span className="inline-flex max-w-full items-center gap-1 rounded-md bg-brand-50 px-1.5 py-0.5 text-[11px] font-semibold text-foreground">
              <HugeiconsIcon icon={card.badge.icon} strokeWidth={2} className="size-3 shrink-0" />
              <span className="truncate">{card.badge.label}</span>
            </span>
          </span>
          <HugeiconsIcon
            icon={ArrowRight01Icon}
            strokeWidth={2}
            className="size-5 shrink-0 text-foreground/60 transition-transform group-hover:translate-x-0.5"
          />
        </span>

        {card.stats.length > 0 ? (
          <dl className="mt-2.5 grid grid-cols-2 divide-x divide-brand-200 rounded-md bg-brand-50 py-2">
            {card.stats.map((stat) => (
              <div key={stat.label} className="flex items-center justify-center gap-2 px-2">
                <HugeiconsIcon icon={stat.icon} strokeWidth={1.8} className="size-4 shrink-0 text-primary" aria-hidden />
                <div className="min-w-0 leading-tight">
                  <dd className="truncate text-sm font-bold tabular-nums">{stat.value}</dd>
                  <dt className="truncate text-[11px] text-muted-foreground">{stat.label}</dt>
                </div>
              </div>
            ))}
          </dl>
        ) : null}
      </Link>
    </section>
  )
}
