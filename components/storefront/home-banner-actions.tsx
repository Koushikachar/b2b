import { Suspense } from "react"
import Image from "next/image"
import Link from "next/link"
import { HugeiconsIcon } from "@hugeicons/react"
import { Add01Icon } from "@hugeicons/core-free-icons"
import { getCachedPromoEvents } from "@/lib/storefront-cache"
import {
  PROMO_EVENT_THEMES,
  WINNING_COLLECTION,
  isPromoEventLive,
  parsePriceLimit,
} from "@/lib/promotions"

const QUICK_ACTIONS = [9, 49, 99, 199] as const

/** Price shortcuts open the matching D2H Select page when one exists. */
function quickActionHref(amount: number): string {
  return parsePriceLimit(String(amount))
    ? `/select/under/${amount}`
    : `/products?maxPrice=${amount}`
}

/**
 * Banner slot: the live festival event's artwork (e.g. Light a Diya), or the
 * D2H Select deals banner when no event is running. One cached lookup.
 */
async function HomePromoBanner() {
  const events = await getCachedPromoEvents()
  const live = events.find((event) => isPromoEventLive(event))

  if (live) {
    const theme = PROMO_EVENT_THEMES[live.theme]
    return (
      <Link
        href={`/events/${live.key}`}
        className="press absolute inset-0 block focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset"
      >
        <Image
          src={theme.cardImage}
          alt={`${live.title} — ${theme.tagline(live.maxReward)}. ${theme.ctaLabel}`}
          fill
          priority
          sizes="(min-width: 1280px) 500px, 40vw"
          className="object-cover object-center md:object-contain"
        />
      </Link>
    )
  }

  return (
    <Link
      href="/select"
      className="press absolute inset-0 flex flex-col items-center justify-center gap-2 p-3 text-center focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset sm:p-5"
    >
      <Image
        src={WINNING_COLLECTION.banner}
        alt=""
        width={WINNING_COLLECTION.bannerWidth}
        height={WINNING_COLLECTION.bannerHeight}
        priority
        sizes="(min-width: 1280px) 400px, 36vw"
        className="h-auto w-full max-w-[320px] rounded-md"
      />
      <span className="text-xs font-bold text-foreground sm:text-sm">D2H Select deals</span>
      <span className="rounded-md bg-primary px-3 py-1 text-[11px] font-bold text-primary-foreground sm:text-xs">
        Shop now
      </span>
    </Link>
  )
}

function BannerPlaceholder() {
  return <div aria-hidden className="absolute inset-0 animate-pulse bg-brand-100/60" />
}

/**
 * Homepage banner + price shortcuts.
 *
 * The banner shows the live festival event (or the D2H Select deals); the
 * four shortcuts open the matching "Under ₹X" listing.
 */
export function HomeBannerActions() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-5">
      <div className="flex gap-2.5">
        <div className="relative w-2/5 shrink-0 overflow-hidden rounded-xl border border-brand-200 bg-brand-50">
          <Suspense fallback={<BannerPlaceholder />}>
            <HomePromoBanner />
          </Suspense>
        </div>

        <div className="flex-1 grid grid-cols-2 gap-2.5">
          {QUICK_ACTIONS.map((amount) => (
            <Link
              key={amount}
              href={quickActionHref(amount)}
              className="press group relative flex min-h-24 flex-col justify-center rounded-xl border border-brand-200 bg-card px-3 py-3 text-center hover:border-brand-300 hover:bg-brand-50/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset sm:min-h-28"
            >
              <HugeiconsIcon
                icon={Add01Icon}
                strokeWidth={2}
                aria-hidden="true"
                className="absolute top-2 right-2 size-3.5 text-brand-400 transition-colors group-hover:text-brand-600"
              />
              <span className="text-[11px] font-medium text-brand-700 sm:text-xs">
                Shop under
              </span>
              <span className="mt-0.5 text-xl font-bold tracking-tight text-foreground tabular-nums sm:text-2xl">
                ₹{amount}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
