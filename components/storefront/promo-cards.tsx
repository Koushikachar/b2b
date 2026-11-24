import Image from "next/image"
import Link from "next/link"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowRightDoubleIcon } from "@hugeicons/core-free-icons"
import { publicTransformedImageUrl } from "@/lib/storage"
import {
  PROMO_EVENT_THEMES,
  type PromoCollectionConfig,
  type PromoEvent,
} from "@/lib/promotions"
import { CardAddButton } from "@/components/storefront/card-add-button"
import { ProductImage } from "@/components/storefront/product-image"
import type { ProductCardData } from "@/components/storefront/product-card"
import { discountPercent } from "@/lib/format"

/** Slide width: one card + a peek of the next on phones, fixed on desktop. */
export const SLIDE_CLASS =
  "relative flex w-[84vw] max-w-[340px] shrink-0 snap-start flex-col sm:w-[320px]"

function formatPrice(price: number): string {
  return `₹${price.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`
}

function thumbUrl(product: ProductCardData): string | null {
  const first = product.images?.length
    ? [...product.images].sort((a, b) => a.sort - b.sort)[0]
    : null
  return first
    ? publicTransformedImageUrl("product_images", first.path, {
        width: 160,
        height: 160,
        fit: "contain",
      })
    : null
}

/** Price column: MRP struck through above the price. */
function PriceTag({ product }: { product: ProductCardData }) {
  if (!product.pricing) {
    return <span className="text-[11px] font-medium text-muted-foreground">On request</span>
  }
  const price = product.pricing.customer_price
  const mrp = product.mrp ?? null
  const off = discountPercent(mrp, price)
  return (
    <span className="flex flex-col items-end leading-none tabular-nums">
      {off > 0 && mrp != null ? (
        <span className="text-xs text-muted-foreground line-through">
          <span className="sr-only">MRP </span>
          {formatPrice(mrp)}
        </span>
      ) : null}
      <span className="mt-0.5 text-base font-extrabold tracking-tight text-primary">
        {formatPrice(price)}
      </span>
    </span>
  )
}

/**
 * Mockup row: thumbnail, name + MOQ, ADD, then the price column. On very
 * narrow cards (< 18rem) the price moves under the name so it keeps its width.
 */
function PromoProductRow({
  product,
  priority,
}: {
  product: ProductCardData
  priority: boolean
}) {
  return (
    <li className="flex items-center gap-2.5 py-2.5 @[18rem]:gap-3">
      <Link
        href={`/products/${product.id}`}
        className="press flex min-w-0 flex-1 items-center gap-2.5 @[18rem]:gap-3"
      >
        <span className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-muted @[18rem]:size-16">
          <ProductImage
            src={thumbUrl(product)}
            alt={product.title}
            sizes="64px"
            priority={priority}
          />
        </span>
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 text-sm leading-snug font-semibold break-words text-foreground">
            {product.title}
          </span>
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
            MOQ {product.moq}
          </span>
          <span className="mt-1 block @[18rem]:hidden [&>span]:items-start">
            <PriceTag product={product} />
          </span>
        </span>
      </Link>
      <CardAddButton
        productId={product.id}
        moq={product.moq}
        compact
        outOfStock={product.is_out_of_stock}
      />
      <span className="hidden w-14 shrink-0 @[18rem]:block">
        <PriceTag product={product} />
      </span>
    </li>
  )
}

function SeeAllButton({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="press mt-auto flex h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-[13px] font-bold whitespace-nowrap @[18rem]:text-sm text-primary-foreground shadow-sm hover:bg-brand-dark focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
    >
      <span className="truncate">{label}</span>
      <HugeiconsIcon icon={ArrowRightDoubleIcon} strokeWidth={2.4} className="size-4 shrink-0" />
    </Link>
  )
}

/** Winning / Hot selling / Under ₹X card, as in the Select mockups. */
export function PromoCollectionCard({
  config,
  products,
  priority = false,
}: {
  config: PromoCollectionConfig
  products: ProductCardData[]
  priority?: boolean
}) {
  return (
    <section
      data-slide
      aria-labelledby={`promo-${config.id}`}
      className={`${SLIDE_CLASS} overflow-hidden rounded-xl border border-brand-100 bg-brand-50 shadow-sm`}
    >
      <h3 id={`promo-${config.id}`} className="sr-only">
        {config.title}
      </h3>
      <Link href={config.href} className="block" tabIndex={-1} aria-hidden>
        <Image
          src={config.banner}
          alt=""
          width={config.bannerWidth}
          height={config.bannerHeight}
          priority={priority}
          sizes="(min-width: 640px) 320px, 84vw"
          className={`h-[92px] w-full object-left ${config.bannerFit === "contain" ? "object-contain [mask-image:linear-gradient(to_right,black_55%,transparent_70%)]" : "object-cover"}`}
        />
      </Link>
      <div className="@container mx-2 mb-2 flex flex-1 flex-col rounded-lg bg-card px-2.5 pt-1 pb-2.5 shadow-xs @[18rem]:mx-2.5 @[18rem]:mb-2.5 @[18rem]:px-3 @[18rem]:pb-3">
        {products.length === 0 ? (
          <p className="flex flex-1 items-center justify-center py-6 text-center text-sm text-muted-foreground">
            New deals are on the way.
          </p>
        ) : (
          <ul className="mb-3 divide-y divide-border">
            {products.slice(0, 4).map((product, index) => (
              <PromoProductRow
                key={product.id}
                product={product}
                priority={priority && index < 2}
              />
            ))}
          </ul>
        )}
        <SeeAllButton href={config.href} label={config.ctaLabel} />
      </div>
    </section>
  )
}

/** Festival event slide (e.g. Light a Diya) — the whole card is the CTA. */
export function PromoEventCard({ event }: { event: PromoEvent }) {
  const theme = PROMO_EVENT_THEMES[event.theme]
  return (
    <Link
      data-slide
      href={`/events/${event.key}`}
      className={`${SLIDE_CLASS} press group relative overflow-hidden rounded-xl border border-brand-100 bg-brand-50 shadow-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none`}
    >
      <Image
        src={theme.cardImage}
        alt={`${event.title} — ${theme.tagline(event.maxReward)}. ${theme.ctaLabel}`}
        width={theme.cardImageWidth}
        height={theme.cardImageHeight}
        sizes="(min-width: 640px) 320px, 84vw"
        className="h-full w-full object-cover object-top"
      />
    </Link>
  )
}
