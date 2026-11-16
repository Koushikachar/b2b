import Link from "next/link"
import type { Metadata } from "next"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowRight01Icon, Call02Icon, Mail01Icon, WhatsappIcon } from "@hugeicons/core-free-icons"
import { requireAccount } from "@/lib/buyer/account-session"
import { SUPPORT_EMAIL, SUPPORT_PHONE, SUPPORT_WHATSAPP } from "@/lib/site"
import { normalizeUserPhone } from "@/lib/user-phone"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { AccountPage, AccountPageHeader } from "@/components/account/account-page-header"

export const metadata: Metadata = { title: "Contact us", robots: { index: false } }

const FAQS = [
  {
    q: "How do I track my order?",
    a: "Open Orders from My Account. Each order shows its current stage, from supplier review to delivery.",
  },
  {
    q: "How do I pay for an order?",
    a: "Once the supplier confirms your order, open it and follow the payment step. You can then submit your payment reference (UTR) for confirmation.",
  },
  {
    q: "Where do refunds go?",
    a: "Approved refunds are credited to your Direct2Hub Wallet. See Payments & Refunds for details.",
  },
  {
    q: "How do I add GST to my invoices?",
    a: "Add your GSTIN under My Account → GST Details. It is used for orders placed after you save it.",
  },
]

export default async function ContactPage() {
  await requireAccount("/account/contact")
  const channels = [
    SUPPORT_WHATSAPP && {
      label: "Chat on WhatsApp",
      detail: "Fastest response",
      href: `https://wa.me/91${normalizeUserPhone(SUPPORT_WHATSAPP)}?text=${encodeURIComponent("Hi Direct2Hub, I need help with")}`,
      icon: WhatsappIcon,
      external: true,
    },
    SUPPORT_PHONE && {
      label: "Call support",
      detail: SUPPORT_PHONE,
      href: `tel:${SUPPORT_PHONE.replace(/\s/g, "")}`,
      icon: Call02Icon,
      external: false,
    },
    SUPPORT_EMAIL && {
      label: "Email us",
      detail: SUPPORT_EMAIL,
      href: `mailto:${SUPPORT_EMAIL}`,
      icon: Mail01Icon,
      external: false,
    },
  ].filter(Boolean) as { label: string; detail: string; href: string; icon: typeof Mail01Icon; external: boolean }[]

  return (
    <AccountPage>
      <AccountPageHeader title="Contact Us" description="We're here to help with orders, payments and your account." />

      {channels.length > 0 ? (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {channels.map((c) => (
            <li key={c.label}>
              <a
                href={c.href}
                {...(c.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="press flex min-h-16 items-center gap-4 px-5 py-3 hover:bg-muted/60"
              >
                <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <HugeiconsIcon icon={c.icon} strokeWidth={1.8} className="size-5" />
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-semibold">{c.label}</span>
                  <span className="block text-xs text-muted-foreground">{c.detail}</span>
                </span>
                <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-5 text-muted-foreground" />
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
          For help with an order, open it from <Link href="/orders" className="font-semibold text-primary">Orders</Link> and
          message the supplier directly.
        </p>
      )}

      <h2 className="mt-6 mb-2 text-base font-bold tracking-tight">Frequently asked questions</h2>
      <Accordion className="rounded-2xl border border-border bg-card px-4">
        {FAQS.map((faq) => (
          <AccordionItem key={faq.q} value={faq.q}>
            <AccordionTrigger className="text-sm font-semibold">{faq.q}</AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground">{faq.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </AccountPage>
  )
}
