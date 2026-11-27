import Image from "next/image"
import type { Metadata } from "next"
import { HugeiconsIcon } from "@hugeicons/react"
import { Clock01Icon } from "@hugeicons/core-free-icons"
import { STORE_PROGRAMMES } from "@/lib/stores"
import { getCachedProducts, getCachedStoreId } from "@/lib/storefront-cache"
import { StoreCard } from "@/components/stores/store-card"

export const metadata: Metadata = {
  title: "Stores — Direct2Hub",
  description: "Shop Direct2Hub stores: Core for ready-to-ship products. Select is coming soon.",
  alternates: { canonical: "/stores" },
}

export default async function StoresPage() {
  // One cached count query (perPage 1) for the D2H Core catalogue size;
  // products are scoped per store, same lookup as the homepage.
  const coreStoreId = await getCachedStoreId("d2h-core")
  const catalogue = await getCachedProducts({
    perPage: 1,
    sort: "newest",
    storeId: coreStoreId ?? undefined,
  })

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-5">
      <h1 className="text-xl font-bold tracking-tight">Stores</h1>
      <p className="mt-1 text-sm text-muted-foreground">Pick a store to start sourcing.</p>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {STORE_PROGRAMMES.map((store, index) => (
          <StoreCard key={store.slug} store={store} productCount={catalogue.total} priority={index === 0} />
        ))}

        {/* D2H Select is not open yet: shown as "Coming soon", not a link. */}
        <div
          aria-disabled="true"
          className="relative flex items-center gap-4 overflow-hidden rounded-2xl border border-dashed border-border bg-card p-4"
        >
          <Image src="/stores/store-select.webp" alt="" width={179} height={128} className="h-auto w-16 shrink-0 object-contain opacity-70 grayscale sm:w-20" />
          {/* Badge sits above the name so the text gets the full width on small phones. */}
          <div className="min-w-0 flex-1">
            <span className="mb-1 inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-1 text-xs font-bold tracking-wide text-muted-foreground uppercase">
              <HugeiconsIcon icon={Clock01Icon} strokeWidth={2} className="size-3.5" />
              Soon
            </span>
            <h2 className="text-lg font-extrabold tracking-tight text-foreground/80">Select</h2>
            <p className="text-sm text-muted-foreground">Winning products, hot sellers and Under ₹9–₹99 deals.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
