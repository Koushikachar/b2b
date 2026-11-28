import type { ShowcaseFlag } from "@/lib/storefront"

/**
 * Home-page showcase tabs. A supplier switches a product into one from the
 * product form (Promotions); a tab with no products is hidden. `tile` is the
 * feature tile's gradient (semantic tokens only).
 */
export const SHOWCASES = {
  winning: {
    flag: "is_winning",
    title: "Winning Products",
    seoTitle: "Winning Products for Ecommerce Sellers – Direct2Hub",
    tab: "Winning",
    pitch: "Seller-picked products that sell well.",
    tile: "from-primary to-brand-700",
  },
  "hot-selling": {
    flag: "is_hot_selling",
    title: "Hot Selling Products",
    seoTitle: "Hot Selling Wholesale Products – Direct2Hub",
    tab: "Hot Selling",
    pitch: "Popular picks moving fast right now.",
    tile: "from-destructive to-primary",
  },
} as const satisfies Record<string, { flag: ShowcaseFlag; title: string; seoTitle: string; tab: string; pitch: string; tile: string }>

export type ShowcaseKind = keyof typeof SHOWCASES

export function isShowcaseKind(value: string): value is ShowcaseKind {
  return Object.hasOwn(SHOWCASES, value)
}
