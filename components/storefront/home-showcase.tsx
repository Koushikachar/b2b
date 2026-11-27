import { getCachedFlaggedProducts } from "@/lib/storefront-cache"
import { SHOWCASES, type ShowcaseKind } from "@/lib/showcase"
import type { ProductCardData } from "@/components/storefront/product-card"
import { ShowcaseTabs } from "@/components/storefront/showcase-tabs"

const ROW_LIMIT = 12

/**
 * Winning / Hot Selling as tabs over one product rail: one compact
 * section on every screen, never a half-empty panel. Tabs with no products
 * are hidden; the section disappears when all are empty.
 */
export async function HomeShowcaseSection({ storeId }: { storeId: string | null }) {
  const kinds = Object.keys(SHOWCASES) as ShowcaseKind[]
  const rows = (
    await Promise.all(
      kinds.map(async (kind) => {
        const products = await getCachedFlaggedProducts(SHOWCASES[kind].flag, storeId, ROW_LIMIT)
        const cards: ProductCardData[] = products.map((product) => ({
          id: product.id as string,
          title: product.title as string,
          unit: product.unit as string,
          moq: product.moq as number,
          negotiable: product.negotiable as boolean,
          images: product.images as ProductCardData["images"],
          mrp: product.mrp as number | null,
          is_out_of_stock: product.is_out_of_stock as boolean,
          pricing: product.pricing ? { customer_price: product.pricing.customer_price } : null,
        }))
        return { kind, cards }
      }),
    )
  ).filter((row) => row.cards.length > 0)

  if (rows.length === 0) return null
  return <ShowcaseTabs rows={rows} />
}
