import type { Metadata } from "next"
import { requireAccount } from "@/lib/buyer/account-session"
import { AccountPageHeader } from "@/components/account/account-page-header"
import { RecentTab } from "../recent-tab"

export const metadata: Metadata = { title: "Recently viewed", robots: { index: false } }

export default async function RecentPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const [{ page }] = await Promise.all([searchParams, requireAccount("/account/recent")])
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-5">
      <AccountPageHeader title="Recently viewed" />
      <RecentTab page={Math.max(1, Number(page) || 1)} />
    </div>
  )
}
