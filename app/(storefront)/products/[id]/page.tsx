import { Suspense } from "react"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { getCachedProduct } from "@/lib/storefront-cache"
import { publicImageUrl } from "@/lib/storage"
import {
  productPageTitle,
  resolveProductMetaDescription,
  resolveProductMetaTitle,
} from "@/lib/product-meta"
import { SITE_NAME, SITE_URL } from "@/lib/site"
import { serializeJsonLd } from "@/lib/json-ld"
import { productJsonLd } from "@/lib/seo"
import { ProductDetail, RelatedProductsSection } from "./product-detail"
import {
  ProductDetailSkeleton,
  ProductGridSkeleton,
} from "@/components/storefront/skeletons"

function getRootCategoryId(product: unknown): string | null {
  const p = product as { category?: unknown }
  if (!p.category) return null
  if (Array.isArray(p.category)) {
    const first = p.category[0] as { id?: string } | undefined
    return first?.id ?? null
  }
  return (p.category as { id?: string }).id ?? null
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const product = await getCachedProduct(id)
  if (!product) return {}

  const title = resolveProductMetaTitle(product)
  const description = resolveProductMetaDescription(product)
  const seoImagePath =
    (product.seo_image_path as string | null) ??
    (product.images as { path: string }[] | null)?.[0]?.path ??
    null
  const image = seoImagePath
    ? publicImageUrl("product_images", seoImagePath)
    : undefined

  return {
    title: productPageTitle(title),
    description,
    alternates: { canonical: `/products/${id}` },
    openGraph: {
      title,
      description,
      url: `/products/${id}`,
      siteName: SITE_NAME,
      type: "website",
      ...(image ? { images: [{ url: image, alt: title }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  }
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const product = await getCachedProduct(id)

  if (!product) notFound()

  const catId = getRootCategoryId(product)

  const pricing = product.pricing as { customer_price?: number } | null
  const imagePaths = [
    product.seo_image_path as string | null,
    ...((product.images as { path: string }[] | null) ?? []).map(
      (image) => image.path
    ),
  ].filter((path): path is string => Boolean(path))
  const rawCategory = (product as { category?: unknown }).category
  const category = (Array.isArray(rawCategory) ? rawCategory[0] : rawCategory) as
    | { name: string; slug: string }
    | null
    | undefined
  const jsonLd = productJsonLd(
    {
      id,
      title: product.title as string,
      description: (product.description as string | null) ?? null,
      brand: (product.brand as string | null) ?? null,
      sku: (product.seller_sku as string | null) ?? null,
      category: category ?? null,
      imageUrls: [...new Set(imagePaths)].map((path) => publicImageUrl("product_images", path)),
      price: pricing?.customer_price ?? null,
      // Same flag the storefront shows buyers ("Out of stock" badge).
      outOfStock: Boolean(product.is_out_of_stock),
    },
    SITE_URL,
  )

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <Suspense
        fallback={
          <div className="mx-auto w-full max-w-7xl px-4 py-5">
            <ProductDetailSkeleton />
          </div>
        }
      >
        <ProductDetail product={product as never} />
      </Suspense>
      {catId && (
        <Suspense
          fallback={
            <div className="mx-auto mt-6 w-full max-w-7xl px-4">
              <ProductGridSkeleton
                count={4}
                className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4"
              />
            </div>
          }
        >
          <RelatedProductsSection categoryId={catId} excludeId={id} />
        </Suspense>
      )}
      {/* Clearance for the fixed mobile buy bar (64px bar + safe-area inset); the
          shell owns bottom-nav clearance. */}
      <div
        aria-hidden
        className="lg:hidden"
        style={{ height: "calc(4rem + var(--safe-area-bottom))" }}
      />
    </>
  )
}
