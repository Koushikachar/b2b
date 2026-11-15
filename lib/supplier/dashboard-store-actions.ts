"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getAccountStores } from "@/lib/supplier/account-stores";
import { DASHBOARD_STORE_COOKIE, isDashboardReady } from "@/lib/supplier/dashboard-store";

/**
 * Switch the supplier dashboard to another store. Only stores the account
 * belongs to (and whose dashboard is built) are accepted.
 */
export async function selectDashboardStore(
  storeId: string,
): Promise<{ ok: boolean; message: string }> {
  const store = (await getAccountStores()).find((s) => s.id === storeId);
  if (!store || !isDashboardReady(store.slug)) {
    return { ok: false, message: "You don't have access to that store." };
  }

  (await cookies()).set(DASHBOARD_STORE_COOKIE, store.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/supplier",
    maxAge: 60 * 60 * 24 * 180,
  });
  revalidatePath("/supplier/dashboard", "layout");
  return { ok: true, message: `Switched to ${store.name}.` };
}
