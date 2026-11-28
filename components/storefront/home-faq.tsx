import Link from "next/link"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowDown01Icon } from "@hugeicons/core-free-icons"
import { FAQS, faqJsonLd } from "@/lib/seo"
import { serializeJsonLd } from "@/lib/json-ld"

/**
 * Home page FAQ: the most asked questions (FAQS marked `home`), visible to
 * people and sent as FAQPage data for search and AI answer engines. Plain
 * <details>, so it works without JavaScript and every answer is in the HTML.
 */
export function HomeFaq() {
  const faqs = FAQS.filter((faq) => faq.home)
  return (
    <section aria-labelledby="home-faq-title" className="mx-auto w-full max-w-4xl px-4 py-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqJsonLd(faqs)) }} />
      <h2 id="home-faq-title" className="text-lg font-bold tracking-tight sm:text-xl">
        Questions about buying wholesale on Direct2Hub
      </h2>
      <div className="mt-3 divide-y divide-border rounded-lg border border-border bg-card">
        {faqs.map((faq) => (
          <details key={faq.question} className="group px-4 py-3">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
              <h3 className="text-sm font-semibold">{faq.question}</h3>
              <HugeiconsIcon
                icon={ArrowDown01Icon}
                strokeWidth={2}
                className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
              />
            </summary>
            <p className="mt-2 text-sm text-muted-foreground">{faq.answer}</p>
          </details>
        ))}
      </div>
      <Link href="/faq" className="mt-3 inline-block text-sm font-semibold text-primary hover:underline">
        See all questions
      </Link>
    </section>
  )
}
