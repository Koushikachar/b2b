import { Suspense } from "react"
import type { Metadata } from "next"
import type { CatalogueSearchParams } from "@/lib/catalogue"
import { getCachedHomeBanners, getCachedStoreId } from "@/lib/storefront-cache"
import { publicImageUrl } from "@/lib/storage"
import { getBannerOutputSize } from "@/lib/admin/banner-images"
import type { BannerSlot } from "@/lib/admin/banner-slots"
import { AllProductsSection } from "@/components/storefront/home-sections"
import { SearchMegaMenuSection } from "@/components/storefront/search-mega-menu-section"
import { HomeBannerActions } from "@/components/storefront/home-banner-actions"
import { HomeHeroSection } from "@/components/storefront/home-hero"
import { NewSellerOfferPopup } from "@/components/storefront/new-seller-offer-popup"
import { TopCategoriesSection } from "@/components/storefront/home-categories"
import { RecentlyViewedSection } from "@/components/storefront/home-recently-viewed"
import { FrequentlyBoughtSection } from "@/components/storefront/frequently-bought"
import { RecommendedProductsSection } from "@/components/storefront/home-recommended"
import { HomeShowcaseSection } from "@/components/storefront/home-showcase"
import { DEFAULT_OG_IMAGE } from "@/lib/seo"
import {
  CatalogueSkeleton,
  HomeHeroSkeleton,
  RecentRailSkeleton,
  RecommendedProductsSkeleton,
  SearchHeroSkeleton,
  TopCategoriesSkeleton,
} from "@/components/storefront/skeletons"

// Owner's SEO brief (2026-11-28). Title under 60 and description under 160
// characters so Google shows them whole. "Hot selling" replaces the brief's
// "trending": that section was removed from the site.
const HOME_TITLE = "Direct2Hub – Wholesale Products & Ecommerce Sourcing India"
const HOME_DESCRIPTION =
  "Source wholesale products for your ecommerce business with Direct2Hub. Explore winning products, hot selling items and affordable products across 13 categories."

export const metadata: Metadata = {
  // absolute: the brand already leads, so skip the "| Direct2Hub" suffix.
  title: { absolute: HOME_TITLE },
  description: HOME_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: { title: HOME_TITLE, description: HOME_DESCRIPTION, url: "/", images: [DEFAULT_OG_IMAGE] },
}

type BannerRow = { slot: string; title: string | null; link_url: string | null; image_path: string }

/**
 * Offer popup for every visitor, signed in or not. Images come from
 * Dashboard → Banners (popup_desktop / popup_mobile); one upload covers every
 * device. With neither uploaded there is no popup at all.
 */
async function OfferPopup() {
  const banners = (await getCachedHomeBanners()) as BannerRow[]

  const desktopRow = banners.find((b) => b.slot === "popup_desktop")
  const mobileRow = banners.find((b) => b.slot === "popup_mobile")
  const asImage = (row: BannerRow) => {
    const { width, height } = getBannerOutputSize(row.slot as BannerSlot)
    return { src: publicImageUrl("banners", row.image_path), width, height }
  }
  const desktop = desktopRow ?? mobileRow
  const mobile = mobileRow ?? desktopRow
  if (!desktop || !mobile) return null

  return (
    <NewSellerOfferPopup
      desktop={asImage(desktop)}
      mobile={asImage(mobile)}
      href={desktop.link_url || mobile.link_url || "/products"}
      alt={desktop.title || mobile.title || "Direct2Hub offer"}
    />
  )
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<CatalogueSearchParams>
}) {
  const sp = await searchParams

  // The home page is the D2H Core storefront (cached lookup, no DB round trip).
  const coreStoreId = await getCachedStoreId("d2h-core")

  return (
    <div className="min-h-full">
      <h1 className="sr-only">
        Wholesale marketplace — source directly from verified Indian suppliers
      </h1>

      <Suspense fallback={<SearchHeroSkeleton />}>
        <SearchMegaMenuSection />
      </Suspense>

      {/* Admin hero banners. The placeholder holds the banner's space so the
          page doesn't jump when it streams in; it collapses if none exists. */}
      <Suspense fallback={<HomeHeroSkeleton />}>
        <HomeHeroSection />
      </Suspense>

      <HomeBannerActions />
      <Suspense fallback={null}>
        <OfferPopup />
      </Suspense>

      <Suspense fallback={<TopCategoriesSkeleton />}>
        <TopCategoriesSection />
      </Suspense>

      {/* Winning / Hot selling / Trending: hidden while no product is flagged. */}
      <Suspense fallback={null}>
        <HomeShowcaseSection storeId={coreStoreId} />
      </Suspense>

      <Suspense fallback={<RecentRailSkeleton />}>
        <RecentlyViewedSection />
      </Suspense>

      {/* Frequently bought: personal and usually empty, so no placeholder (it would
          only flash and collapse for guests and new accounts). */}
      <Suspense fallback={null}>
        <FrequentlyBoughtSection />
      </Suspense>

      <Suspense fallback={<RecommendedProductsSkeleton />}>
        <RecommendedProductsSection storeId={coreStoreId} />
      </Suspense>

      <Suspense
        fallback={
          <section className="border-y border-border bg-muted/60">
            <div className="mx-auto w-full max-w-[1440px] px-4 py-4 sm:py-5">
              <CatalogueSkeleton />
            </div>
          </section>
        }
      >
        <AllProductsSection searchParams={sp} storeId={coreStoreId} />
      </Suspense>
    </div>
  )
}
