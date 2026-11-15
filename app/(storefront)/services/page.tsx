import Link from "next/link"
import type { Metadata } from "next"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons"
import { MoreServices } from "@/components/storefront/more-services"

export const metadata: Metadata = {
  title: "More Services",
  description:
    "Tools, learning resources and services from Direct2Hub to grow your eCommerce business.",
  alternates: { canonical: "/services" },
}

/** Also the mobile "More" tab. */
export default function MoreServicesPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-4 sm:py-6">
      <div className="mb-3 flex items-center gap-2">
        <Link
          href="/"
          aria-label="Back to home"
          className="press -ml-2 flex size-10 shrink-0 items-center justify-center rounded-lg text-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2.2} className="size-5" />
        </Link>
        <h1 className="text-xl leading-tight font-bold tracking-tight">More Services</h1>
      </div>
      <MoreServices />
    </div>
  )
}
