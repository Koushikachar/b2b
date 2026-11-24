import type { Metadata } from "next"
import { requireAccount } from "@/lib/buyer/account-session"
import { getBuyerAddresses } from "@/lib/buyer/address-queries"
import { addressDefaults, getBuyerProfile } from "@/lib/buyer/account-queries"
import { AccountPage, AccountPageHeader } from "@/components/account/account-page-header"
import { AddressesTab } from "../addresses-tab"

export const metadata: Metadata = { title: "Address book", robots: { index: false } }

export default async function AddressesPage() {
  const { supabase, user } = await requireAccount("/account/addresses")
  const [addresses, profile] = await Promise.all([
    getBuyerAddresses(supabase, user.id),
    getBuyerProfile(supabase, user.id, user.email ?? ""),
  ])
  return (
    <AccountPage>
      <AccountPageHeader title="Address Book" description="Delivery addresses used at checkout. Mark one as default." />
      <AddressesTab addresses={addresses} defaults={addressDefaults(profile)} />
    </AccountPage>
  )
}
