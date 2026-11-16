import type { Metadata } from "next"
import { requireAccount } from "@/lib/buyer/account-session"
import { AccountPageHeader } from "@/components/account/account-page-header"
import { SavedTab } from "../saved-tab"

export const metadata: Metadata = { title: "Wishlist", robots: { index: false } }

export default async function WishlistPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const [{ page }] = await Promise.all([searchParams, requireAccount("/account/wishlist")])
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-5">
      <AccountPageHeader title="Wishlist" description="Products you saved. Add them to cart when you're ready." />
      <SavedTab page={Math.max(1, Number(page) || 1)} />
    </div>
  )
}
