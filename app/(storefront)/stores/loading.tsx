import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div aria-hidden className="mx-auto w-full max-w-5xl px-4 py-5">
      <Skeleton className="h-6 w-28" />
      <Skeleton className="mt-2 h-4 w-48" />
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
      </div>
    </div>
  )
}
