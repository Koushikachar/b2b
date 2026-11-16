import Link from "next/link"
import type { ReactNode } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons"

/** Back-to-account title bar shared by every /account/* sub-page. */
export function AccountPageHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="mb-4 flex items-start gap-2">
      <Link
        href="/account"
        aria-label="Back to My Account"
        className="press -ml-2 flex size-10 shrink-0 items-center justify-center rounded-lg text-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2.2} className="size-5" />
      </Link>
      <div className="min-w-0 flex-1 pt-1.5">
        <h1 className="text-xl leading-tight font-bold tracking-tight">{title}</h1>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0 pt-1">{action}</div> : null}
    </div>
  )
}

/** Standard width/padding wrapper for account sub-pages. */
export function AccountPage({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-3xl px-4 py-5">{children}</div>
}
