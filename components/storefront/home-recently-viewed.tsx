import { createClient } from "@/lib/supabase/server"
import { getSessionUser } from "@/lib/auth/session"
import { getBuyerRecentlyViewed } from "@/lib/buyer/queries"
import { RECENTLY_VIEWED_LIMIT } from "@/lib/recently-viewed"
import { GuestRecentlyViewed } from "@/components/storefront/guest-recently-viewed"
import { RecentlyViewedBlock } from "@/components/storefront/recently-viewed-rail"
import type { ProductCardData } from "@/components/storefront/product-card"

/**
 * Signed-in buyers get their real server-side history. Guests read the
 * localStorage snapshots written by the product page, so the section never
 * renders invented products.
 */
export async function RecentlyViewedSection() {
  const supabase = await createClient()
  const user = await getSessionUser(supabase)

  if (!user) return <GuestRecentlyViewed />

  const { products } = await getBuyerRecentlyViewed(
    supabase,
    user.id,
    1,
    RECENTLY_VIEWED_LIMIT
  )
  if (products.length === 0) return null

  const cards: ProductCardData[] = products.map((product) => ({
    id: product.id,
    title: product.title,
    unit: product.unit,
    moq: product.moq,
    negotiable: product.negotiable,
    mrp: product.mrp == null ? null : Number(product.mrp),
    is_out_of_stock: product.is_out_of_stock === true,
    images: product.images,
    pricing: product.pricing
      ? { customer_price: product.pricing.customer_price }
      : null,
  }))

  return <RecentlyViewedBlock products={cards} showViewAll />
}
