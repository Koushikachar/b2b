import { Suspense } from "react"
import Image from "next/image"
import Link from "next/link"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { getCachedHomeBanners, getCachedPromoEvents } from "@/lib/storefront-cache"
import { publicImageUrl } from "@/lib/storage"
import { UNDER_TILE_PRICES, underSlot, type UnderTilePrice } from "@/lib/admin/banner-slots"
import { PROMO_EVENT_THEMES, WINNING_COLLECTION, isPromoEventLive } from "@/lib/promotions"
import { SoftLink } from "@/components/storefront/soft-link"

type BannerRow = { slot: string; title: string | null; link_url: string | null; image_path: string }

/** Frame shared by the deal card and the tiles; the link inside fills it. */
const FRAME =
  "group relative overflow-hidden rounded-2xl border border-brand-200 bg-brand-50 shadow-xs transition-[border-color,box-shadow] hover:border-primary/60 hover:shadow-md"
const FILL_LINK =
  "press absolute inset-0 block focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset"

/**
 * Any-shape artwork shown whole: a blurred, enlarged copy fills the frame and
 * the sharp image sits on top uncropped — no empty bands, no cropping.
 */
function Artwork({ src, alt, sizes, priority = false }: { src: string; alt: string; sizes: string; priority?: boolean }) {
  return (
    <>
      <Image src={src} alt="" aria-hidden fill sizes={sizes} className="scale-125 object-cover opacity-70 blur-2xl" />
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes={sizes}
        className="object-contain transition-transform duration-500 group-hover:scale-[1.02]"
      />
    </>
  )
}

const DEAL_SIZES = "(min-width: 768px) 40vw, 40vw"

/**
 * Deal card, in priority order: the admin's "Home deal card" banner
 * (Dashboard → Banners), the live festival event, then the Select deals art.
 */
async function DealCard({ banner }: { banner: BannerRow | undefined }) {
  if (banner) {
    return (
      <Link href={banner.link_url || "/select"} className={FILL_LINK}>
        <Artwork
          src={publicImageUrl("banners", banner.image_path)}
          alt={banner.title ?? "Today's deal"}
          sizes={DEAL_SIZES}
          priority
        />
      </Link>
    )
  }

  const live = (await getCachedPromoEvents()).find((event) => isPromoEventLive(event))
  if (live) {
    const theme = PROMO_EVENT_THEMES[live.theme]
    return (
      <Link href={`/events/${live.key}`} className={FILL_LINK}>
        <Artwork
          src={theme.cardImage}
          alt={`${live.title} — ${theme.tagline(live.maxReward)}. ${theme.ctaLabel}`}
          sizes={DEAL_SIZES}
          priority
        />
      </Link>
    )
  }

  return (
    <Link
      href="/select"
      className={`${FILL_LINK} flex flex-col items-center justify-center gap-3 bg-linear-to-br from-brand-50 to-brand-100 p-4 text-center`}
    >
      <Image
        src={WINNING_COLLECTION.banner}
        alt=""
        width={WINNING_COLLECTION.bannerWidth}
        height={WINNING_COLLECTION.bannerHeight}
        priority
        sizes={DEAL_SIZES}
        className="h-auto w-full max-w-xs rounded-lg"
      />
      <span className="text-sm font-extrabold">D2H Select deals</span>
    </Link>
  )
}

/** Price label shared by both tile styles. */
function PriceMark({ price, onImage }: { price: UnderTilePrice; onImage: boolean }) {
  return (
    <span className="flex flex-col items-start gap-1">
      <span
        className={
          onImage
            ? "rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold tracking-[0.14em] text-brand-700 uppercase"
            : "rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold tracking-[0.14em] text-brand-700 uppercase sm:text-[11px]"
        }
      >
        Under
      </span>
      <span
        className={`text-[1.75rem] leading-none font-black tracking-tight tabular-nums sm:text-4xl ${onImage ? "text-white drop-shadow" : ""}`}
      >
        <span className={onImage ? "" : "text-primary"}>₹</span>
        {price}
      </span>
    </span>
  )
}

/**
 * Under ₹X tile. With an admin image: the artwork plus a gradient strip that
 * keeps the price readable. Without: the built-in design. Filters this page's
 * D2H Core catalogue in place (an admin-set link goes wherever it points).
 */
function UnderTile({ price, banner }: { price: UnderTilePrice; banner: BannerRow | undefined }) {
  const label = banner?.title ?? `Under ₹${price}`
  const content = banner ? (
    <>
      <Artwork src={publicImageUrl("banners", banner.image_path)} alt={label} sizes="(min-width: 768px) 28vw, 30vw" />
      <span className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 via-black/35 to-transparent p-3 pt-8 sm:p-4 sm:pt-10">
        <PriceMark price={price} onImage />
      </span>
    </>
  ) : (
    <span className="absolute inset-0 flex flex-col overflow-hidden bg-linear-to-br from-card via-card to-brand-100/70 p-3 sm:p-4">
      {/* Large faded ₹ watermark. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-2 -bottom-6 text-[7rem] leading-none font-black text-primary/[0.07] transition-transform duration-500 group-hover:-rotate-6 sm:text-[9rem]"
      >
        ₹
      </span>
      <span className="relative flex items-start justify-between gap-2">
        <PriceMark price={price} onImage={false} />
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-card text-foreground/50 shadow-xs ring-1 ring-brand-200 transition-colors group-hover:bg-primary group-hover:text-primary-foreground group-hover:ring-primary sm:size-8">
          <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2.4} aria-hidden className="size-4" />
        </span>
      </span>
    </span>
  )

  return banner?.link_url ? (
    <Link href={banner.link_url} aria-label={label} className={FILL_LINK}>
      {content}
    </Link>
  ) : (
    <SoftLink href={`/?maxPrice=${price}`} scrollToId="all-products" aria-label={label} className={FILL_LINK}>
      {content}
    </SoftLink>
  )
}

async function DealsRow() {
  const banners = (await getCachedHomeBanners()) as BannerRow[]
  const bySlot = (slot: string) => banners.find((banner) => banner.slot === slot)

  return (
    <>
      <div className={FRAME}>
        <DealCard banner={bySlot("deal")} />
      </div>
      <ul className="grid grid-cols-2 gap-2.5 sm:gap-3">
        {UNDER_TILE_PRICES.map((price) => (
          <li key={price} className={`${FRAME} min-h-24 sm:min-h-32`}>
            <UnderTile price={price} banner={bySlot(underSlot(price))} />
          </li>
        ))}
      </ul>
    </>
  )
}

function DealsRowSkeleton() {
  return (
    <>
      <div className="animate-pulse rounded-2xl bg-brand-100/60" />
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        {UNDER_TILE_PRICES.map((price) => (
          <div key={price} className="min-h-24 animate-pulse rounded-2xl bg-muted sm:min-h-32" />
        ))}
      </div>
    </>
  )
}

/**
 * Homepage deal card (left, 2 parts) + 2×2 "Under ₹X" tiles (right, 3 parts),
 * the same proportions on phones and desktop. The tiles set the row height;
 * the card stretches to match. Both are editable in Dashboard → Banners.
 */
export function HomeBannerActions() {
  return (
    <section aria-label="Deals" className="mx-auto w-full max-w-7xl px-4 py-5">
      <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-2.5 sm:gap-3">
        <Suspense fallback={<DealsRowSkeleton />}>
          <DealsRow />
        </Suspense>
      </div>
    </section>
  )
}
