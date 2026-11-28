import { ProductGridSkeleton } from "@/components/storefront/skeletons"
import { Skeleton } from "@/components/ui/skeleton"

/** Shown the instant "View all" (Winning / Hot Selling) is tapped. */
export default function CollectionLoading() {
  return (
    <div aria-hidden className="mx-auto w-full max-w-7xl px-4 py-5">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-3 h-8 w-56" />
      <Skeleton className="mt-2 mb-4 h-4 w-80 max-w-full" />
      <ProductGridSkeleton count={20} />
    </div>
  )
}
