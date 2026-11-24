import { HugeiconsIcon } from "@hugeicons/react"
import { HistoryIcon } from "@hugeicons/core-free-icons"
import { SectionHeader } from "@/components/storefront/section-header"
import { ProductCarousel } from "@/components/storefront/product-carousel"
import type { ProductCardData } from "@/components/storefront/product-card"

/**
 * Recently-viewed products, shown as the same product cards used elsewhere on
 * the storefront (image, price, add-to-cart) in a horizontal rail.
 */
export function RecentlyViewedBlock({
  products,
  showViewAll = false,
}: {
  products: ProductCardData[]
  showViewAll?: boolean
}) {
  if (products.length === 0) return null

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-2">
      <SectionHeader
        title="Recently viewed"
        icon={
          <HugeiconsIcon
            icon={HistoryIcon}
            strokeWidth={1.8}
            className="size-4"
          />
        }
        actionLabel={showViewAll ? "View all" : undefined}
        actionHref={showViewAll ? "/account/recent" : undefined}
      />
      <ProductCarousel
        products={products}
        priorityCount={2}
        sizes="(min-width: 1024px) 18vw, (min-width: 768px) 23vw, 144px"
      />
    </section>
  )
}
