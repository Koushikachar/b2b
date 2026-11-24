import { getCachedHomeBanners } from "@/lib/storefront-cache"
import { HomeBannerCarousel, type HomeBanner } from "@/components/storefront/home-banner-carousel"

/**
 * Hero carousel from Dashboard → Banners ("Hero carousel" slot). Renders
 * nothing until an active hero banner exists. While loading, the page shows
 * HomeHeroSkeleton in the same frame, so keep the two in step.
 */
export async function HomeHeroSection() {
  const banners = ((await getCachedHomeBanners()) as (HomeBanner & { slot: string })[]).filter(
    (banner) => banner.slot === "hero",
  )
  if (banners.length === 0) return null

  return (
    <section aria-label="Featured" className="mx-auto w-full max-w-7xl px-4 pt-2">
      <HomeBannerCarousel banners={banners} />
    </section>
  )
}
