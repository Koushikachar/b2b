"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth/session";

export type PromoClaimState =
  | { status: "idle" }
  | { status: "won"; reward: number }
  | { status: "error"; message: string };

const claimSchema = z.object({
  eventKey: z.string().regex(/^[a-z0-9-]{3,60}$/, "Invalid event."),
});

/**
 * Light the diya: the database picks the reward, credits the wallet and
 * records the claim in one transaction (`claim_promo_event_reward`). A repeat
 * call returns the original reward instead of paying twice.
 */
export async function claimPromoEventReward(
  _prev: PromoClaimState,
  formData: FormData,
): Promise<PromoClaimState> {
  const parsed = claimSchema.safeParse({ eventKey: formData.get("eventKey") });
  if (!parsed.success) {
    return { status: "error", message: "This event is not available." };
  }

  const supabase = await createClient();
  const user = await getAuthUser(supabase);
  if (!user) {
    return { status: "error", message: "Sign in to light your diya." };
  }

  const { data, error } = await supabase.rpc("claim_promo_event_reward", {
    p_event_key: parsed.data.eventKey,
  });

  if (error) {
    console.error("claimPromoEventReward failed:", error.code, error.message);
    const message =
      error.code === "P0001"
        ? "This event is not running right now."
        : error.code === "P0002"
          ? "This event is not available."
          : "Could not light the diya. Please try again.";
    return { status: "error", message };
  }

  revalidatePath("/account");
  revalidatePath("/account/wallet");
  return { status: "won", reward: Number(data) };
}
