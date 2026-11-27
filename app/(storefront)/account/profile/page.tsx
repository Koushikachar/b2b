import type { Metadata } from "next"
import { requireAccount } from "@/lib/buyer/account-session"
import { getBuyerProfile } from "@/lib/buyer/account-queries"
import { publicTransformedImageUrl } from "@/lib/storage"
import { AccountPage, AccountPageHeader } from "@/components/account/account-page-header"
import { EmailChangeForm, ProfileForm } from "./profile-form"

export const metadata: Metadata = { title: "Edit profile", robots: { index: false } }

export default async function ProfilePage() {
  const { supabase, user } = await requireAccount("/account/profile")
  const profile = await getBuyerProfile(supabase, user.id, user.email)

  return (
    <AccountPage>
      <AccountPageHeader title="Edit profile" description="Your photo, name and contact details." />
      <div className="flex flex-col gap-4">
        <ProfileForm
          fullName={profile.fullName ?? ""}
          phone={profile.phone ?? ""}
          phoneVerified={profile.phoneVerified}
          businessType={profile.businessType}
          avatarUrl={
            profile.avatarPath
              ? publicTransformedImageUrl("avatars", profile.avatarPath, { width: 224, height: 224 })
              : null
          }
        />
        <EmailChangeForm email={user.email} />
      </div>
    </AccountPage>
  )
}
