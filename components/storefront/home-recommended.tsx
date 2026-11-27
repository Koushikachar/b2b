import { HugeiconsIcon } from "@hugeicons/react"
import { AiSparklesIcon } from "@hugeicons/core-free-icons"
import { createClient } from "@/lib/supabase/server"
import { getSessionUser } from "@/lib/auth/session"
import { getBuyerInterestCategoryIds } from "@/lib/buyer/queries"
import { getCachedRecommendedProducts } from "@/lib/storefront-cache"
import { SectionHeader } from "@/components/storefront/section-header"
import { ProductCarousel } from "@/components/storefront/product-carousel"
import type { ProductCardData } from "@/components/storefront/product-card"

/**
 * Personalized when the buyer has viewed/saved products; otherwise the newest
 * approved listings. Both paths are real catalogue data. Checkout passes its
 * own `categoryIds` (cart + past orders) and excludes what is already in the cart.
 */
export async function RecommendedProductsSection({
  storeId = null,
  categoryIds: givenCategoryIds,
  excludeIds = [],
  title = "Recommended products",
  subtitle,
  limit = 8,
}: {
  storeId?: string | null
  categoryIds?: string[]
  excludeIds?: string[]
  title?: string
  subtitle?: string
  limit?: number
}) {
  let categoryIds = givenCategoryIds
  if (!categoryIds) {
    const supabase = await createClient()
    const user = await getSessionUser(supabase)
    categoryIds = user ? await getBuyerInterestCategoryIds(supabase, user.id) : []
  }
  const exclude = new Set(excludeIds)
  // Fetch extra when excluding, so the row stays full after removing cart items.
  const usable = <T extends { id: string; is_out_of_stock?: boolean | null }>(list: T[]) =>
    // Never suggest something the buyer can't add to the cart.
    list.filter((product) => !exclude.has(product.id) && !product.is_out_of_stock)
  let products = usable(await getCachedRecommendedProducts(categoryIds, storeId, limit + exclude.size))
  // Small categories: top up with the newest products so the row stays full.
  if (products.length < limit && categoryIds.length > 0) {
    const have = new Set(products.map((product) => product.id))
    const extra = usable(await getCachedRecommendedProducts([], storeId, limit * 2 + exclude.size))
    products = products.concat(extra.filter((product) => !have.has(product.id)))
  }
  products = products.slice(0, limit)

  if (products.length === 0) return null

  const cards: ProductCardData[] = products.map((product) => ({
    id: product.id,
    title: product.title,
    unit: product.unit,
    moq: product.moq,
    negotiable: product.negotiable,
    images: product.images,
    mrp: product.mrp,
    is_out_of_stock: product.is_out_of_stock,
    pricing: product.pricing
      ? { customer_price: product.pricing.customer_price }
      : null,
  }))

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-2">
      <SectionHeader
        title={title}
        subtitle={
          subtitle ??
          (categoryIds.length > 0
            ? "Based on the categories you have viewed and saved"
            : "Fresh listings from verified suppliers")
        }
        icon={
          <HugeiconsIcon
            icon={AiSparklesIcon}
            strokeWidth={1.8}
            className="size-4"
          />
        }
        actionLabel="View all"
        actionHref="/products"
      />
      <ProductCarousel
        products={cards}
        priorityCount={2}
        sizes="(min-width: 1024px) 18vw, (min-width: 640px) 30vw, 46vw"
      />
    </section>
  )
}
