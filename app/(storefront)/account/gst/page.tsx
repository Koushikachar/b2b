import type { Metadata } from "next"
import { requireAccount } from "@/lib/buyer/account-session"
import { getBuyerProfile } from "@/lib/buyer/account-queries"
import { AccountPage, AccountPageHeader } from "@/components/account/account-page-header"
import { GstForm } from "./gst-form"

export const metadata: Metadata = { title: "GST details", robots: { index: false } }

export default async function GstPage() {
  const { supabase, user } = await requireAccount("/account/gst")
  const profile = await getBuyerProfile(supabase, user.id, user.email)
  return (
    <AccountPage>
      <AccountPageHeader
        title="GST Details"
        description="Add your GSTIN to claim input tax credit on business purchases."
      />
      <GstForm
        gstin={profile.gstin ?? ""}
        businessName={profile.gstBusinessName ?? ""}
        address={profile.gstAddress ?? ""}
      />
    </AccountPage>
  )
}
