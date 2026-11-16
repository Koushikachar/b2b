import Link from "next/link"
import type { Metadata } from "next"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { requireAccount } from "@/lib/buyer/account-session"
import { getBuyerPayments, getWallet } from "@/lib/buyer/account-queries"
import { formatDateMed, formatRupees } from "@/lib/format"
import { PAYMENT_STATUS_LABELS, type PaymentStatus } from "@/lib/orders/lifecycle"
import { Badge } from "@/components/ui/badge"
import { AccountPage, AccountPageHeader } from "@/components/account/account-page-header"

export const metadata: Metadata = { title: "Payments & refunds", robots: { index: false } }

const BADGE: Record<PaymentStatus, "success" | "warning" | "secondary" | "default"> = {
  paid: "success",
  claimed: "default",
  pending: "warning",
  not_requested: "secondary",
}

export default async function PaymentsPage() {
  const { supabase, user } = await requireAccount("/account/payments")
  const [payments, wallet] = await Promise.all([
    getBuyerPayments(supabase, user.id),
    getWallet(supabase, user.id, 200),
  ])
  const refunds = wallet.transactions.filter((t) => t.reason === "refund")
  const paid = payments.filter((p) => p.paymentStatus === "paid").reduce((s, p) => s + p.total, 0)
  const due = payments
    .filter((p) => p.paymentStatus === "pending" && p.orderStatus !== "cancelled")
    .reduce((s, p) => s + p.total, 0)

  return (
    <AccountPage>
      <AccountPageHeader title="Payments & Refunds" />

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Paid</p>
          <p className="mt-1 text-xl font-bold tabular-nums">{formatRupees(paid)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Awaiting payment</p>
          <p className="mt-1 text-xl font-bold text-warning tabular-nums">{formatRupees(due)}</p>
        </div>
      </div>

      <h2 className="mt-6 mb-2 text-base font-bold tracking-tight">Payments</h2>
      {payments.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No payments yet. They appear here once you place an order.
        </p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {payments.map((p) => (
            <li key={p.orderId}>
              <Link href={`/orders/${p.orderId}`} className="press flex items-center gap-3 px-4 py-3 hover:bg-muted/60">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">Order {p.reference}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateMed(p.createdAt)}
                    {p.claimReference ? ` · UTR ${p.claimReference}` : ""}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-sm font-bold tabular-nums">{formatRupees(p.total)}</span>
                  <Badge variant={BADGE[p.paymentStatus]}>{PAYMENT_STATUS_LABELS[p.paymentStatus]}</Badge>
                </div>
                <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-4 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-6 mb-2 text-base font-bold tracking-tight">Refunds</h2>
      {refunds.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
          No refunds. Approved refunds are credited to your Direct2Hub Wallet.
        </p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {refunds.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{r.description}</p>
                <p className="text-xs text-muted-foreground">{formatDateMed(r.createdAt)} · Credited to wallet</p>
              </div>
              <span className="text-sm font-bold text-success tabular-nums">+{formatRupees(r.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </AccountPage>
  )
}
