import {
  getCachedDealsStoreId,
  getCachedPromoCollections,
  getCachedPromoEvents,
} from "@/lib/storefront-cache"
import {
  HOT_SELLING_COLLECTION,
  PRICE_LIMITS,
  WINNING_COLLECTION,
  isPromoEventLive,
  underPriceCollection,
} from "@/lib/promotions"
import type { ProductCardData } from "@/components/storefront/product-card"
import { PromoSlider } from "@/components/storefront/promo-slider"
import {
  PromoCollectionCard,
  PromoEventCard,
} from "@/components/storefront/promo-cards"

/**
 * D2H Select deals row: Winning, Hot selling, a live festival event (when one
 * is running) and the Under ₹9 / ₹29 / ₹49 / ₹99 buckets, as one swipeable
 * slider. Data is one cached read + one cached event lookup.
 */
export async function SelectPromotionalCollections() {
  const selectStoreId = await getCachedDealsStoreId()

  const [collections, events] = await Promise.all([
    getCachedPromoCollections(selectStoreId),
    getCachedPromoEvents(),
  ])
  const liveEvent = events.find((event) => isPromoEventLive(event)) ?? null

  return (
    <section aria-label="Deals" className="mx-auto w-full max-w-7xl py-4">
      <PromoSlider label="Deals and collections">
        <PromoCollectionCard
          config={WINNING_COLLECTION}
          products={collections.winning as unknown as ProductCardData[]}
          priority
        />
        <PromoCollectionCard
          config={HOT_SELLING_COLLECTION}
          products={collections.hotSelling as unknown as ProductCardData[]}
          priority
        />
        {liveEvent ? <PromoEventCard event={liveEvent} /> : null}
        {PRICE_LIMITS.map((limit) => (
          <PromoCollectionCard
            key={limit}
            config={underPriceCollection(limit)}
            products={collections.under[limit] as unknown as ProductCardData[]}
          />
        ))}
      </PromoSlider>
    </section>
  )
}
