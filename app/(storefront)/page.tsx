import { Suspense } from "react"
import type { Metadata } from "next"
import type { CatalogueSearchParams } from "@/lib/catalogue"
import { getCachedStoreId } from "@/lib/storefront-cache"
import { createClient } from "@/lib/supabase/server"
import { getAuthUser } from "@/lib/auth/session"
import { AllProductsSection } from "@/components/storefront/home-sections"
import { SearchMegaMenuSection } from "@/components/storefront/search-mega-menu-section"
import { HomeBannerActions } from "@/components/storefront/home-banner-actions"
import { HomeHeroSection } from "@/components/storefront/home-hero"
import { NewSellerOfferPopup } from "@/components/storefront/new-seller-offer-popup"
import { TopCategoriesSection } from "@/components/storefront/home-categories"
import { RecentlyViewedSection } from "@/components/storefront/home-recently-viewed"
import { FrequentlyBoughtSection } from "@/components/storefront/frequently-bought"
import { RecommendedProductsSection } from "@/components/storefront/home-recommended"
import {
  CatalogueSkeleton,
  FrequentlyBoughtSkeleton,
  RecentRailSkeleton,
  RecommendedProductsSkeleton,
  SearchHeroSkeleton,
  TopCategoriesSkeleton,
} from "@/components/storefront/skeletons"

export const metadata: Metadata = {
  title: "Wholesale Marketplace from India",
  description:
    "Source wholesale products across textiles, electronics, chemicals, packaging and more — directly from verified Indian suppliers with live pricing.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Wholesale Marketplace from India",
    description:
      "Source wholesale products across textiles, electronics, chemicals, packaging and more — directly from verified Indian suppliers with live pricing.",
    url: "/",
  },
}

/** The starter offer is for new visitors; signed-in buyers and sellers skip it. */
async function GuestOfferPopup() {
  const user = await getAuthUser(await createClient())
  return user ? null : <NewSellerOfferPopup />
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
    <div className="min-h-full bg-white">
      <h1 className="sr-only">
        Wholesale marketplace — source directly from verified Indian suppliers
      </h1>

      <Suspense fallback={<SearchHeroSkeleton />}>
        <SearchMegaMenuSection />
      </Suspense>

      {/* Admin hero banners; reserves no space until one exists. */}
      <Suspense fallback={null}>
        <HomeHeroSection />
      </Suspense>

      <HomeBannerActions />
      <Suspense fallback={null}>
        <GuestOfferPopup />
      </Suspense>

      <Suspense fallback={<TopCategoriesSkeleton />}>
        <TopCategoriesSection />
      </Suspense>

      <Suspense fallback={<RecentRailSkeleton />}>
        <RecentlyViewedSection />
      </Suspense>

      <Suspense fallback={<FrequentlyBoughtSkeleton />}>
        <FrequentlyBoughtSection storeId={coreStoreId} />
      </Suspense>

      <Suspense fallback={<RecommendedProductsSkeleton />}>
        <RecommendedProductsSection storeId={coreStoreId} />
      </Suspense>

      <Suspense
        fallback={
          <section className="border-y border-border bg-muted/60">
            <div className="mx-auto w-full max-w-[1440px] px-4 py-5 sm:py-7">
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
