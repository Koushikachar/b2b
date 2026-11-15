import type { CSSProperties, ReactNode } from "react"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import {
  ArrowRight01Icon,
  Book01Icon,
  Clock01Icon,
  ComputerIcon,
  DeliveryTruck01Icon,
  PackageIcon,
  PackageOpenIcon,
  Rocket01Icon,
  SparklesIcon,
  Target02Icon,
} from "@hugeicons/core-free-icons"
import { cn } from "cn"

type Service = {
  name: string
  tag: string
  tagIcon: IconSvgElement
  description: string
  /** External destination; omitted = "Coming soon" (not a link). */
  href?: string
  visual: ReactNode
  aside?: ReactNode
}

/* ---------- Decorative visuals (Hugeicons + tokens only, no raster art) ---------- */

/** SuperPi "S" mark: two offset strokes, slanted, in the SuperPi teal. */
function SuperPiMark() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 48 48"
      className="size-16 -skew-x-12 text-superpi sm:size-20"
      fill="none"
      stroke="currentColor"
      strokeWidth={8}
      strokeLinejoin="round"
    >
      <path d="M38 9H18a7.5 7.5 0 0 0 0 15h12a7.5 7.5 0 0 1 0 15H10" />
    </svg>
  )
}

/** Standalone orange illustration (no tile), mockup-style. */
function Illustration({ icon, secondary }: { icon: IconSvgElement; secondary?: IconSvgElement }) {
  return (
    <span aria-hidden="true" className="relative flex items-end text-brand-500">
      <HugeiconsIcon icon={icon} strokeWidth={1.5} className="size-16 sm:size-20" />
      {secondary ? (
        <HugeiconsIcon
          icon={secondary}
          strokeWidth={1.5}
          className="-ml-5 size-10 bg-card text-brand-600 sm:size-12"
        />
      ) : null}
    </span>
  )
}

function BookCover() {
  return (
    <span
      aria-hidden="true"
      className="flex h-23 w-18 -rotate-[8deg] flex-col justify-center gap-0.5 rounded-sm border-l-4 border-brand-800 bg-primary pr-1 pl-1.5 text-[10px] leading-none font-black tracking-tighter text-primary-foreground uppercase shadow-[3px_4px_0_0_var(--color-brand-800),0_10px_18px_-4px_rgb(0_0_0/0.3)] sm:h-26 sm:w-21 sm:pl-2 sm:text-xs"
    >
      <span className="-skew-y-3">The</span>
      <span className="-skew-y-3">Ecommerce</span>
      <span className="-skew-y-3">Playbook</span>
    </span>
  )
}

/** Small laptop showing an analytics screen (mockup's SuperPi illustration). */
function LaptopDashboard() {
  const bars = ["h-2", "h-3.5", "h-2.5", "h-5", "h-4"]
  const pie: CSSProperties = {
    background:
      "conic-gradient(var(--success) 0 45%, var(--primary) 45% 72%, var(--info) 72% 100%)",
  }
  return (
    <span aria-hidden="true" className="hidden w-24 shrink-0 flex-col items-center min-[400px]:flex sm:w-32">
      <span className="flex h-14 w-22 items-end sm:h-[4.5rem] sm:w-28 justify-between gap-1 rounded-t-md border-[3px] border-b-0 border-foreground bg-card p-1.5">
        <span className="flex flex-col gap-0.5 self-start">
          <span className="h-0.5 w-5 rounded-sm bg-muted-foreground/40" />
          <span className="h-0.5 w-4 rounded-sm bg-muted-foreground/30" />
          <span className="h-0.5 w-5 rounded-sm bg-muted-foreground/30" />
          <span className="h-0.5 w-3 rounded-sm bg-muted-foreground/30" />
        </span>
        <span className="flex items-end gap-0.5">
          {bars.map((height, index) => (
            <span key={index} className={cn("w-1 rounded-t-[1px] bg-success", height)} />
          ))}
        </span>
        <span className="size-4 self-center rounded-full" style={pie} />
      </span>
      <span className="h-1.5 w-24 rounded-b-md bg-gray-400 sm:h-2 sm:w-32" />
    </span>
  )
}

const SERVICES: Service[] = [
  {
    name: "SuperPi",
    tag: "Business Tool",
    tagIcon: ComputerIcon,
    description: "Inventory Management + Product Intelligence (AI)",
    href: "https://superpi.vercel.app/",
    visual: <SuperPiMark />,
    aside: <LaptopDashboard />,
  },
  {
    name: "The Ecommerce Playbook",
    tag: "eBook",
    tagIcon: Book01Icon,
    description: "A complete guide to start and scale your eCommerce business.",
    href: "https://direct2hubebooks.in/",
    visual: <BookCover />,
  },
  {
    name: "Packaging Materials",
    tag: "Sourcing",
    tagIcon: PackageIcon,
    description: "All essential packaging materials for eCommerce sellers.",
    visual: <Illustration icon={PackageIcon} secondary={PackageIcon} />,
  },
  {
    name: "Dropshipping Service",
    tag: "Fulfilment",
    tagIcon: PackageIcon,
    description: "Start selling without holding stock. We source, pack and ship for you.",
    visual: <Illustration icon={DeliveryTruck01Icon} />,
  },
]

/* ---------- Sections ---------- */

function ServicesHero() {
  return (
    <section className="relative overflow-hidden rounded-xl bg-linear-to-r from-brand-50 via-brand-50/60 to-brand-100 px-4 py-5 sm:px-6 sm:py-7">
      {/* Orange swoosh, bottom-right (mockup accent). */}
      <span
        aria-hidden="true"
        className="absolute -right-8 -bottom-12 size-28 rounded-full bg-primary/90 sm:size-36"
      />
      <div className="relative flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl leading-[1.1] font-extrabold tracking-tight text-foreground sm:text-3xl">
            Explore More
            <br />
            from <span className="text-primary">Direct2Hub</span>
          </h2>
          <p className="mt-2 max-w-sm text-sm leading-snug text-foreground/80">
            Powerful tools, learning resources, and services to grow your eCommerce
            business.
          </p>
        </div>
        <div aria-hidden="true" className="relative flex size-24 shrink-0 items-end justify-center sm:size-32">
          <HugeiconsIcon
            icon={SparklesIcon}
            strokeWidth={2}
            className="absolute top-0 left-0 size-4 text-brand-amber sm:size-5"
          />
          <HugeiconsIcon
            icon={SparklesIcon}
            strokeWidth={2}
            className="absolute top-5 right-0 size-3.5 text-brand-amber sm:size-4"
          />
          <HugeiconsIcon
            icon={Rocket01Icon}
            strokeWidth={1.8}
            className="absolute top-0 left-1/2 size-10 -translate-x-1/2 text-brand-600 sm:size-12"
          />
          <span className="relative z-10 flex size-14 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-lg sm:size-16 [&_svg]:size-9 sm:[&_svg]:size-10">
            <HugeiconsIcon icon={PackageOpenIcon} strokeWidth={1.8} />
          </span>
        </div>
      </div>
    </section>
  )
}

function ServiceCard({ service }: { service: Service }) {
  const comingSoon = !service.href

  const body = (
    <>
      <span className="flex w-20 shrink-0 items-center justify-center sm:w-28">
        {service.visual}
      </span>
      <span aria-hidden="true" className="h-16 w-px shrink-0 bg-border sm:h-20" />
      <span className="flex min-w-0 flex-1 flex-col items-start gap-2">
        <span className="text-lg leading-tight font-extrabold tracking-tight text-foreground sm:text-xl">
          {service.name}
        </span>
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs leading-none font-semibold text-brand-700 sm:text-sm [&_svg]:size-3.5 sm:[&_svg]:size-4">
            <HugeiconsIcon icon={service.tagIcon} strokeWidth={2} />
            {service.tag}
          </span>
          {comingSoon ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs leading-none font-semibold text-muted-foreground sm:text-sm [&_svg]:size-3.5 sm:[&_svg]:size-4">
              <HugeiconsIcon icon={Clock01Icon} strokeWidth={2} />
              Coming soon
            </span>
          ) : null}
        </span>
        <span className="text-sm leading-snug text-pretty text-foreground sm:text-base">
          {service.description}
        </span>
      </span>
      {service.aside}
      <HugeiconsIcon
        icon={ArrowRight01Icon}
        strokeWidth={2.2}
        aria-hidden="true"
        className={cn(
          "size-5 shrink-0 sm:size-6",
          comingSoon
            ? "text-muted-foreground/40"
            : "text-foreground transition-transform group-hover:translate-x-0.5",
        )}
      />
    </>
  )

  const base =
    "flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm sm:gap-5 sm:px-5 sm:py-5"

  if (comingSoon) {
    return (
      <div aria-disabled="true" className={base}>
        {body}
        <span className="sr-only">Coming soon</span>
      </div>
    )
  }

  return (
    <a
      href={service.href}
      target="_blank"
      rel="noreferrer"
      className={cn(
        base,
        "press group outline-none hover:border-brand-300 hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring/50",
      )}
    >
      {body}
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  )
}

function EnablementBanner() {
  return (
    <section className="flex items-center gap-3 rounded-xl border border-brand-100 bg-brand-50 px-4 py-4 sm:gap-4 sm:px-5">
      <HugeiconsIcon
        icon={Target02Icon}
        strokeWidth={2}
        aria-hidden="true"
        className="size-10 shrink-0 text-primary sm:size-12"
      />
      <div className="min-w-0">
        <p className="text-base leading-tight font-bold tracking-tight text-brand-700 sm:text-lg">
          All-in-One eCommerce Enablement
        </p>
        <p className="mt-1 text-xs text-foreground/80 sm:text-sm">
          Tools · Learning · Sourcing · Fulfilment · Brand Building
        </p>
      </div>
    </section>
  )
}

/** Full "More Services" content: hero, service cards, enablement banner. */
export function MoreServices() {
  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      <ServicesHero />
      <ul className="flex flex-col gap-3 sm:gap-4">
        {SERVICES.map((service) => (
          <li key={service.name}>
            <ServiceCard service={service} />
          </li>
        ))}
      </ul>
      <EnablementBanner />
    </div>
  )
}
