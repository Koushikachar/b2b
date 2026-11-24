import Link from "next/link"
import { publicTransformedImageUrl } from "@/lib/storage"
import { Card } from "@/components/ui/card"
import { CardAddButton } from "@/components/storefront/card-add-button"
import { ProductImage } from "@/components/storefront/product-image"
import { discountPercent } from "@/lib/format"

export type ProductCardData = {
  id: string
  title: string
  unit: string
  moq: number
  negotiable?: boolean
  images?: { path: string; sort: number }[] | null
  pricing: { customer_price: number } | null
  /** Optional MRP; shown struck through with the discount when higher. */
  mrp?: number | null
  is_out_of_stock?: boolean
  supplier?: {
    business_name?: string
    city?: string
    state?: string
    logo_path?: string | null
  } | null
}

function formatPrice(price: number): string {
  return `₹${price.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

function coverUrl(product: ProductCardData): string | null {
  const images = product.images
  if (!images || images.length === 0) return null
  const sorted = [...images].sort((a, b) => a.sort - b.sort)
  return publicTransformedImageUrl("product_images", sorted[0].path, {
    width: 640,
    height: 640,
    fit: "contain",
  })
}

/** Price (product-page style), with the MRP struck through and the discount when there is one. */
function PriceLine({ price, mrp }: { price: number; mrp: number | null }) {
  const off = discountPercent(mrp, price)
  return (
    <div className="flex flex-wrap items-baseline gap-x-1.5 tabular-nums">
      <span className="text-lg font-bold tracking-tight text-foreground">
        {formatPrice(price)}
      </span>
      {off > 0 && mrp != null ? (
        <span className="flex w-full items-baseline gap-1.5 text-xs">
          <span className="text-muted-foreground line-through">{formatPrice(mrp)}</span>
          <span className="font-semibold text-success">{off}% off</span>
        </span>
      ) : null}
    </div>
  )
}

export function ProductCard({
  product,
  priority = false,
  sizes = "(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw",
}: {
  product: ProductCardData
  priority?: boolean
  sizes?: string
}) {
  const soldOut = product.is_out_of_stock === true
  return (
    <Card className="group flex h-full flex-col gap-0! overflow-hidden border-border py-0! transition-shadow hover:shadow-md">
      <Link href={`/products/${product.id}`} className="block press">
        <div className="relative aspect-square w-full overflow-hidden bg-muted">
          {/* relative: the fill image positions against this wrapper, its direct parent. */}
          <div className={soldOut ? "relative size-full opacity-55" : "relative size-full"}>
            <ProductImage
              src={coverUrl(product)}
              alt={product.title}
              priority={priority}
              sizes={sizes}
            />
          </div>
          {soldOut ? (
            <span className="absolute top-2 left-2 inline-flex items-center gap-1.5 rounded-sm border border-border bg-card px-2 py-1 text-[11px] leading-none font-semibold text-foreground shadow-xs">
              <span aria-hidden className="size-1.5 rounded-full bg-destructive" />
              Out of stock
            </span>
          ) : null}
        </div>

        <div className="flex flex-col gap-1 px-2.5 pt-2">
          <p className="line-clamp-2 min-h-9 text-sm leading-snug font-semibold">
            {product.title}
          </p>

          {product.pricing ? (
            <PriceLine price={product.pricing.customer_price} mrp={product.mrp ?? null} />
          ) : (
            <p className="text-sm font-medium text-muted-foreground">
              Price on request
            </p>
          )}
        </div>
      </Link>

      <div className="mt-auto px-2.5 pt-1.5 pb-2.5">
        <CardAddButton
          productId={product.id}
          moq={product.moq}
          outOfStock={product.is_out_of_stock}
        />
      </div>
    </Card>
  )
}
