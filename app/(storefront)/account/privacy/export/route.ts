import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getAuthUser } from "@/lib/auth/session"
import { getBuyerProfile, getBuyerPayments, getWallet } from "@/lib/buyer/account-queries"
import { getBuyerAddresses } from "@/lib/buyer/address-queries"

/** "Download my data": everything the account holds about the buyer, as JSON. */
export async function GET() {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const [profile, addresses, payments, wallet] = await Promise.all([
    getBuyerProfile(supabase, user.id, user.email),
    getBuyerAddresses(supabase, user.id),
    getBuyerPayments(supabase, user.id),
    getWallet(supabase, user.id, 1000),
  ])

  const body = JSON.stringify(
    { exportedAt: new Date().toISOString(), profile, addresses, orders: payments, wallet },
    null,
    2,
  )
  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="direct2hub-my-data.json"`,
      "Cache-Control": "private, no-store",
    },
  })
}
