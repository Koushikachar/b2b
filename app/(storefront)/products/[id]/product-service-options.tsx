"use client"

import { useState } from "react"
import Image from "next/image"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import {
  ArrowUpRight01Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  InformationCircleIcon,
  PackageDeliveredIcon,
  Shield01Icon,
  WhatsappIcon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { COMPANY } from "@/lib/company"

type Service = {
  key: string
  icon: IconSvgElement
  /** Tile title on the strip. */
  label: string
  /** One-line benefit under the tile title. */
  hint: string
  title: string
  subtitle: string
  intro: { heading: string; text: string }
  listHeading: string
  list: string[]
  note: { heading: string; text: string }
}

const partner = COMPANY.shippingPartner

const SERVICES: Service[] = [
  {
    key: "fbd",
    icon: PackageDeliveredIcon,
    label: "FBD",
    hint: "Fulfilled",
    title: "Fulfilled by Direct2Hub",
    subtitle: "Order Fulfilment Service",
    intro: {
      heading: "What does this mean?",
      text: "This product is fulfilled by Direct2Hub. We coordinate order processing, packing, and dispatch to help ensure a smooth and reliable ordering experience.",
    },
    listHeading: "What you can expect",
    list: [
      "Order processing coordinated by Direct2Hub",
      "Packing and dispatch coordination",
      "Order-related support",
    ],
    note: {
      heading: "Please note",
      text: "Fulfilment timelines may vary depending on product availability, order volume, and logistics conditions.",
    },
  },
  {
    key: "ddp",
    icon: Shield01Icon,
    label: "DDP",
    hint: "Damage protected",
    title: "Delivery Damage Protection",
    subtitle: `Powered by ${partner}`,
    intro: {
      heading: "Your shipment deserves protection.",
      text: `Eligible orders receive free Delivery Damage Protection through our shipping partner, ${partner}.`,
    },
    listHeading: "Protection benefits",
    list: [
      "Free protection for eligible shipments",
      "Potential coverage of up to 100% of eligible damage value, subject to applicable terms",
      "Assistance with eligible damage claims",
    ],
    note: {
      heading: "Important conditions",
      text: `Record a clear, continuous parcel-opening video showing the package from all sides (360°), especially for shipments delivered outside Surat. Keep the original packaging and contact support promptly if damage is discovered. Claims are subject to eligibility, evidence requirements, verification and ${partner}'s applicable protection terms. Coverage is not guaranteed for every claim.`,
    },
  },
  {
    key: "delivery",
    icon: Clock01Icon,
    label: "5–7 Days",
    hint: "Delivery",
    title: "5–7 Days",
    subtitle: "Estimated Delivery Time",
    intro: {
      heading: `Reliable Shipping with ${partner}`,
      text: `Direct2Hub partners with ${partner} to provide reliable shipping and delivery services. We aim to deliver your orders within 5–7 days, depending on your delivery location and logistics conditions.`,
    },
    listHeading: "Delivery Benefits",
    list: [
      "Estimated delivery within 5–7 days",
      `Shipping handled by ${partner}`,
      "Order tracking when available",
      "Free Delivery Damage Protection on eligible shipments",
    ],
    note: {
      heading: "Important Information",
      text: "Delivery timelines are estimates and may vary based on location, courier serviceability, weather, holidays, or unexpected logistical delays. Shipping charges are additional to the product price.",
    },
  },
]

/** Brand-gradient icon tile used on the strip and in the panel header. */
function IconBadge({ icon, size }: { icon: IconSvgElement; size: "sm" | "lg" }) {
  return (
    <span
      className={
        size === "lg"
          ? "flex size-14 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-brand-500 to-destructive text-white shadow-lg shadow-brand-500/30 [&_svg]:size-7"
          : "flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15 ring-inset transition-colors group-hover:bg-primary group-hover:text-primary-foreground [&_svg]:size-5"
      }
    >
      <HugeiconsIcon icon={icon} strokeWidth={2} />
    </span>
  )
}

function ServicePanel({ service }: { service: Service }) {
  return (
    <>
      {/* Header: brand gradient wash, big icon, title. */}
      <div className="relative overflow-hidden border-b border-border bg-linear-to-br from-brand-100 via-brand-50 to-card px-5 pt-6 pb-5">
        <span aria-hidden className="absolute -top-10 -right-10 size-36 rounded-full bg-brand-200/60" />
        <div className="relative flex items-center gap-4 pr-8">
          <IconBadge icon={service.icon} size="lg" />
          <div className="min-w-0">
            <DialogTitle className="text-lg leading-tight font-extrabold tracking-tight text-foreground">
              {service.title}
            </DialogTitle>
            <DialogDescription className="mt-0.5 text-sm font-medium text-brand-700">
              {service.subtitle}
            </DialogDescription>
          </div>
        </div>
      </div>

      {/* Body. */}
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-5 text-foreground antialiased">
        <section>
          <h3 className="text-[15px] font-bold">{service.intro.heading}</h3>
          <p className="mt-1 text-sm leading-relaxed text-foreground/80">{service.intro.text}</p>
        </section>
        <section>
          <h3 className="text-[15px] font-bold">{service.listHeading}</h3>
          <ul className="mt-2 flex flex-col gap-2">
            {service.list.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2.5 rounded-lg border border-success/20 bg-success/5 px-3 py-2.5 text-sm leading-snug"
              >
                <HugeiconsIcon
                  icon={CheckmarkCircle02Icon}
                  strokeWidth={2}
                  className="mt-px size-4.5 shrink-0 text-success"
                />
                {item}
              </li>
            ))}
          </ul>
        </section>
        <section className="flex gap-2.5 rounded-lg border border-border bg-muted/50 p-3">
          <HugeiconsIcon
            icon={InformationCircleIcon}
            strokeWidth={2}
            className="mt-px size-4.5 shrink-0 text-muted-foreground"
          />
          <div>
            <h3 className="text-sm font-semibold">{service.note.heading}</h3>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{service.note.text}</p>
          </div>
        </section>
      </div>

      {/* Footer: light brand gradient behind the action. */}
      <div className="border-t border-border bg-linear-to-t from-brand-100 to-brand-50/50 px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <DialogClose render={<Button size="lg" className="h-11 w-full text-base font-bold" />}>
          Got it
        </DialogClose>
      </div>
    </>
  )
}

/**
 * Service strip on the product page: three service tiles that each open a
 * detail panel, plus a WhatsApp chat with D2H Core.
 */
export function ProductServiceOptions({ whatsappHref }: { whatsappHref: string }) {
  const [selected, setSelected] = useState<Service | null>(null)

  return (
    <section aria-labelledby="service-options-heading">
      <h2
        id="service-options-heading"
        className="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
      >
        Service &amp; Delivery
      </h2>
      {/* One bordered band, hairline-divided cells (DESIGN.md "Service strip"). */}
      <div className="mt-2 grid grid-cols-3 divide-x divide-border overflow-hidden rounded-lg border border-border bg-card">
        {SERVICES.map((service) => (
          <button
            key={service.key}
            type="button"
            onClick={() => setSelected(service)}
            aria-haspopup="dialog"
            aria-label={`${service.label}: ${service.hint}. View details`}
            className="press group relative flex min-w-0 flex-col items-center gap-1.5 px-2 pt-3.5 pb-3 text-center outline-none transition-colors hover:bg-primary/5 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-inset"
          >
            <HugeiconsIcon
              icon={InformationCircleIcon}
              strokeWidth={2}
              aria-hidden
              className="absolute top-1.5 right-1.5 size-3.5 text-muted-foreground/60 transition-colors group-hover:text-primary"
            />
            <IconBadge icon={service.icon} size="sm" />
            <span className="w-full min-w-0">
              <span className="block text-sm leading-tight font-bold text-foreground">{service.label}</span>
              <span className="mt-0.5 line-clamp-2 block text-[11px] leading-snug text-muted-foreground">{service.hint}</span>
            </span>
          </button>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-1.5">
        <span className="text-xs text-muted-foreground">
          Delivered by <span className="font-semibold text-foreground">{partner}</span>
        </span>
        {/* 148×96 source shown at 49×32: same aspect ratio, sharp on 2× screens. */}
        <Image src="/brands/vyoma-route.webp" alt={`${partner} logo`} width={49} height={32} />
      </div>
      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        className="press group mt-2 flex items-center gap-2.5 rounded-xl border border-whatsapp/30 bg-whatsapp/10 px-3 py-2.5 text-sm font-semibold text-whatsapp-dark outline-none hover:bg-whatsapp/15 focus-visible:ring-[3px] focus-visible:ring-whatsapp"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-whatsapp text-white [&_svg]:size-4.5">
          <HugeiconsIcon icon={WhatsappIcon} strokeWidth={2} />
        </span>
        <span className="min-w-0 flex-1">
          WhatsApp Now
          <span className="block text-xs font-normal text-whatsapp-dark/80">Quick answers from D2H Core</span>
        </span>
        <HugeiconsIcon icon={ArrowUpRight01Icon} strokeWidth={2} className="size-4 shrink-0" />
      </a>

      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
      >
        {/* Positioned without translate/scale transforms (bottom sheet on phones,
            margin-centred on desktop) so the text renders sharp, not blurred. */}
        <DialogContent
          className="top-auto right-0 bottom-0 left-0 flex max-h-[88dvh] max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-b-none p-0 sm:top-0 sm:right-0 sm:bottom-0 sm:left-0 sm:m-auto sm:h-fit sm:max-h-[85dvh] sm:max-w-lg sm:rounded-2xl"
        >
          {selected ? <ServicePanel service={selected} /> : null}
        </DialogContent>
      </Dialog>
    </section>
  )
}
