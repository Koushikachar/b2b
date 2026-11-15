import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getAccountStores, type AccountStore } from "@/lib/supplier/account-stores";
import { isDashboardReady } from "@/lib/store-context-types";

/** Supplier-dashboard store choice (separate from the storefront's cookie). */
export const DASHBOARD_STORE_COOKIE = "d2b_dashboard_store";

export { DASHBOARD_READY_STORES, isDashboardReady } from "@/lib/store-context-types";

/**
 * The store the supplier dashboard is working on: the cookie's choice when
 * the account belongs to that store (never trusted otherwise), else D2H Core,
 * else the account's first store. Memoised per request.
 */
export const getDashboardStore = cache(
  async (): Promise<{ store: AccountStore | null; stores: AccountStore[] }> => {
    let stores = await getAccountStores();
    // Team members have no store links of their own: they work in D2H Core.
    if (stores.length === 0) {
      const { data } = await (await createClient())
        .from("stores")
        .select("id, name, slug, status")
        .eq("slug", "d2h-core")
        .eq("status", "active")
        .maybeSingle();
      stores = data ? [data as AccountStore] : [];
    }
    const chosen = (await cookies()).get(DASHBOARD_STORE_COOKIE)?.value;
    const ready = stores.filter((s) => isDashboardReady(s.slug));
    const store =
      ready.find((s) => s.id === chosen) ??
      ready.find((s) => s.slug === "d2h-core") ??
      ready[0] ??
      null;
    return { store, stores };
  },
);
