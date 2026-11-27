import { Suspense } from "react"
import { getImageProps } from "next/image"
import Link from "next/link"
import { getCachedHomeBanners, getCachedPromoEvents } from "@/lib/storefront-cache"
import { publicImageUrl } from "@/lib/storage"
import { UNDER_TILE_PRICES, underMobileSlot, underSlot, type UnderTilePrice } from "@/lib/admin/banner-slots"
import { PROMO_EVENT_THEMES, isPromoEventLive } from "@/lib/promotions"
import { SoftLink } from "@/components/storefront/soft-link"
import { DealSlider } from "@/components/storefront/deal-slider"

type BannerRow = { slot: string; title: string | null; link_url: string | null; image_path: string }

/** Frame shared by the deal card and the tiles; the link inside fills it. */
const FRAME =
  "group relative overflow-hidden rounded-2xl border border-brand-200 bg-brand-50 shadow-xs transition-[border-color,box-shadow] hover:border-primary/60 hover:shadow-md"
const FILL_LINK =
  "press absolute inset-0 block focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset"

/** A slot's desktop and phone uploads (Dashboard → Banners); either may be missing, not both. */
type AdminPair = { desktop?: BannerRow; mobile?: BannerRow }

const hasUpload = (pair: AdminPair) => Boolean(pair.desktop || pair.mobile)

/** Every deal upload as a slide: the n-th desktop image with the n-th phone image. */
function dealPairs(banners: BannerRow[]): AdminPair[] {
  const desktop = banners.filter((b) => b.slot === "deal")
  const mobile = banners.filter((b) => b.slot === "deal_mobile")
  return Array.from({ length: Math.max(desktop.length, mobile.length) }, (_, i) => ({
    desktop: desktop[i],
    mobile: mobile[i],
  }))
}
const pairTitle = (pair: AdminPair) => pair.desktop?.title || pair.mobile?.title || null
const pairLink = (pair: AdminPair) => pair.desktop?.link_url || pair.mobile?.link_url || null

/**
 * Admin uploads covering the box edge to edge: the phone image below md, the
 * desktop image from md up; one upload serves both (trimmed where its shape
 * differs from the box).
 *
 * Above the fold, so it loads eagerly at high priority, but is not preloaded:
 * a preload would fetch both the phone and the desktop image, while <picture>
 * downloads only the one that matches the screen (Next 16 image docs).
 */
function AdminArt({ pair, alt, sizes, eager = true }: { pair: AdminPair; alt: string; sizes: string; eager?: boolean }) {
  const desktop = (pair.desktop ?? pair.mobile)!
  const mobile = (pair.mobile ?? pair.desktop)!
  // Later slides of the deal card load lazily; the first one is above the fold.
  const common = eager
    ? ({ alt, sizes, fill: true, loading: "eager", fetchPriority: "high" } as const)
    : ({ alt, sizes, fill: true, loading: "lazy" } as const)
  const {
    props: { srcSet: desktopSet },
  } = getImageProps({ ...common, src: publicImageUrl("banners", desktop.image_path) })
  const {
    props: { srcSet: mobileSet, ...img },
  } = getImageProps({ ...common, src: publicImageUrl("banners", mobile.image_path) })
  return (
    <picture>
      <source media="(min-width: 768px)" srcSet={desktopSet} sizes={sizes} />
      <img
        {...img}
        srcSet={mobileSet}
        alt={alt}
        className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
      />
    </picture>
  )
}

/** Pre-resized built-in art on disk (`/promos/<name>-<variant>-<w>.webp`). */
const ART = {
  tile: {
    mobile: { variant: "mobile", widths: [128, 256, 480] },
    desktop: { variant: "desktop", widths: [400, 780] },
    sizes: "(min-width: 768px) 28vw, 28vw",
  },
  card: {
    // Tall card on phones, wide card from md up.
    mobile: { variant: "mobile", widths: [192, 384, 690] },
    desktop: { variant: "desktop", widths: [600, 1160] },
    sizes: "(min-width: 768px) 42vw, 38vw",
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
// The card has no shape of its own: it stretches to the tiles' height (tall
// beside square tiles on phones, wide beside wide tiles on desktop).
const DEAL_FRAME = ""

/**
 * Deal card. Admin uploads (Dashboard → Banners → deal / deal_mobile) always
 * win, and several rotate as slides: the n-th desktop upload pairs with the
 * n-th phone upload. With none, the "Sign up & get ₹100" art shows (owner
 * request). A slide without its own link goes to the wallet, which sends
 * signed-out visitors through sign-up first (the deal art is the signup offer).
 *
 * The festival / Diya branches are kept for when the signup campaign ends:
 * set SIGNUP_CAMPAIGN to false.
 */
const SIGNUP_CAMPAIGN = true
const SIGNUP_HREF = "/account/wallet"

async function DealCard({ pairs }: { pairs: AdminPair[] }) {
  if (pairs.length > 0) {
    return (
      <DealSlider label="Offers">
        {pairs.map((pair, i) => (
          <Link key={i} href={pairLink(pair) || SIGNUP_HREF} className={FILL_LINK}>
            <AdminArt pair={pair} alt={pairTitle(pair) ?? "Sign up and get ₹100 in your Direct2Hub wallet"} sizes={DEAL_SIZES} eager={i === 0} />
          </Link>
        ))}
      </DealSlider>
    )
  }

  if (SIGNUP_CAMPAIGN) {
    return (
      <Link href={SIGNUP_HREF} className={FILL_LINK}>
        <ResponsiveArt name="signup" kind="card" alt="Sign up and get ₹100 in your Direct2Hub wallet" />
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

  // No banner and no live event: the Diya art stays as the default card (owner's
  // choice), linking to the D2H Core catalogue (D2H Select is not open yet).
  return (
    <Link href="/products" className={FILL_LINK}>
      <ResponsiveArt name={PROMO_EVENT_THEMES["light-a-diya"].homeArt} kind="card" alt="Shop Direct2Hub deals" />
    </Link>
  )
}

/**
 * Under ₹X tile: the admin's image or the built-in artwork, both carrying the
 * price in the art. Filters this page's D2H Core catalogue in place (an
 * admin-set link goes wherever it points).
 */
function UnderTile({ price, pair }: { price: UnderTilePrice; pair: AdminPair }) {
  const label = pairTitle(pair) ?? `Under ₹${price}`
  const link = pairLink(pair)
  const content = hasUpload(pair) ? (
    <AdminArt pair={pair} alt={label} sizes={TILE_SIZES} />
  ) : (
    <ResponsiveArt name={`tile-under-${price}`} kind="tile" alt={label} />
  )

  return link ? (
    <Link href={link} aria-label={label} className={FILL_LINK}>
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
        <DealCard pairs={dealPairs(banners)} />
      </div>
      <ul className="grid grid-cols-2 gap-2.5 sm:gap-3">
        {UNDER_TILE_PRICES.map((price) => (
          <li key={price} className={`${FRAME} ${TILE_ASPECT}`}>
            <UnderTile
              price={price}
              pair={{ desktop: bySlot(underSlot(price)), mobile: bySlot(underMobileSlot(price)) }}
            />
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
 * Homepage deal card + 2×2 "Under ₹X" tiles, side by side on every device.
 * Phones: tall card beside square tiles (2:3). Desktop: wide card beside wide
 * 16:5 tiles (3:4). The tiles set the row height; the card stretches to match.
 * Editable in Dashboard → Banners.
 */
export function HomeBannerActions() {
  return (
    <section aria-label="Deals" className="mx-auto w-full max-w-7xl px-4 py-2">
      <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-2.5 sm:gap-3 md:grid-cols-[minmax(0,3fr)_minmax(0,4fr)] md:gap-4">
        <Suspense fallback={<DealsRowSkeleton />}>
          <DealsRow />
        </Suspense>
      </div>
    </section>
  )
}
