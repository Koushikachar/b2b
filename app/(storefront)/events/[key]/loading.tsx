import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div aria-hidden className="mx-auto flex w-full max-w-xl flex-col items-center px-4 py-5">
      <Skeleton className="h-9 w-56" />
      <Skeleton className="mt-3 h-9 w-44 rounded-md" />
      <Skeleton className="mt-6 aspect-[560/487] w-full max-w-[420px] rounded-xl" />
      <Skeleton className="mt-5 h-11 w-full max-w-sm rounded-lg" />
    </div>
  )
}
