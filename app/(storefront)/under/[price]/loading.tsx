import { CatalogueSkeleton } from "@/components/storefront/skeletons"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * Shown the instant an Under ₹X tile is tapped (and prefetched with the
 * link), instead of the home page's skeleton.
 */
export default function UnderPriceLoading() {
  return (
    <div aria-hidden className="mx-auto w-full max-w-[1440px] px-4 py-5">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-3 h-8 w-48" />
      <Skeleton className="mt-2 mb-5 h-4 w-72 max-w-full" />
      <CatalogueSkeleton />
    </div>
  )
}
