import { Suspense } from "react"
import Image from "next/image"
import Link from "next/link"
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

/**
 * Built-in art drawn for each layout: `/promos/<name>-mobile.webp` below md
 * (portrait card, square tiles), `/promos/<name>-desktop.webp` from md up
 * (landscape card, wide tiles). Fills the frame; the art already matches it.
 * Served as-is, not through the image optimizer: the files are pre-sized at
 * 2x and its q75 re-encode + downsizing blurred the lettering in the art.
 */
function ResponsiveArt({ name, alt }: { name: string; alt: string }) {
  return (
    <picture>
      <source media="(min-width: 768px)" srcSet={`/promos/${name}-desktop.webp`} />
      <img
        src={`/promos/${name}-mobile.webp`}
        alt={alt}
        fetchPriority="high"
        className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
      />
    </picture>
  )
}

const DEAL_SIZES = "(min-width: 768px) 42vw, 36vw"
const TILE_SIZES = "(min-width: 768px) 28vw, 27vw"
const TILE_ASPECT = "aspect-square md:aspect-16/5"

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
        <ResponsiveArt
          name={theme.homeArt}
          alt={`${live.title} — ${theme.tagline(live.maxReward)}. ${theme.ctaLabel}`}
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

/** Price label over an admin-uploaded tile image. */
function PriceMark({ price }: { price: UnderTilePrice }) {
  return (
    <span className="flex flex-col items-start gap-1">
      <span className="rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold tracking-[0.14em] text-brand-700 uppercase">
        Under
      </span>
      <span className="text-[1.75rem] leading-none font-black tracking-tight text-white tabular-nums drop-shadow sm:text-4xl">
        ₹{price}
      </span>
    </span>
  )
}

/**
 * Under ₹X tile. With an admin image: the artwork plus a gradient strip that
 * keeps the price readable. Without: the built-in artwork (price is drawn in).
 * Filters this page's D2H Core catalogue in place (an admin-set link goes
 * wherever it points).
 */
function UnderTile({ price, banner }: { price: UnderTilePrice; banner: BannerRow | undefined }) {
  const label = banner?.title ?? `Under ₹${price}`
  const content = banner ? (
    <>
      <Artwork src={publicImageUrl("banners", banner.image_path)} alt={label} sizes={TILE_SIZES} />
      <span className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 via-black/35 to-transparent p-3 pt-8 sm:p-4 sm:pt-10">
        <PriceMark price={price} />
      </span>
    </>
  ) : (
    <ResponsiveArt name={`tile-under-${price}`} alt={label} />
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
          <li key={price} className={`${FRAME} ${TILE_ASPECT}`}>
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
          <div key={price} className={`${TILE_ASPECT} animate-pulse rounded-2xl bg-muted`} />
        ))}
      </div>
    </>
  )
}

/**
 * Homepage deal card + 2×2 "Under ₹X" tiles. Phones: tall card beside square
 * tiles (2:3). Desktop: wide card beside wide 16:5 tiles (3:4). The tiles set
 * the row height; the card stretches to match. Editable in Dashboard → Banners.
 */
export function HomeBannerActions() {
  return (
    <section aria-label="Deals" className="mx-auto w-full max-w-7xl px-4 py-5">
      <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-2.5 sm:gap-3 md:grid-cols-[minmax(0,3fr)_minmax(0,4fr)] md:gap-4">
        <Suspense fallback={<DealsRowSkeleton />}>
          <DealsRow />
        </Suspense>
      </div>
    </section>
  )
}
