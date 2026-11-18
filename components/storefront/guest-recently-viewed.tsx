"use client"

import { useEffect, useState } from "react"
import { useRecentlyViewed } from "@/hooks/use-recently-viewed"
import { getRecentlyViewedCards } from "@/lib/buyer/actions"
import { RecentlyViewedBlock } from "@/components/storefront/recently-viewed-rail"
import type { ProductCardData } from "@/components/storefront/product-card"

/**
 * Guest recently viewed rail, hydrated from localStorage. Prices and
 * add-to-cart data are fetched fresh by id, so a snapshot can never show a
 * stale price.
 */
export function GuestRecentlyViewed() {
  const items = useRecentlyViewed()
  const [cards, setCards] = useState<ProductCardData[]>([])

  useEffect(() => {
    let cancelled = false
    const productIds = items.map((item) => item.id)
    if (productIds.length === 0) return

    getRecentlyViewedCards(productIds)
      .then((next) => {
        if (!cancelled) setCards(next)
      })
      .catch(() => {
        if (!cancelled) setCards([])
      })

    return () => {
      cancelled = true
    }
  }, [items])

  if (items.length === 0) return null
  return <RecentlyViewedBlock products={cards} />
}
