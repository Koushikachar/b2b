import { Suspense } from "react"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import type { CatalogueSearchParams } from "@/lib/catalogue"
import { UNDER_TILE_PRICES, type UnderTilePrice } from "@/lib/admin/banner-slots"
import { getCachedStoreId } from "@/lib/storefront-cache"
import { Breadcrumbs } from "@/components/layout/breadcrumbs"
import { CatalogueSection } from "@/components/storefront/catalogue-section"
import { CatalogueSkeleton } from "@/components/storefront/skeletons"

type Props = {
  params: Promise<{ price: string }>
  searchParams: Promise<CatalogueSearchParams>
}

function parseTilePrice(value: string): UnderTilePrice | null {
  const n = Number(value)
  return (UNDER_TILE_PRICES as readonly number[]).includes(n) ? (n as UnderTilePrice) : null
}

export function generateStaticParams() {
  return UNDER_TILE_PRICES.map((price) => ({ price: String(price) }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const limit = parseTilePrice((await params).price)
  if (!limit) return { robots: { index: false, follow: false } }
  return {
    title: `Under ₹${limit} — Direct2Hub`,
    description: `Wholesale products priced up to ₹${limit}, ready to ship from Direct2Hub.`,
    alternates: { canonical: `/under/${limit}` },
  }
}

/** Home "Under ₹X" tile: its own page with every Core product up to that price. */
export default async function UnderTilePage({ params, searchParams }: Props) {
  const [{ price }, sp] = await Promise.all([params, searchParams])
  const limit = parseTilePrice(price)
  if (!limit) notFound()

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-5">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: `Under ₹${limit}` }]} />
      <Suspense fallback={<CatalogueSkeleton />}>
        <UnderTileCatalogue limit={limit} sp={sp} />
      </Suspense>
    </div>
  )
}

async function UnderTileCatalogue({ limit, sp }: { limit: UnderTilePrice; sp: CatalogueSearchParams }) {
  // The price cap is the page itself: a lower cap is honoured, a higher one clamped.
  const requested = Number(Array.isArray(sp.maxPrice) ? sp.maxPrice[0] : sp.maxPrice)
  const maxPrice = Number.isFinite(requested) && requested >= 0 ? Math.min(requested, limit) : limit
  const coreStoreId = await getCachedStoreId("d2h-core")

  return (
    <CatalogueSection
      searchParams={{ ...sp, maxPrice: String(maxPrice) }}
      basePath={`/under/${limit}`}
      title={`Under ₹${limit}`}
      description={`Everything up to ₹${limit}, with live wholesale pricing.`}
      headingLevel="h1"
      storeId={coreStoreId}
      // The tiles live on the home page: removing the price (× or Clear all) goes back there.
      priceExitPath="/"
    />
  )
}
