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
 * Admin upload (Dashboard → Banners): one image for every device, covering its
 * box edge to edge. The deal card is wide on every device, so a wide banner
 * fills it fully; a shape that differs is trimmed at the edges.
 */
function Artwork({ src, alt, sizes, priority = false }: { src: string; alt: string; sizes: string; priority?: boolean }) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      priority={priority}
      sizes={sizes}
      className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
    />
  )
}

/**
 * Pre-resized built-in art on disk (`/promos/<name>-<variant>-<w>.webp`). The
 * deal card is wide on phones too, so it uses the wide (desktop) art there.
 */
const ART = {
  tile: {
    mobile: { variant: "mobile", widths: [128, 256, 480] },
    desktop: { variant: "desktop", widths: [400, 780] },
    sizes: "(min-width: 768px) 28vw, 48vw",
  },
  card: {
    mobile: { variant: "desktop", widths: [600, 1160] },
    desktop: { variant: "desktop", widths: [600, 1160] },
    sizes: "(min-width: 768px) 42vw, 100vw",
  },
}

const srcSet = (name: string, { variant, widths }: { variant: string; widths: number[] }) =>
  widths.map((w) => `/promos/${name}-${variant}-${w}.webp ${w}w`).join(", ")

/**
 * Built-in art for each layout, filling the frame. Served as-is, not through
 * the image optimizer: its q75 re-encode blurred the lettering, so the files
 * are pre-resized with a sharp filter at the widths each screen density needs.
 */
function ResponsiveArt({ name, kind, alt }: { name: string; kind: keyof typeof ART; alt: string }) {
  const { mobile, desktop, sizes } = ART[kind]
  return (
    <picture>
      <source media="(min-width: 768px)" srcSet={srcSet(name, desktop)} sizes={sizes} />
      <img
        src={`/promos/${name}-${mobile.variant}-${mobile.widths[1]}.webp`}
        srcSet={srcSet(name, mobile)}
        sizes={sizes}
        alt={alt}
        fetchPriority="high"
        className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
      />
    </picture>
  )
}

const DEAL_SIZES = ART.card.sizes
const TILE_SIZES = ART.tile.sizes
const TILE_ASPECT = "aspect-square md:aspect-16/5"
// Wide on phones (full width above the tiles); on desktop it stretches to the tiles' height.
const DEAL_FRAME = "aspect-12/5 md:aspect-auto"

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
          kind="card"
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

/**
 * Under ₹X tile: the admin's image or the built-in artwork, both carrying the
 * price in the art. Filters this page's D2H Core catalogue in place (an
 * admin-set link goes wherever it points).
 */
function UnderTile({ price, banner }: { price: UnderTilePrice; banner: BannerRow | undefined }) {
  const label = banner?.title ?? `Under ₹${price}`
  const content = banner ? (
    <Artwork src={publicImageUrl("banners", banner.image_path)} alt={label} sizes={TILE_SIZES} />
  ) : (
    <ResponsiveArt name={`tile-under-${price}`} kind="tile" alt={label} />
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
      <div className={`${FRAME} ${DEAL_FRAME}`}>
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
      <div className={`${DEAL_FRAME} animate-pulse rounded-2xl bg-brand-100/60`} />
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        {UNDER_TILE_PRICES.map((price) => (
          <div key={price} className={`${TILE_ASPECT} animate-pulse rounded-2xl bg-muted`} />
        ))}
      </div>
    </>
  )
}

/**
 * Homepage deal card + 2×2 "Under ₹X" tiles. Phones: wide 12:5 card full
 * width, square tiles below. Desktop: wide card beside wide 16:5 tiles (3:4);
 * the tiles set the row height and the card stretches to match. The card is
 * wide everywhere so one wide banner covers it on every device.
 * Editable in Dashboard → Banners.
 */
export function HomeBannerActions() {
  return (
    <section aria-label="Deals" className="mx-auto w-full max-w-7xl px-4 py-5">
      <div className="grid gap-2.5 sm:gap-3 md:grid-cols-[minmax(0,3fr)_minmax(0,4fr)] md:gap-4">
        <Suspense fallback={<DealsRowSkeleton />}>
          <DealsRow />
        </Suspense>
      </div>
    </section>
  )
}
