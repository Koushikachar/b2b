import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getCachedFlaggedProducts, getCachedStoreId } from "@/lib/storefront-cache"
import { SHOWCASES, isShowcaseKind } from "@/lib/showcase"
import { listingJsonLd } from "@/lib/seo"
import { serializeJsonLd } from "@/lib/json-ld"
import { SITE_URL } from "@/lib/site"
import { Breadcrumbs } from "@/components/layout/breadcrumbs"
import { ProductCard, type ProductCardData } from "@/components/storefront/product-card"

export async function generateMetadata({ params }: { params: Promise<{ kind: string }> }): Promise<Metadata> {
  const { kind } = await params
  // Streaming already sent 200, so keep unknown kinds out of search results.
  if (!isShowcaseKind(kind)) return { robots: { index: false, follow: false } }
  return {
    title: { absolute: SHOWCASES[kind].seoTitle },
    description: `${SHOWCASES[kind].title} on Direct2Hub: ${SHOWCASES[kind].pitch.replace(/\.$/, "").toLowerCase()}. Live wholesale prices, low MOQs, GST invoices and 5–7 day delivery.`,
    alternates: { canonical: `/collections/${kind}` },
  }
}

/** "View all" for a home showcase row (Core store). */
export default async function CollectionPage({ params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params
  if (!isShowcaseKind(kind)) notFound()
  const config = SHOWCASES[kind]
  const storeId = await getCachedStoreId("d2h-core")
  const products = await getCachedFlaggedProducts(config.flag, storeId, 48)

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-5">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: config.title }]} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(listingJsonLd({
            siteUrl: SITE_URL,
            path: `/collections/${kind}`,
            name: config.title,
            crumbs: [{ name: "Home", path: "/" }, { name: config.title, path: `/collections/${kind}` }],
            products: products.map((p) => ({ id: p.id as string, title: p.title as string })),
          })) }}
      />
      {/* The page's one h1 (search engines read it as the page topic). */}
      <h1 className="mt-2 text-xl font-bold tracking-tight md:text-2xl">{config.title}</h1>
      <p className="mt-1 mb-4 text-sm text-muted-foreground">{config.pitch} Live wholesale prices from Direct2Hub.</p>
      {products.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Nothing here right now. Check back soon.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          {products.map((product, index) => (
            <ProductCard
              key={product.id as string}
              product={product as unknown as ProductCardData}
              priority={index < 2}
            />
          ))}
        </div>
      )}
    </div>
  )
}
