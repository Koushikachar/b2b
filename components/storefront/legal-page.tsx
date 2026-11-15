import type { ReactNode } from "react"
import Link from "next/link"
import { Breadcrumbs } from "@/components/layout/breadcrumbs"
import { SUPPORT_EMAIL } from "@/lib/site"

export type LegalSection = { title: string; body: ReactNode }

/** Shared layout for Privacy Policy / Terms: one H1, numbered sections. */
export function LegalPage({
  title,
  updated,
  intro,
  sections,
}: {
  title: string
  updated: string
  intro: ReactNode
  sections: LegalSection[]
}) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-5 sm:py-8">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: title }]} />
      <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
      <p className="mt-1 text-xs text-muted-foreground">Last updated {updated}</p>
      <div className="mt-4 text-sm leading-relaxed text-foreground/85">{intro}</div>
      <ol className="mt-6 flex flex-col gap-6">
        {sections.map((section, index) => (
          <li key={section.title}>
            <h2 className="text-base font-bold tracking-tight">
              {index + 1}. {section.title}
            </h2>
            <div className="mt-1.5 flex flex-col gap-2 text-sm leading-relaxed text-foreground/85">
              {section.body}
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-8 rounded-lg border border-border bg-muted/40 p-4 text-sm">
        Questions?{" "}
        {SUPPORT_EMAIL ? (
          <>
            Email{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-primary hover:underline">
              {SUPPORT_EMAIL}
            </a>{" "}
            or visit{" "}
          </>
        ) : (
          "Visit "
        )}
        <Link href="/account/contact" className="font-semibold text-primary hover:underline">
          Contact us
        </Link>
        .
      </p>
    </div>
  )
}
