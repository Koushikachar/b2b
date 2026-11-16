/**
 * D2H Select promotional collections + festival event themes.
 *
 * Collections are pure presentation config; products come from real catalogue
 * queries (`getCachedPromoCollections`). Event *windows* live in the
 * `promo_events` table so a new festival is a single row insert; the visual
 * theme for each event type lives here.
 */

export const PRICE_LIMITS = [9, 29, 49, 99] as const
export type PriceLimit = (typeof PRICE_LIMITS)[number]

export function parsePriceLimit(value: string): PriceLimit | null {
  const n = Number(value)
  return (PRICE_LIMITS as readonly number[]).includes(n) ? (n as PriceLimit) : null
}

/**
 * Price band for an "Under ₹X" bucket: above the previous bucket, up to X
 * (Under ₹29 = ₹9.01–₹29). Under ₹9 has no floor. Callers fall back to the
 * whole "≤ X" range when the band is empty, so a bucket is never blank while
 * cheaper products exist.
 */
export function priceBand(limit: PriceLimit): { minPrice?: number; maxPrice: number } {
  const index = PRICE_LIMITS.indexOf(limit)
  const floor = index > 0 ? PRICE_LIMITS[index - 1] : null
  return floor == null ? { maxPrice: limit } : { minPrice: floor + 0.01, maxPrice: limit }
}

export type PromoCollectionId =
  | "winning"
  | "hot-selling"
  | `under-${PriceLimit}`

export type PromoCollectionConfig = {
  id: PromoCollectionId
  title: string
  banner: string
  bannerWidth: number
  bannerHeight: number
  /** "contain" for artwork whose aspect ratio differs from the 92px header slot. */
  bannerFit?: "cover" | "contain"
  ctaLabel: string
  href: string
}

export const WINNING_COLLECTION: PromoCollectionConfig = {
  id: "winning",
  title: "Winning Products",
  banner: "/promos/winning.webp",
  bannerWidth: 418,
  bannerHeight: 118,
  ctaLabel: "See All Winning Products",
  href: "/select/winning",
}

export const HOT_SELLING_COLLECTION: PromoCollectionConfig = {
  id: "hot-selling",
  title: "Hot Selling",
  banner: "/promos/hot-selling.webp",
  bannerWidth: 520,
  bannerHeight: 222,
  bannerFit: "contain",
  ctaLabel: "See All Hot Selling",
  href: "/select/hot-selling",
}

const UNDER_BANNER_HEIGHT: Record<PriceLimit, number> = {
  9: 199,
  29: 202,
  49: 202,
  99: 202,
}

export function underPriceCollection(limit: PriceLimit): PromoCollectionConfig {
  return {
    id: `under-${limit}`,
    title: `Under ₹${limit}`,
    banner: `/promos/under-${limit}.webp`,
    bannerWidth: 720,
    bannerHeight: UNDER_BANNER_HEIGHT[limit],
    ctaLabel: `See All Under ₹${limit}`,
    href: `/select/under/${limit}`,
  }
}

// ---------------------------------------------------------------------------
// Festival events
// ---------------------------------------------------------------------------

export type PromoEventTheme = "light-a-diya"

export type PromoEvent = {
  key: string
  theme: PromoEventTheme
  title: string
  startsAt: string
  endsAt: string
  maxReward: number
}

export type PromoEventThemeConfig = {
  cardImage: string
  cardImageWidth: number
  cardImageHeight: number
  /** Home deal card art: `/promos/<homeArt>-{mobile,desktop}-<width>.webp`. */
  homeArt: string
  heroImage: string
  heroImageWidth: number
  heroImageHeight: number
  ctaLabel: string
  tagline: (maxReward: number) => string
  instructions: string
  actionLabel: string
}

export const PROMO_EVENT_THEMES: Record<PromoEventTheme, PromoEventThemeConfig> = {
  "light-a-diya": {
    cardImage: "/promos/light-a-diya.webp",
    cardImageWidth: 640,
    cardImageHeight: 890,
    homeArt: "diya",
    heroImage: "/promos/diya-lamp.webp",
    heroImageWidth: 560,
    heroImageHeight: 487,
    ctaLabel: "Light & Earn",
    tagline: (max) => `Win upto ₹${max.toLocaleString("en-IN")}`,
    instructions:
      "Tap the diya to light it. Every buyer wins a festive reward, credited straight to your Direct2Hub Wallet. One diya per account.",
    actionLabel: "Light the diya",
  },
}

export function isPromoEventLive(event: PromoEvent, now = Date.now()): boolean {
  return Date.parse(event.startsAt) <= now && now <= Date.parse(event.endsAt)
}
