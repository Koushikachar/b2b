import type { Metadata } from "next"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowRight01Icon, Delete02Icon, Download04Icon } from "@hugeicons/core-free-icons"
import { requireAccount } from "@/lib/buyer/account-session"
import { getBuyerProfile } from "@/lib/buyer/account-queries"
import { SUPPORT_EMAIL } from "@/lib/site"
import { AccountPage, AccountPageHeader } from "@/components/account/account-page-header"
import { MarketingToggle } from "./privacy-controls"

export const metadata: Metadata = { title: "Account privacy", robots: { index: false } }

const ROW = "press flex min-h-14 items-center gap-4 px-5 py-3 hover:bg-muted/60"

export default async function PrivacyPage() {
  const { supabase, user } = await requireAccount("/account/privacy")
  const profile = await getBuyerProfile(supabase, user.id, user.email)
  const deletionHref = SUPPORT_EMAIL
    ? `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Account deletion request")}&body=${encodeURIComponent(`Please delete my Direct2Hub account (${user.email}).`)}`
    : "/contact"

  return (
    <AccountPage>
      <AccountPageHeader title="Account Privacy" description="Control your data and how we contact you." />

      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <h2 className="px-5 pt-4 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Communication</h2>
        <MarketingToggle initial={profile.marketingOptIn} />
      </section>

      <section className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
        <h2 className="px-5 pt-4 pb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Your data</h2>
        <ul className="divide-y divide-border">
          <li>
            <a href="/account/privacy/export" download className={ROW}>
              <HugeiconsIcon icon={Download04Icon} strokeWidth={1.8} className="size-6 text-foreground/80" />
              <span className="flex-1">
                <span className="block text-sm font-semibold">Download my data</span>
                <span className="block text-xs text-muted-foreground">Profile, addresses, orders and wallet as a JSON file.</span>
              </span>
              <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-5 text-muted-foreground" />
            </a>
          </li>
          <li>
            <a href={deletionHref} className={`${ROW} text-destructive`}>
              <HugeiconsIcon icon={Delete02Icon} strokeWidth={1.8} className="size-6" />
              <span className="flex-1">
                <span className="block text-sm font-semibold">Delete my account</span>
                <span className="block text-xs text-muted-foreground">
                  Our team verifies the request and deletes your account and data. Open orders must be completed first.
                </span>
              </span>
              <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-5 text-muted-foreground" />
            </a>
          </li>
        </ul>
      </section>
    </AccountPage>
  )
}
