import Link from "next/link"
import type { Metadata } from "next"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowDownLeft01Icon, ArrowUpRight01Icon, Wallet01Icon } from "@hugeicons/core-free-icons"
import { requireAccount } from "@/lib/buyer/account-session"
import { getWallet } from "@/lib/buyer/account-queries"
import { formatRupees } from "@/lib/format"
import { cn } from "@/lib/utils"
import { AccountPage, AccountPageHeader } from "@/components/account/account-page-header"

export const metadata: Metadata = { title: "Direct2Hub Wallet", robots: { index: false } }

const dateTime = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Kolkata",
})

export default async function WalletPage() {
  const { supabase, user } = await requireAccount("/account/wallet")
  const { balance, transactions } = await getWallet(supabase, user.id, 100)
  const credits = transactions.filter((t) => t.direction === "credit").reduce((s, t) => s + t.amount, 0)
  const debits = transactions.filter((t) => t.direction === "debit").reduce((s, t) => s + t.amount, 0)

  return (
    <AccountPage>
      <AccountPageHeader title="Direct2Hub Wallet" />

      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-destructive p-5 text-primary-foreground shadow-sm">
        <span aria-hidden className="absolute -right-8 -bottom-12 size-40 rounded-full bg-white/10" />
        <div className="relative flex items-center gap-2 text-sm font-medium opacity-90">
          <HugeiconsIcon icon={Wallet01Icon} strokeWidth={2} className="size-5" />
          Available balance
        </div>
        <p className="relative mt-2 text-4xl font-extrabold tracking-tight tabular-nums">{formatRupees(balance)}</p>
        <div className="relative mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-white/15 px-3 py-2">
            <p className="text-xs opacity-80">Total credited</p>
            <p className="font-bold tabular-nums">{formatRupees(credits)}</p>
          </div>
          <div className="rounded-lg bg-white/15 px-3 py-2">
            <p className="text-xs opacity-80">Total used</p>
            <p className="font-bold tabular-nums">{formatRupees(debits)}</p>
          </div>
        </div>
      </section>

      <h2 className="mt-6 mb-2 text-base font-bold tracking-tight">Transaction history</h2>
      {transactions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <p className="text-sm font-medium">No transactions yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Your signup bonus, rewards and refunds will show up here.
          </p>
          <Link href="/products" className="mt-3 inline-block text-sm font-semibold text-primary hover:underline">
            Shop products
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {transactions.map((t) => {
            const credit = t.direction === "credit"
            return (
              <li key={t.id} className="flex items-center gap-3 px-4 py-3">
                <span
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-lg",
                    credit ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                  )}
                >
                  <HugeiconsIcon icon={credit ? ArrowDownLeft01Icon : ArrowUpRight01Icon} strokeWidth={2} className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{t.description}</p>
                  <p className="text-xs text-muted-foreground">{dateTime.format(new Date(t.createdAt))}</p>
                </div>
                <p className={cn("text-sm font-bold tabular-nums", credit ? "text-success" : "text-destructive")}>
                  {credit ? "+" : "−"}
                  {formatRupees(t.amount)}
                </p>
              </li>
            )
          })}
        </ul>
      )}
    </AccountPage>
  )
}
