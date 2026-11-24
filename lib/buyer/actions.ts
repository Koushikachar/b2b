"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";
import { fetchCustomerPriceMap } from "@/lib/storefront";
import { logStorefrontEvent } from "@/lib/storefront/events";
import type { ProductCardData } from "@/components/storefront/product-card";

// ---------------------------------------------------------------------------
// Saved products
// ---------------------------------------------------------------------------

const saveProductSchema = z.object({
  productId: z.string().uuid("Invalid product ID."),
});

export type BuyerActionState = {
  ok: boolean;
  message: string;
};

const okState: BuyerActionState = { ok: true, message: "" };
const errState = (message: string): BuyerActionState => ({ ok: false, message });

export async function saveProduct(
  _prev: BuyerActionState,
  formData: FormData,
): Promise<BuyerActionState> {
  const parsed = saveProductSchema.safeParse({
    productId: formData.get("productId"),
  });
  if (!parsed.success) {
    return errState("Invalid product.");
  }

  const supabase = await createClient();
  const user = await getSessionUser(supabase);
  if (!user) {
    return errState("You must be signed in to save products.");
  }

  const { error } = await supabase
    .from("saved_products")
    .insert({ buyer_id: user.id, product_id: parsed.data.productId });

  if (error) {
    if (error.code === "23505") {
      return okState; // Already saved — idempotent.
    }
    console.error("saveProduct failed:", error.code, error.message);
    return errState("Could not save the product. Try again.");
  }

  revalidatePath("/account/saved");
  return okState;
}

export async function unsaveProduct(
  _prev: BuyerActionState,
  formData: FormData,
): Promise<BuyerActionState> {
  const parsed = saveProductSchema.safeParse({
    productId: formData.get("productId"),
  });
  if (!parsed.success) {
    return errState("Invalid product.");
  }

  const supabase = await createClient();
  const user = await getSessionUser(supabase);
  if (!user) {
    return errState("You must be signed in.");
  }

  const { error } = await supabase
    .from("saved_products")
    .delete()
    .eq("buyer_id", user.id)
    .eq("product_id", parsed.data.productId);

  if (error) {
    console.error("unsaveProduct failed:", error.code, error.message);
    return errState("Could not remove the product. Try again.");
  }

  revalidatePath("/account/saved");
  return okState;
}

// ---------------------------------------------------------------------------
// Recently viewed
// ---------------------------------------------------------------------------

export async function recordRecentlyViewed(productId: string): Promise<void> {
  const supabase = await createClient();
  const user = await getSessionUser(supabase);

  // Supplier lookup for the analytics event below (public approved read).
  const { data: product } = await supabase
    .from("products")
    .select("id, supplier_id")
    .eq("id", productId)
    .eq("status", "approved")
    .maybeSingle();

  // Analytics view event for every visitor, anonymous included — this is the
  // conversion denominator, so it must not require sign-in. Runs after the
  // response so it never delays the history write below.
  if (product) {
    const supplierId = product.supplier_id as string;
    after(() =>
      logStorefrontEvent({
        supplierId,
        productId,
        event: "view",
        buyerId: user?.id ?? null,
      }),
    );
  }

  if (!user) return;

  // Upsert: update last_viewed_at if the row already exists.
  const { error } = await supabase
    .from("recently_viewed")
    .upsert(
      { buyer_id: user.id, product_id: productId, last_viewed_at: new Date().toISOString() },
      { onConflict: "buyer_id,product_id" },
    );

  if (error) {
    console.error("recordRecentlyViewed failed:", error.code, error.message);
    return;
  }

  // Trim history to the 50 most recent rows for this buyer.
  // Delete rows that are older than the 50th most recent.
  const { data: recentIds } = await supabase
    .from("recently_viewed")
    .select("id")
    .eq("buyer_id", user.id)
    .order("last_viewed_at", { ascending: false })
    .limit(50);

  if (recentIds && recentIds.length === 50) {
    const keepIds = new Set(recentIds.map((r) => r.id as string));
    await supabase
      .from("recently_viewed")
      .delete()
      .eq("buyer_id", user.id)
      .not("id", "in", `[${[...keepIds].join(",")}]`);
  }
}

const recentCardIdsSchema = z.array(z.string().uuid()).max(12);

type RecentCardRow = {
  id: string;
  title: string;
  unit: string;
  moq: number;
  mrp: number | null;
  is_out_of_stock: boolean | null;
  images: { path: string; sort: number }[] | null;
};

/**
 * Fresh card data for a guest's localStorage recently-viewed ids.
 *
 * Snapshots deliberately store no price, so the homepage fetches current
 * approved/priced products for those ids instead of rendering a stale snapshot
 * or inventing a price.
 */
export async function getRecentlyViewedCards(productIds: string[]): Promise<ProductCardData[]> {
  const parsed = recentCardIdsSchema.safeParse(productIds);
  if (!parsed.success || parsed.data.length === 0) return [];

  const supabase = await createClient();
  const ids = [...new Set(parsed.data)];
  const [{ data: rows }, priceMap] = await Promise.all([
    supabase
      .from("products")
      .select("id, title, unit, moq, mrp, is_out_of_stock, images:product_images(path, sort)")
      .in("id", ids)
      .eq("status", "approved")
      .eq("is_hidden", false),
    fetchCustomerPriceMap(supabase, ids),
  ]);

  const byId = new Map(
    ((rows ?? []) as unknown as RecentCardRow[]).map((row) => [row.id, row]),
  );

  // Keep the caller's most-recent-first order.
  return ids
    .map((id) => byId.get(id))
    .filter((row): row is RecentCardRow => Boolean(row))
    .map((row) => {
      const pricing = priceMap.get(row.id) ?? null;
      return {
        id: row.id,
        title: row.title,
        unit: row.unit,
        moq: row.moq,
        mrp: row.mrp == null ? null : Number(row.mrp),
        images: row.images,
        pricing: pricing ? { customer_price: pricing.customer_price } : null,
        // The supplier's in-stock toggle, as everywhere else. stock_qty is often
        // left at 0 by suppliers who don't count stock, so it can't mean "sold out".
        is_out_of_stock: row.is_out_of_stock === true,
      };
    });
}
