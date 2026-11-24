import type { ReactNode } from "react"
import Link from "next/link"
import { Breadcrumbs } from "@/components/layout/breadcrumbs"
import { COMPANY } from "@/lib/company"

export type LegalSection = { title: string; body: ReactNode }

/**
 * Shared layout for About, Contact, Privacy Policy and Terms: a light brand
 * gradient header (same tokens as More Services), one H1, then sections.
 */
export function LegalPage({
  title,
  updated,
  intro,
  sections,
  numbered = true,
}: {
  title: string
  /** "Last updated" date; omit on pages that are not policies. */
  updated?: string
  intro: ReactNode
  sections: LegalSection[]
  numbered?: boolean
}) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-4 sm:py-6">
      <header className="rounded-xl bg-linear-to-br from-brand-50 via-brand-50/60 to-brand-100 px-4 py-5 sm:px-6">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: title }]} />
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
        {updated ? (
          <p className="mt-1 text-xs text-muted-foreground">Last updated {updated}</p>
        ) : null}
        <div className="mt-3 text-sm leading-relaxed text-foreground/85">{intro}</div>
      </header>
      <ol className="mt-5 flex flex-col gap-5">
        {sections.map((section, index) => (
          <li key={section.title}>
            <h2 className="text-base font-bold tracking-tight">
              {numbered ? `${index + 1}. ` : ""}
              {section.title}
            </h2>
            <div className="mt-1.5 flex flex-col gap-2 text-sm leading-relaxed text-foreground/85">
              {section.body}
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-5 rounded-lg border border-border bg-linear-to-r from-brand-50/70 to-card p-4 text-sm">
        Questions? Email{" "}
        <a href={`mailto:${COMPANY.supportEmail}`} className="font-semibold text-primary hover:underline">
          {COMPANY.supportEmail}
        </a>{" "}
        or visit{" "}
        <Link href="/contact" className="font-semibold text-primary hover:underline">
          Contact us
        </Link>
        .
      </p>
    </div>
  )
}

/** Bulleted list for section bodies. */
export function LegalList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="ml-4 list-disc space-y-1 marker:text-primary">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  )
}

/** Registered company block, shared by About, Contact and Terms. */
export function CompanyDetails() {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="font-semibold">{COMPANY.legalName}</p>
      <dl className="mt-1 grid gap-1 text-sm sm:grid-cols-[max-content_1fr] sm:gap-x-4">
        <dt className="text-muted-foreground">CIN</dt>
        <dd className="font-mono">{COMPANY.cin}</dd>
        <dt className="text-muted-foreground">Registered office</dt>
        <dd>{COMPANY.office}</dd>
        <dt className="text-muted-foreground">Customer support</dt>
        <dd>
          <a href={`mailto:${COMPANY.supportEmail}`} className="text-primary hover:underline">
            {COMPANY.supportEmail}
          </a>
        </dd>
        <dt className="text-muted-foreground">General enquiries</dt>
        <dd>
          <a href={`mailto:${COMPANY.contactEmail}`} className="text-primary hover:underline">
            {COMPANY.contactEmail}
          </a>
        </dd>
        <dt className="text-muted-foreground">Website</dt>
        <dd>
          <a href={COMPANY.website} className="text-primary hover:underline">
            {COMPANY.website.replace("https://", "")}
          </a>
        </dd>
      </dl>
    </div>
  )
}
