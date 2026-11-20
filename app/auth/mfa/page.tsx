import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth/session";
import { getSafeNextPath, LOGIN_PATH } from "@/lib/auth/paths";
import { MFA_PATH } from "@/lib/auth/admin-mfa";
import { AuthShell } from "../shell";
import { MfaForm } from "./mfa-form";

export const metadata: Metadata = {
  title: "Authenticator code",
  description: "Confirm it's you with your authenticator app.",
  robots: { index: false, follow: false },
};

type MfaPageProps = {
  searchParams: Promise<{ next?: string }>;
};

/**
 * Authenticator (TOTP) set-up and code entry. Admins are sent here by
 * requireAdminMfa: on first visit they scan a QR code, afterwards they enter
 * the current 6-digit code (at least every 12 hours).
 */
export default async function MfaPage({ searchParams }: MfaPageProps) {
  const next = getSafeNextPath((await searchParams).next ?? "/admin/dashboard");
  const user = await getAuthUser(await createClient());
  if (!user) {
    redirect(`${LOGIN_PATH}?next=${encodeURIComponent(`${MFA_PATH}?next=${encodeURIComponent(next)}`)}`);
  }

  return (
    <AuthShell
      heading="One more step keeps admin access safe."
      steps={[
        "Open an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password…).",
        "First time: scan the QR code. After that, just open the app.",
        "Enter the 6-digit code it shows. You'll be asked again every 12 hours.",
      ]}
    >
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Authenticator code</CardTitle>
          <CardDescription>Admin pages need a code from your authenticator app.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <MfaForm next={next} />
        </CardContent>
      </Card>
    </AuthShell>
  );
}
