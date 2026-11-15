import Link from "next/link"
import { SoftLink } from "@/components/storefront/soft-link"
import { publicTransformedImageUrl } from "@/lib/storage"
import { cn } from "@/lib/utils"
import { ProductImage } from "@/components/storefront/product-image"

export type CategoryTileData = {
  id: string
  name: string
  slug: string
  image_path: string | null
  product_count: number
}

export function formatItemCount(count: number): string {
  return `${count.toLocaleString("en-IN")} ${count === 1 ? "item" : "items"}`
}

/** Square category image + name + live product count; links to the category page. */
export function CategoryTile({
  category,
  priority = false,
  sizes = "(min-width: 1024px) 12vw, (min-width: 768px) 18vw, 96px",
  className,
  href,
  active = false,
  showCount = true,
}: {
  category: CategoryTileData
  priority?: boolean
  sizes?: string
  className?: string
  /** Defaults to the category page; the catalogue passes an in-place filter URL. */
  href?: string
  /** Selected state when the tile is acting as a catalogue filter. */
  active?: boolean
  /** "N items" line under the name (catalogue row); Top categories hides it. */
  showCount?: boolean
}) {
  // As a catalogue filter, navigate in place (no full-page skeleton/scroll).
  const Anchor = href ? SoftLink : Link
  return (
    <Anchor
      href={href ?? `/category/${category.slug}`}
      aria-label={showCount ? `${category.name}, ${formatItemCount(category.product_count)}` : category.name}
      aria-current={active ? "true" : undefined}
      className={cn(
        "group press block shrink-0 snap-start rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none",
        className
      )}
    >
      <div
        className={cn(
          "relative aspect-square w-full overflow-hidden rounded-lg border bg-muted transition-colors",
          active
            ? "border-2 border-primary ring-2 ring-primary/20"
            : "border-border group-hover:border-brand-300"
        )}
      >
        {category.image_path ? (
          <ProductImage
            fit="cover"
            src={publicTransformedImageUrl("category_images", category.image_path, { width: 200, height: 200 })}
            alt=""
            sizes={sizes}
            priority={priority}
            unoptimized
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex h-full w-full items-center justify-center bg-brand-50 text-lg font-bold text-brand-700"
          >
            {category.name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <p
        className={cn(
          "mt-1.5 line-clamp-2 text-center text-[11px] leading-snug font-semibold group-hover:text-primary sm:text-xs",
          active ? "text-primary" : "text-foreground"
        )}
      >
        {category.name}
      </p>
      {showCount ? (
        <p aria-hidden className="text-center text-[10px] text-muted-foreground tabular-nums sm:text-[11px]">
          {formatItemCount(category.product_count)}
        </p>
      ) : null}
    </Anchor>
  )
}

/**
 * "Shop by category" row inside the catalogue: tapping a tile filters the
 * product list below in place (same URL contract as the sidebar), the chosen
 * tile is highlighted, and "Clear" removes the category filter. Categories with
 * products come first, most-stocked first.
 */
export function CategoryFilterRail({
  categories,
  activeSlug,
  hrefFor,
  clearHref,
}: {
  categories: CategoryTileData[]
  activeSlug: string
  hrefFor: (slug: string) => string
  clearHref: string
}) {
  const sorted = [...categories].sort(
    (a, b) =>
      Number(b.product_count > 0) - Number(a.product_count > 0) ||
      b.product_count - a.product_count ||
      a.name.localeCompare(b.name)
  )
  if (sorted.length === 0) return null

  return (
    <section aria-labelledby="catalogue-shop-by-category" className="mb-4">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h2
          id="catalogue-shop-by-category"
          className="text-sm font-bold tracking-tight text-foreground sm:text-base"
        >
          Shop by category
        </h2>
        {activeSlug ? (
          <SoftLink
            href={clearHref}
            className="text-xs font-semibold text-primary hover:underline"
          >
            Clear
          </SoftLink>
        ) : (
          <Link href="/categories" className="text-xs font-semibold text-primary hover:underline">
            View all
          </Link>
        )}
      </div>
      <div className="no-scrollbar relative -mx-4 flex snap-x scroll-pl-4 gap-2.5 overflow-x-auto px-4 pt-0.5 pb-1 lg:mx-0 lg:px-0.5">
        {sorted.map((category) => {
          const active = category.slug === activeSlug
          return (
            <CategoryTile
              key={category.id}
              category={category}
              href={active ? clearHref : hrefFor(category.slug)}
              active={active}
              sizes="(min-width: 640px) 120px, 92px"
              className="w-[92px] sm:w-[120px]"
            />
          )
        })}
      </div>
    </section>
  )
}
