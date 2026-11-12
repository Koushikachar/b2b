import Link from "next/link"
import Image from "next/image"
import type { Metadata } from "next"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { STORE_PROGRAMMES } from "@/lib/stores"
import { getCachedProducts } from "@/lib/storefront-cache"
import { StoreCard } from "@/components/stores/store-card"

export const metadata: Metadata = {
  title: "Stores — Direct2Hub",
  description: "Shop Direct2Hub stores: D2H Core for ready-to-ship products and D2H Select for curated deals.",
  alternates: { canonical: "/stores" },
}

export default async function StoresPage() {
  // One cached count query (perPage 1) for the catalogue size.
  const catalogue = await getCachedProducts({ perPage: 1, sort: "newest" })

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-5">
      <h1 className="text-xl font-bold tracking-tight">Stores</h1>
      <p className="mt-1 text-sm text-muted-foreground">Pick a store to start sourcing.</p>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {STORE_PROGRAMMES.map((store, index) => (
          <StoreCard key={store.slug} store={store} productCount={catalogue.total} priority={index === 0} />
        ))}

        <Link
          href="/select"
          className="press group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm hover:border-brand-300"
        >
          <Image src="/stores/d2h_select_mobile.jpg" alt="" width={89} height={56} className="h-12 w-20 shrink-0 rounded-lg object-contain sm:h-14 sm:w-24" />
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-extrabold tracking-tight">D2H Select</h2>
            <p className="text-sm text-muted-foreground">Winning products, hot sellers and Under ₹9–₹99 deals.</p>
          </div>
          <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-5 text-muted-foreground group-hover:text-primary" />
        </Link>
      </div>
    </div>
  )
}
