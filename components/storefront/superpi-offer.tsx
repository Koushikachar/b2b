import Image from "next/image"
import { HugeiconsIcon } from "@hugeicons/react"
import { AiSparklesIcon, ArrowUpRight01Icon, CheckmarkCircle02Icon, PackageIcon } from "@hugeicons/core-free-icons"

/** Superpi (superpi.space) is Direct2Hub's own inventory app; links carry where they came from. */
export const SUPERPI_URL = "https://superpi.space"
const SIGNUP = `${SUPERPI_URL}/register?utm_source=direct2hub&utm_medium=checkout`

// Only what superpi.space itself states (home, pricing and about pages).
const POINTS = [
  "Manage your ecommerce inventory in one place",
  "Built-in AI assistant",
  "Free forever for up to 100 products",
]

/**
 * Checkout cross-sell for buyers who resell what they order. Sits below the
 * order form, so it never competes with placing the order.
 */
export function SuperpiOffer() {
  return (
    <section aria-labelledby="superpi-title" className="mx-auto w-full max-w-7xl px-4 pt-2 pb-4">
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-violet via-violet to-info p-5 text-white shadow-md sm:p-7">
        <Image
          src="/partners/superpi-mark.png"
          alt=""
          width={130}
          height={128}
          aria-hidden
          className="pointer-events-none absolute -right-6 -bottom-8 w-44 opacity-20 sm:w-56"
        />
        <div className="relative grid items-center gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:gap-8">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 rounded-md bg-white/15 px-2 py-1 text-[11px] font-bold tracking-wide uppercase">
              <HugeiconsIcon icon={AiSparklesIcon} strokeWidth={2} className="size-3.5" />
              Also from Direct2Hub
            </p>
            <h2 id="superpi-title" className="mt-3 text-xl leading-tight font-extrabold tracking-tight sm:text-2xl">
              Reselling what you buy? Know what&apos;s in stock with Superpi.
            </h2>
            <ul className="mt-3 flex flex-col gap-1.5 text-sm text-white/90 sm:flex-row sm:flex-wrap sm:gap-x-5">
              {POINTS.map((point) => (
                <li key={point} className="flex items-start gap-1.5">
                  <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} className="mt-0.5 size-4 shrink-0 text-white" />
                  {point}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col items-stretch gap-2 sm:flex-row md:flex-col">
            <a
              href={SIGNUP}
              target="_blank"
              rel="noopener"
              className="press inline-flex h-11 items-center justify-center gap-2 rounded-md bg-white px-5 text-sm font-bold text-violet shadow-sm hover:bg-white/90"
            >
              <HugeiconsIcon icon={PackageIcon} strokeWidth={2} className="size-5" />
              Start free on Superpi
            </a>
            <a
              href={SUPERPI_URL}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center justify-center gap-1 text-sm font-semibold text-white/90 hover:text-white hover:underline"
            >
              Learn more at superpi.space
              <HugeiconsIcon icon={ArrowUpRight01Icon} strokeWidth={2} className="size-4" />
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
