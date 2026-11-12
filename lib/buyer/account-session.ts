import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";

/** Signed-in user for an /account/* page; bounces guests to login and back. */
export async function requireAccount(next: string) {
  const supabase = await createClient();
  const user = await getSessionUser(supabase);
  if (!user) redirect(`/auth/login?next=${encodeURIComponent(next)}`);
  return { supabase, user };
}
