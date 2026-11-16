import Image from "next/image"
import Link from "next/link"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowRight01Icon,
  CheckmarkBadge01Icon,
  Location01Icon,
  Package01Icon,
} from "@hugeicons/core-free-icons"
import { publicTransformedImageUrl } from "@/lib/storage"
import type { DirectorySupplier } from "@/lib/storefront-cache"

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "S"
  )
}

/** Directory card: whole card links to the supplier's store. */
export function SupplierCard({
  supplier,
  priority = false,
}: {
  supplier: DirectorySupplier
  priority?: boolean
}) {
  const location = [supplier.city, supplier.state].filter(Boolean).join(", ")
  const categories = supplier.category_names.slice(0, 3)
  const more = supplier.category_names.length - categories.length

  return (
    <article className="group relative flex flex-col rounded-xl border border-border bg-card p-4 shadow-xs transition-[border-color,box-shadow] hover:border-brand-300 hover:shadow-sm">
      <div className="flex items-start gap-3">
        <span className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-brand-50 text-base font-bold text-brand-700">
          {supplier.logo_path ? (
            <Image
              src={publicTransformedImageUrl("company_logos", supplier.logo_path, { width: 112, height: 112 })}
              alt=""
              fill
              sizes="56px"
              priority={priority}
              className="object-contain p-1"
            />
          ) : (
            initials(supplier.business_name)
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="line-clamp-2 text-base leading-snug font-bold tracking-tight break-words">
            <Link
              href={`/store/${supplier.id}`}
              className="after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none group-focus-within:text-primary group-hover:text-primary"
            >
              {supplier.business_name}
            </Link>
          </h2>
          <p className="mt-1 inline-flex items-center gap-1 rounded-md bg-success/10 px-1.5 py-0.5 text-[11px] font-semibold text-success">
            <HugeiconsIcon icon={CheckmarkBadge01Icon} strokeWidth={2} className="size-3.5" />
            Verified supplier
          </p>
        </div>
      </div>

      <dl className="mt-3 space-y-1.5 text-sm text-muted-foreground">
        {location ? (
          <div className="flex items-center gap-1.5">
            <dt className="sr-only">Location</dt>
            <HugeiconsIcon icon={Location01Icon} strokeWidth={2} className="size-4 shrink-0" />
            <dd className="truncate">{location}</dd>
          </div>
        ) : null}
        {supplier.product_count != null ? (
          <div className="flex items-center gap-1.5">
            <dt className="sr-only">Products</dt>
            <HugeiconsIcon icon={Package01Icon} strokeWidth={2} className="size-4 shrink-0" />
            <dd>
              <span className="font-semibold text-foreground tabular-nums">
                {supplier.product_count.toLocaleString("en-IN")}
              </span>{" "}
              {supplier.product_count === 1 ? "product" : "products"}
            </dd>
          </div>
        ) : null}
      </dl>

      {categories.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Categories">
          {categories.map((name) => (
            <li key={name} className="max-w-full truncate rounded-md border border-border bg-muted/50 px-2 py-0.5 text-[11px] font-medium text-foreground/80">
              {name}
            </li>
          ))}
          {more > 0 ? (
            <li className="rounded-md px-1 py-0.5 text-[11px] font-medium text-muted-foreground">+{more} more</li>
          ) : null}
        </ul>
      ) : null}

      <span aria-hidden className="mt-auto flex items-center gap-1 pt-4 text-sm font-semibold text-primary">
        View store
        <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2.2} className="size-4 transition-transform group-hover:translate-x-0.5" />
      </span>
    </article>
  )
}
