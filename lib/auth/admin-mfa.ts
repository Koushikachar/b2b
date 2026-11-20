import { redirect } from "next/navigation";
import type { createClient } from "@/lib/supabase/server";

/** Where admins set up or enter their authenticator code. */
export const MFA_PATH = "/auth/mfa";

/**
 * Admins re-enter their authenticator code at least this often (AUTH.md A-3/A-4).
 * The database separately refuses admin access to any session without MFA
 * (internal.is_admin() requires aal2, migration 20261120040000).
 */
export const ADMIN_MFA_MAX_AGE_SECONDS = 12 * 60 * 60;

type AmrEntry = { method: string; timestamp: number } | string;

export type AdminMfaState = "ok" | "enroll" | "verify";

/**
 * What an admin session still needs. "enroll": no verified authenticator yet.
 * "verify": one exists but this session hasn't used it within the max age.
 */
export function adminMfaState({
  currentLevel,
  nextLevel,
  methods,
  nowSeconds,
  maxAgeSeconds = ADMIN_MFA_MAX_AGE_SECONDS,
}: {
  currentLevel: string | null;
  nextLevel: string | null;
  methods: AmrEntry[];
  nowSeconds: number;
  maxAgeSeconds?: number;
}): AdminMfaState {
  if (nextLevel !== "aal2" && currentLevel !== "aal2") return "enroll";
  if (currentLevel !== "aal2") return "verify";
  const mfaTimes = methods
    .filter((m): m is { method: string; timestamp: number } => typeof m === "object" && m !== null)
    .filter((m) => m.method === "totp" || m.method.startsWith("mfa/"))
    .map((m) => m.timestamp);
  const latest = mfaTimes.length ? Math.max(...mfaTimes) : null;
  if (latest === null || nowSeconds - latest > maxAgeSeconds) return "verify";
  return "ok";
}

/**
 * Admin pages and actions: send the admin to the MFA screen unless this
 * session verified an authenticator code within the last 12 hours. Call
 * after the user and their admin role are confirmed (getUser validates the
 * same access token whose aal/amr claims are read here).
 */
export async function requireAdminMfa(
  supabase: Awaited<ReturnType<typeof createClient>>,
  next = "/admin/dashboard",
): Promise<void> {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const state: AdminMfaState =
    error || !data
      ? "verify"
      : adminMfaState({
          currentLevel: data.currentLevel,
          nextLevel: data.nextLevel,
          methods: data.currentAuthenticationMethods as AmrEntry[],
          nowSeconds: Math.floor(Date.now() / 1000),
        });
  if (state !== "ok") {
    redirect(`${MFA_PATH}?next=${encodeURIComponent(next)}`);
  }
}
