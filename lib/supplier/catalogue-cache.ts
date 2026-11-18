import { revalidatePath, updateTag } from "next/cache";
import { CATALOGUE_TAGS } from "@/lib/catalogue-tags";

export const SUPPLIER_PRODUCTS_PATH = "/supplier/dashboard/products";

/**
 * Storefront caches that list products: listings, prices, category counts and
 * the home rows. `updateTag` (not stale-while-revalidate `revalidateTag`)
 * expires them now, so the very next page load shows the change without a
 * manual refresh.
 */
export function refreshCatalogue(): void {
  for (const tag of CATALOGUE_TAGS) updateTag(tag);
  revalidatePath(SUPPLIER_PRODUCTS_PATH);
}
