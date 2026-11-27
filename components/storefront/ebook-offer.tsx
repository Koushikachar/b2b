import Image from "next/image"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowRight01Icon, ArrowUpRight01Icon, Book01Icon } from "@hugeicons/core-free-icons"

/** Direct2Hub's own ebook (direct2hubebooks.in); links carry where they came from. */
export const EBOOK_URL = "https://direct2hubebooks.in"
const BUY = `${EBOOK_URL}/price?utm_source=direct2hub&utm_medium=checkout`

// Only what direct2hubebooks.in itself states.
const FACTS = ["86 pages", "16 chapters", "120 product ideas", "Instant access"]
const EXTRAS = "Profit calculator, product research sheet, supplier evaluation tool and a 30-day launch plan"

/**
 * Checkout cross-sell for The Ecommerce Playbook: a dark card so the orange
 * cover pops, the cover tilted in 3D (straightens on hover). Sits below the
 * order form, so it never competes with placing the order.
 */
export function EbookOffer() {
  return (
    <section aria-labelledby="ebook-title" className="mx-auto w-full max-w-7xl px-4 pt-4 pb-2">
      <div className="group relative overflow-hidden rounded-2xl bg-foreground p-5 text-white shadow-lg sm:p-7">
        {/* Soft brand glow behind the cover. */}
        <span aria-hidden className="pointer-events-none absolute -top-24 -left-16 size-80 rounded-full bg-primary/35 blur-3xl" />
        <span aria-hidden className="pointer-events-none absolute -right-20 -bottom-28 size-72 rounded-full bg-destructive/25 blur-3xl" />

        <div className="relative grid items-center gap-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-7 lg:grid-cols-[auto_minmax(0,1fr)_auto]">
          <a
            href={BUY}
            target="_blank"
            rel="noopener"
            aria-label="Buy The Ecommerce Playbook"
            className="mx-auto block w-32 [perspective:900px] sm:mx-0 sm:w-40"
          >
            <span className="relative block transition-transform duration-500 [transform:rotateY(-16deg)_rotateX(4deg)] group-hover:[transform:rotateY(0deg)_rotateX(0deg)] motion-reduce:transition-none">
              <Image
                src="/partners/ecommerce-playbook-cover.webp"
                alt="The Ecommerce Playbook cover"
                width={652}
                height={978}
                sizes="160px"
                className="h-auto w-full rounded-r-md rounded-l-sm shadow-[12px_16px_32px_rgba(0,0,0,0.55)]"
              />
              {/* Spine highlight. */}
              <span aria-hidden className="absolute inset-y-0 left-0 w-2 rounded-l-sm bg-linear-to-r from-black/35 to-transparent" />
            </span>
          </a>

          <div className="min-w-0 text-center sm:text-left">
            <p className="inline-flex items-center gap-1.5 rounded-md bg-primary/20 px-2 py-1 text-[11px] font-bold tracking-wide text-brand-200 uppercase">
              <HugeiconsIcon icon={Book01Icon} strokeWidth={2} className="size-3.5" />
              eBook by Direct2Hub
            </p>
            <h2 id="ebook-title" className="mt-3 text-2xl leading-tight font-extrabold tracking-tight sm:text-3xl">
              The Ecommerce <span className="text-primary">Playbook</span>
            </h2>
            <p className="mt-1 text-sm text-white/75">Start, sell &amp; scale your ecommerce business — one clear path from idea to first sale.</p>
            <ul className="mt-3 flex flex-wrap justify-center gap-1.5 sm:justify-start">
              {FACTS.map((fact) => (
                <li key={fact} className="rounded-md border border-white/15 bg-white/10 px-2 py-1 text-xs font-semibold">
                  {fact}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-white/65">Includes: {EXTRAS}.</p>
          </div>

          <div className="flex flex-col items-center gap-2 sm:col-span-2 sm:flex-row sm:justify-between lg:col-span-1 lg:flex-col lg:items-stretch">
            <p className="text-center leading-none lg:mb-1">
              <span className="text-4xl font-black tracking-tight tabular-nums">₹99</span>
              <span className="mt-1 block text-xs text-white/65">One-time · lifetime access</span>
            </p>
            <div className="flex w-full flex-col gap-2 sm:w-auto lg:w-full">
              <a
                href={BUY}
                target="_blank"
                rel="noopener"
                className="press inline-flex h-11 items-center justify-center gap-1.5 rounded-md bg-primary px-6 text-sm font-bold text-primary-foreground shadow-md shadow-primary/30 hover:bg-brand-dark"
              >
                Get the Playbook
                <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2.5} className="size-4" />
              </a>
              <a
                href={EBOOK_URL}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center justify-center gap-1 text-sm font-semibold text-white/80 hover:text-white hover:underline"
              >
                See what&apos;s inside
                <HugeiconsIcon icon={ArrowUpRight01Icon} strokeWidth={2} className="size-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
