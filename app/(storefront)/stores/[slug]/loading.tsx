import { Skeleton } from "@/components/ui/skeleton"
import { ProductGridSkeleton } from "@/components/storefront/skeletons"

export default function Loading() {
  return (
    <div aria-hidden className="mx-auto w-full max-w-7xl px-4 py-5">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="mt-3 h-64 w-full rounded-2xl" />
      <Skeleton className="mt-3 h-11 w-full" />
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-28 rounded-xl" />
          <ProductGridSkeleton count={8} className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" />
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  )
}
