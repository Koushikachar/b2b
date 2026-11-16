/** Cookie used to persist a customer's store selection across the storefront. */
export const STORE_COOKIE_NAME = "d2b_store";

export type ActiveStore = {
  id: string;
  name: string;
  slug: string;
  status: string;
};

/** Stores whose supplier dashboard is built (others show "coming soon"). */
export const DASHBOARD_READY_STORES = ["d2h-core", "d2h-select"] as const;

export function isDashboardReady(slug: string): boolean {
  return (DASHBOARD_READY_STORES as readonly string[]).includes(slug);
}
