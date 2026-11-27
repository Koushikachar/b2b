import { Suspense } from "react"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import type { CatalogueSearchParams } from "@/lib/catalogue"
import { PRICE_LIMITS, parsePriceLimit, priceBand, type PriceLimit } from "@/lib/promotions"
import { getCachedDealsStoreId, getCachedProducts } from "@/lib/storefront-cache"
import { Breadcrumbs } from "@/components/layout/breadcrumbs"
import { CatalogueSection } from "@/components/storefront/catalogue-section"
import { CatalogueSkeleton } from "@/components/storefront/skeletons"

type Props = {
  params: Promise<{ price: string }>
  searchParams: Promise<CatalogueSearchParams>
}

export function generateStaticParams() {
  return PRICE_LIMITS.map((limit) => ({ price: String(limit) }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const limit = parsePriceLimit((await params).price)
  if (!limit) return {}
  return {
    title: `Under ₹${limit} — Direct2Hub Select`,
    description: `Wholesale products priced up to ₹${limit}, from verified suppliers.`,
    alternates: { canonical: `/select/under/${limit}` },
  }
}

/** "See all Under ₹X": the shared infinite catalogue capped at the bucket price. */
export default async function UnderPricePage({ params, searchParams }: Props) {
  const [{ price }, sp] = await Promise.all([params, searchParams])
  const limit = parsePriceLimit(price)
  if (!limit) notFound()

  // Breadcrumbs paint at once; the store/band lookups stream with the list.
  return (
    <div className="min-h-full bg-white">
      <div className="mx-auto w-full max-w-[1440px] px-4 py-5">
        <Breadcrumbs
          items={[
            { label: "Direct2Hub Select", href: "/select" },
            { label: `Under ₹${limit}` },
          ]}
        />
        <Suspense fallback={<CatalogueSkeleton />}>
          <UnderPriceCatalogue limit={limit} sp={sp} />
        </Suspense>
      </div>
    </div>
  )
}

async function UnderPriceCatalogue({ limit, sp }: { limit: PriceLimit; sp: CatalogueSearchParams }) {
  // The bucket is the page's identity: a narrower price filter is honoured,
  // a wider one is clamped back to the bucket.
  const requested = Number(Array.isArray(sp.maxPrice) ? sp.maxPrice[0] : sp.maxPrice)
  const maxPrice =
    Number.isFinite(requested) && requested >= 0 ? Math.min(requested, limit) : limit

  // D2H Select's own products only (cached id lookup).
  const selectStoreId = await getCachedDealsStoreId()

  // Own price band first (Under ₹29 = above ₹9 up to ₹29); the whole "≤ ₹X"
  // range only when the band is empty. A buyer-set minPrice always wins.
  const band = priceBand(limit)
  const requestedMin = Array.isArray(sp.minPrice) ? sp.minPrice[0] : sp.minPrice
  let minPrice = requestedMin
  // The band probe only knows the bucket, so it applies only to the plain
  // bucket view: no buyer price cap and no other filters (category, search…),
  // which it would otherwise ignore and over-narrow.
  const otherFilters = Object.keys(sp).some((key) => !["sort", "page"].includes(key))
  if (minPrice == null && band.minPrice != null && maxPrice === limit && !otherFilters) {
    const inBand = await getCachedProducts({
      minPrice: band.minPrice,
      maxPrice: limit,
      perPage: 1,
      sort: "newest",
      storeId: selectStoreId ?? undefined,
    })
    if (inBand.total > 0) minPrice = String(band.minPrice)
  }

  return (
    <CatalogueSection
      searchParams={{
        ...sp,
        maxPrice: String(maxPrice),
        ...(minPrice != null ? { minPrice } : {}),
      }}
      basePath={`/select/under/${limit}`}
      title={`Under ₹${limit}`}
      description={`Direct2Hub Select products up to ₹${limit}, with live wholesale pricing.`}
      headingLevel="h1"
      storeId={selectStoreId}
      priceExitPath="/products"
    />
  )
}
