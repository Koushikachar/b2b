import { Suspense } from "react"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import type { CatalogueSearchParams } from "@/lib/catalogue"
import { PRICE_LIMITS, parsePriceLimit } from "@/lib/promotions"
import { createClient } from "@/lib/supabase/server"
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
    title: `Under ₹${limit} — D2H Select`,
    description: `Wholesale products priced at ₹${limit} or less, from verified suppliers.`,
    alternates: { canonical: `/select/under/${limit}` },
  }
}

/** "See all Under ₹X": the shared infinite catalogue capped at the bucket price. */
export default async function UnderPricePage({ params, searchParams }: Props) {
  const [{ price }, sp] = await Promise.all([params, searchParams])
  const limit = parsePriceLimit(price)
  if (!limit) notFound()

  // The bucket is the page's identity: a narrower price filter is honoured,
  // a wider one is clamped back to the bucket.
  const requested = Number(Array.isArray(sp.maxPrice) ? sp.maxPrice[0] : sp.maxPrice)
  const maxPrice =
    Number.isFinite(requested) && requested >= 0 ? Math.min(requested, limit) : limit

  // Same D2H Select store scope as the slider cards that link here.
  const supabase = await createClient()
  const { data: selectStore } = await supabase
    .from("stores")
    .select("id")
    .eq("slug", "d2h-select")
    .maybeSingle()
  const selectStoreId = (selectStore?.id as string | null) ?? null

  return (
    <div className="min-h-full bg-white">
      <div className="mx-auto w-full max-w-[1440px] px-4 py-5">
        <Breadcrumbs
          items={[
            { label: "D2H Select", href: "/select" },
            { label: `Under ₹${limit}` },
          ]}
        />
        <Suspense fallback={<CatalogueSkeleton />}>
          <CatalogueSection
            searchParams={{ ...sp, maxPrice: String(maxPrice) }}
            basePath={`/select/under/${limit}`}
            title={`Under ₹${limit}`}
            description={`Every product at ₹${limit} or less, with live wholesale pricing.`}
            headingLevel="h1"
            storeId={selectStoreId}
          />
        </Suspense>
      </div>
    </div>
  )
}
