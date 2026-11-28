import type { Metadata } from "next"
import { LegalPage } from "@/components/storefront/legal-page"
import { serializeJsonLd } from "@/lib/json-ld"
import { FAQS, faqJsonLd } from "@/lib/seo"
import { DEFAULT_OG_IMAGE } from "@/lib/seo"

const DESCRIPTION =
  "Answers about buying wholesale on Direct2Hub: ₹3,000 minimum order, GST invoices, 5–7 day delivery, damage protection, payment, tracking and returns."

export const metadata: Metadata = {
  title: "Wholesale FAQ — Minimum Order, GST & Delivery",
  description: DESCRIPTION,
  alternates: { canonical: "/faq" },
  openGraph: { title: "Direct2Hub FAQ", description: DESCRIPTION, url: "/faq", images: [DEFAULT_OG_IMAGE] },
}

export default function FaqPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqJsonLd(FAQS)) }}
      />
      <LegalPage
        title="Frequently Asked Questions"
        numbered={false}
        intro={<p>Quick answers about buying wholesale on Direct2Hub.</p>}
        sections={FAQS.map((faq) => ({ title: faq.question, body: <p>{faq.answer}</p> }))}
      />
    </>
  )
}
