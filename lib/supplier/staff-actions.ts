"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient as createAnonClient } from "@supabase/supabase-js";
import { requireUser, requireOwnerCompany } from "@/lib/auth/guard";
import { resolveAppUrl } from "@/lib/auth/origin";
import { createAdminClient } from "@/lib/supabase/admin";
import { ROLE_LABELS, isMemberRole, type MemberRole } from "@/lib/supplier/permissions";

export type StaffActionState = {
  ok: boolean;
  message: string;
  field?: "email";
};

const errState = (message: string, field?: "email"): StaffActionState => ({
  ok: false,
  message,
  field,
});

type StaffCandidate = {
  user_id: string;
  user_type: string;
  owns_company_id: string | null;
  email: string | null;
};

const TEAM_PATH = "/supplier/dashboard/team";

type SupabaseClient = Awaited<ReturnType<typeof requireUser>>["supabase"];

async function lookupCandidate(
  supabase: SupabaseClient,
  email: string,
): Promise<{ candidate: StaffCandidate | null; failed: boolean }> {
  // Resolved over RPC: owners cannot read other users' profiles rows
  // through RLS, so the public.staff_candidate wrapper (owner-derived
  // company, SECURITY DEFINER) performs the lookup.
  const { data, error } = await supabase.rpc("staff_candidate", { p_email: email });
  if (error) {
    console.error("addStaff lookup failed:", error.code, error.message);
    return { candidate: null, failed: true };
  }
  return { candidate: ((data ?? []) as StaffCandidate[])[0] ?? null, failed: false };
}

/**
 * Email the new member. New people get a Supabase invite (it also creates
 * their account); existing accounts get a sign-in link that opens the
 * dashboard. Returns false when the email could not be sent (e.g. the
 * built-in Supabase mailer's hourly limit) — membership is unaffected.
 */
async function sendTeamEmail(email: string, isNewAccount: boolean): Promise<boolean> {
  const appUrl = resolveAppUrl(await headers());
  if (!appUrl) return false;
  const loginUrl = `${appUrl}/auth/login?next=${encodeURIComponent("/supplier/dashboard")}`;

  if (isNewAccount) {
    try {
      const { error } = await createAdminClient().auth.admin.inviteUserByEmail(email, {
        redirectTo: loginUrl,
      });
      if (error) console.error("team invite email failed:", error.code, error.message);
      return !error;
    } catch (err) {
      // e.g. no service-role key on the server: report "email not sent", don't crash.
      console.error("team invite email failed:", err);
      return false;
    }
  }

  // Cookie-less client: sending the link must not touch the owner's session.
  const mailer = createAnonClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { error } = await mailer.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${appUrl}/auth/callback?next=${encodeURIComponent("/supplier/dashboard")}`,
    },
  });
  if (error) console.error("team sign-in email failed:", error.code, error.message);
  return !error;
}

/**
 * Add a staffer by email. Owner-only (page + RLS enforce it too).
 * The account must already exist and must not own a business — access is
 * linked by user_id, so later email changes never break it. A buyer account
 * is promoted to supplier lazily on its first dashboard visit (layout).
 */
export async function addStaff(
  _prevState: StaffActionState,
  formData: FormData,
): Promise<StaffActionState> {
  const { supabase, user } = await requireUser();
  const companyId = await requireOwnerCompany(supabase, user.id);

  const email = (formData.get("email")?.toString() ?? "").trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return errState("Enter a valid email address.", "email");
  }

  const role: MemberRole = isMemberRole(formData.get("role")) ? (formData.get("role") as MemberRole) : "staff";

  let { candidate, failed } = await lookupCandidate(supabase, email);
  if (failed) return errState("Could not look up that email. Try again.");

  // No account yet: invite them (Supabase creates the account and emails
  // them), then link the new account.
  let invited = false;
  if (!candidate) {
    invited = await sendTeamEmail(email, true);
    if (!invited) {
      return errState(
        "Couldn't send an invite to this email (the email service may be at its hourly limit). Try again later.",
        "email",
      );
    }
    ({ candidate, failed } = await lookupCandidate(supabase, email));
    if (failed || !candidate) {
      return errState("Invite sent, but the account isn't ready yet. Add them again in a minute.", "email");
    }
  }
  if (candidate.user_id === user.id) {
    return errState("That's your own email — you're already the owner.", "email");
  }
  if (candidate.owns_company_id) {
    return errState(
      "This account already owns a business, so it can't join as staff.",
      "email",
    );
  }

  const { error: insertError } = await supabase.from("company_members").insert({
    company_id: companyId,
    user_id: candidate.user_id,
    email: candidate.email ?? email,
    role,
    invited_by: user.id,
  });
  if (insertError) {
    // Already a member: unique(company_id, user_id).
    if (insertError.code === "23505") {
      return errState("This person is already on your team.", "email");
    }
    console.error("addStaff insert failed:", insertError.code, insertError.message);
    return errState("Could not add this person. Try again.");
  }

  revalidatePath(TEAM_PATH);
  const emailed = invited || (await sendTeamEmail(email, false));
  const roleLabel = ROLE_LABELS[role];
  return {
    ok: true,
    message: emailed
      ? `Added as ${roleLabel}. We emailed ${email} a link to sign in.`
      : `Added as ${roleLabel}. The email couldn't be sent right now (the email service limit may be reached) — they can sign in at the usual login page.`,
  };
}

/** Revoke a staffer. Owner-only; access ends immediately. */
export async function removeStaff(memberId: string): Promise<StaffActionState> {
  const { supabase, user } = await requireUser();
  const companyId = await requireOwnerCompany(supabase, user.id);

  const { error } = await supabase
    .from("company_members")
    .delete()
    .eq("id", memberId)
    .eq("company_id", companyId);
  if (error) {
    console.error("removeStaff failed:", error.code, error.message);
    return errState("Could not remove this person. Try again.");
  }

  revalidatePath(TEAM_PATH);
  return { ok: true, message: "Removed from your team." };
}

/** Change a member's role. Owner-only; takes effect on their next request. */
export async function changeStaffRole(memberId: string, role: string): Promise<StaffActionState> {
  const { supabase, user } = await requireUser();
  const companyId = await requireOwnerCompany(supabase, user.id);
  if (!isMemberRole(role)) return errState("Pick a valid role.");

  const { error, data } = await supabase
    .from("company_members")
    .update({ role })
    .eq("id", memberId)
    .eq("company_id", companyId)
    .select("id");
  if (error || !data?.length) {
    console.error("changeStaffRole failed:", error?.code, error?.message);
    return errState("Could not change the role. Try again.");
  }

  revalidatePath(TEAM_PATH);
  return { ok: true, message: `Role changed to ${ROLE_LABELS[role]}.` };
}
