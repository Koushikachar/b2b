import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getAuthUser } from "@/lib/auth/session"
import { getAccountStatement, parseStatementRange } from "@/lib/buyer/account-queries"

function csvCell(value: string | number): string {
  const s = String(value)
  // Quote everything; neutralise spreadsheet formula injection.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s
  return `"${safe.replace(/"/g, '""')}"`
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const sp = request.nextUrl.searchParams
  const range = parseStatementRange(sp.get("from") ?? undefined, sp.get("to") ?? undefined)
  const entries = await getAccountStatement(supabase, user.id, range.from, range.to)

  const rows = [
    ["Date", "Type", "Description", "Reference", "Debit (INR)", "Credit (INR)", "Status"],
    ...entries.map((e) => [
      e.date.slice(0, 10),
      e.kind === "order" ? "Order" : "Wallet",
      e.description,
      e.reference,
      e.debit ? e.debit.toFixed(2) : "",
      e.credit ? e.credit.toFixed(2) : "",
      e.status,
    ]),
  ]
  const csv = rows.map((r) => r.map(csvCell).join(",")).join("\r\n")

  return new NextResponse(`﻿${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="direct2hub-statement-${range.fromDay}-to-${range.toDay}.csv"`,
      "Cache-Control": "private, no-store",
    },
  })
}
