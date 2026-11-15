import Link from "next/link"
import type { Metadata } from "next"
import { HugeiconsIcon } from "@hugeicons/react"
import { Home01Icon, Search01Icon, Store01Icon } from "@hugeicons/core-free-icons"
import { Logo } from "@/components/layout/logo"

export const metadata: Metadata = {
  title: "Page not found",
  description: "The page you were looking for does not exist or has moved.",
  robots: { index: false, follow: true },
}

const LINKS = [
  { href: "/", label: "Home", icon: Home01Icon },
  { href: "/products", label: "Browse products", icon: Search01Icon },
  { href: "/stores", label: "Stores", icon: Store01Icon },
]

export default function NotFound() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-background px-4 py-16 text-center">
      <Logo className="size-10" />
      <p className="mt-6 text-6xl font-extrabold tracking-tight text-primary tabular-nums">404</p>
      <h1 className="mt-2 text-xl font-bold tracking-tight sm:text-2xl">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        The page you were looking for doesn&apos;t exist or has moved. Try one of these instead.
      </p>
      <nav aria-label="Helpful links" className="mt-6 flex w-full max-w-sm flex-col gap-2 sm:flex-row">
        {LINKS.map((link, index) => (
          <Link
            key={link.href}
            href={link.href}
            className={
              index === 0
                ? "press flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-primary text-sm font-bold text-primary-foreground hover:bg-brand-dark"
                : "press flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-card text-sm font-semibold hover:bg-muted"
            }
          >
            <HugeiconsIcon icon={link.icon} strokeWidth={2} className="size-4" />
            {link.label}
          </Link>
        ))}
      </nav>
    </main>
  )
}
