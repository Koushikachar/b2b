"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";

export type SignupBonusResult =
  | { status: "credited"; amount: number }
  | { status: "already" }
  | { status: "error" };

/**
 * Make sure this account has its one Rs 100 signup bonus. Returns "credited"
 * with the amount only the first time the account should see the
 * congratulations popup; the database guarantees both happen once.
 */
export async function claimSignupBonus(): Promise<SignupBonusResult> {
  const supabase = await createClient();
  const user = await getSessionUser(supabase);
  if (!user) return { status: "error" };

  const { data, error } = await supabase.rpc("claim_signup_bonus");
  if (error) {
    console.error("claim_signup_bonus failed:", error.code, error.message);
    return { status: "error" };
  }
  const amount = Number(data ?? 0);
  if (amount <= 0) return { status: "already" };

  revalidatePath("/account/wallet");
  revalidatePath("/checkout");
  return { status: "credited", amount };
}
