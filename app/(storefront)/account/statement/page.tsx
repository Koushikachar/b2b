import Link from "next/link"
import type { Metadata } from "next"
import { HugeiconsIcon } from "@hugeicons/react"
import { Download04Icon } from "@hugeicons/core-free-icons"
import { requireAccount } from "@/lib/buyer/account-session"
import { getAccountStatement, parseStatementRange } from "@/lib/buyer/account-queries"
import { formatDateMed, formatRupees } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AccountPage, AccountPageHeader } from "@/components/account/account-page-header"

export const metadata: Metadata = { title: "Account statement", robots: { index: false } }

export default async function StatementPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>
}) {
  const [sp, { supabase, user }] = await Promise.all([searchParams, requireAccount("/account/statement")])
  const range = parseStatementRange(sp.from, sp.to)
  const entries = await getAccountStatement(supabase, user.id, range.from, range.to)
  const totalDebit = entries.reduce((s, e) => s + e.debit, 0)
  const totalCredit = entries.reduce((s, e) => s + e.credit, 0)
  const qs = `from=${range.fromDay}&to=${range.toDay}`

  return (
    <AccountPage>
      <AccountPageHeader
        title="Account Statement"
        description="Purchases and wallet movements for a date range."
        action={
          <Button
            size="sm"
            variant="outline"
            nativeButton={false}
            render={<a href={`/account/statement/download?${qs}`} download />}
          >
            <HugeiconsIcon icon={Download04Icon} strokeWidth={2} />
            CSV
          </Button>
        }
      />

      <form className="flex flex-wrap items-end gap-2 rounded-2xl border border-border bg-card p-3">
        <label className="flex min-w-[9rem] flex-1 flex-col gap-1 text-xs font-medium text-muted-foreground">
          From
          <Input type="date" name="from" defaultValue={range.fromDay} />
        </label>
        <label className="flex min-w-[9rem] flex-1 flex-col gap-1 text-xs font-medium text-muted-foreground">
          To
          <Input type="date" name="to" defaultValue={range.toDay} />
        </label>
        <Button type="submit" className="h-9">Apply</Button>
      </form>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Purchases</p>
          <p className="mt-1 text-lg font-bold tabular-nums">{formatRupees(totalDebit)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Credits</p>
          <p className="mt-1 text-lg font-bold text-success tabular-nums">{formatRupees(totalCredit)}</p>
        </div>
      </div>

      {entries.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Nothing in this period. Try a wider date range.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {entries.map((e) => {
            const body = (
              <>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {e.description} · <span className="font-normal text-muted-foreground">{e.reference}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDateMed(e.date)} · {e.status}</p>
                </div>
                <span className={`text-sm font-bold tabular-nums ${e.credit ? "text-success" : ""}`}>
                  {e.credit ? `+${formatRupees(e.credit)}` : `−${formatRupees(e.debit)}`}
                </span>
              </>
            )
            return (
              <li key={`${e.kind}-${e.id}`}>
                {e.href ? (
                  <Link href={e.href} className="press flex items-center gap-3 px-4 py-3 hover:bg-muted/60">
                    {body}
                  </Link>
                ) : (
                  <div className="flex items-center gap-3 px-4 py-3">{body}</div>
                )}
              </li>
            )
          })}
        </ul>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        Open an order to view its quotation and invoice details.
      </p>
    </AccountPage>
  )
}
