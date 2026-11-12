import { CatalogueSkeleton } from "@/components/storefront/skeletons"

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-5">
      <CatalogueSkeleton />
    </div>
  )
}
