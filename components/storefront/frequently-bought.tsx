import { HugeiconsIcon } from "@hugeicons/react"
import { ShoppingCart01Icon } from "@hugeicons/core-free-icons"
import { getCachedHomeProducts } from "@/lib/storefront-cache"
import { SectionHeader } from "@/components/storefront/section-header"
import { ProductCarousel } from "@/components/storefront/product-carousel"
import type { ProductCardData } from "@/components/storefront/product-card"

/**
 * Placeholder purchase-grouping section.
 *
 * There is no co-purchase aggregation yet, so this shows real newest listings
 * in the same product-card rail as the reference design. Replace the query
 * (not the card layout) when the real aggregation lands.
 */
export async function FrequentlyBoughtSection({ storeId = null }: { storeId?: string | null }) {
  const products = await getCachedHomeProducts(storeId)
  if (products.length === 0) return null

  const cards: ProductCardData[] = products.slice(0, 10).map((product) => ({
    id: product.id,
    title: product.title,
    unit: product.unit,
    moq: product.moq,
    negotiable: product.negotiable,
    images: product.images,
    pricing: product.pricing
      ? { customer_price: product.pricing.customer_price }
      : null,
  }))

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-5">
      <SectionHeader
        title="Frequently bought together"
        subtitle="Preview — sample picks, not real purchase history yet"
        icon={
          <HugeiconsIcon
            icon={ShoppingCart01Icon}
            strokeWidth={1.8}
            className="size-4"
          />
        }
        actionLabel="View all"
        actionHref="/products"
      />
      <ProductCarousel
        products={cards}
        sizes="(min-width: 1024px) 18vw, (min-width: 640px) 30vw, 46vw"
      />
    </section>
  )
}
