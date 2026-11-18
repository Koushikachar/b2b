import { createClient } from "@/lib/supabase/server";
import { getSupplierContext } from "@/lib/auth/guard";
import { publicImageUrl } from "@/lib/storage";
import { fetchAllRows } from "@/lib/supabase/fetch-all";
import { IMPORT_COLUMNS, toCsv, type ImportRow } from "@/lib/supplier/product-import";

type ProductRow = {
  id: string;
  seller_sku: string | null;
  title: string;
  description: string | null;
  mrp: number | null;
  stock_qty: number | null;
  unit: string | null;
  gst_rate: number | null;
  hsn_code: string | null;
  carton_units: number | null;
  carton_dimensions: string | null;
  carton_weight_kg: number | null;
  negotiable: boolean | null;
  is_winning: boolean | null;
  is_hot_selling: boolean | null;
  seo_title: string | null;
  seo_description: string | null;
  seo_image_path: string | null;
  youtube_url: string | null;
  packaging_details: string | null;
  warranty_return: string | null;
  categories: { name: string } | null;
  product_images: { path: string; sort: number }[];
  product_variants: { id: string; label: string; attrs: Record<string, string> | null; seller_sku: string; stock_qty: number; sort: number }[];
};

/** Base prices aren't readable from products / product_variants (lockdown_base_pricing); the supplier_prices view returns the caller's own. */
type PriceRow = { product_id: string; price_per_unit: number; variants: { id: string; price: number }[] | null };

/**
 * Download the signed-in supplier's products in the import template's columns,
 * so they can be edited in Excel and re-imported with "Update it" (bulk price
 * and stock changes). A product with variants exports one row per variant,
 * grouped by variant_group = the product's SKU.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Sign in required.", { status: 401 });

  const ctx = await getSupplierContext(supabase, user.id);
  if (!ctx) return new Response("Supplier onboarding required.", { status: 403 });

  try {
    const products = await fetchAllRows<ProductRow>(
      "Product export",
      (from, to) =>
        supabase
          .from("products")
          .select(
            "id, seller_sku, title, description, mrp, stock_qty, unit, gst_rate, hsn_code, carton_units, carton_dimensions, carton_weight_kg, negotiable, is_winning, is_hot_selling, seo_title, seo_description, seo_image_path, youtube_url, packaging_details, warranty_return, categories(name), product_images(path, sort), product_variants(id, label, attrs, seller_sku, stock_qty, sort)",
          )
          .eq("supplier_id", ctx.companyId)
          .order("created_at", { ascending: true })
          .range(from, to) as unknown as PromiseLike<{ data: ProductRow[] | null; error: { message: string } | null }>,
    );

    // Base prices, in batches of ids (keeps the request URL short).
    const priceOf = new Map<string, PriceRow>();
    const ids = products.map((p) => p.id);
    for (let i = 0; i < ids.length; i += 200) {
      const { data, error } = await supabase
        .from("supplier_prices")
        .select("product_id, price_per_unit, variants")
        .in("product_id", ids.slice(i, i + 200));
      if (error) throw new Error(`Price lookup failed: ${error.message}`);
      for (const row of (data ?? []) as PriceRow[]) priceOf.set(row.product_id, row);
    }

    const rows: string[][] = [[...IMPORT_COLUMNS]];
    for (const p of products) {
      const yesNo = (v: boolean | null) => (v ? "yes" : "no");
      const prices = priceOf.get(p.id);
      const variantPrice = new Map((prices?.variants ?? []).map((v) => [v.id, Number(v.price)]));
      const base: ImportRow = {
        title: p.title,
        category: p.categories?.name ?? "",
        sku: p.seller_sku ?? "",
        hsn_code: p.hsn_code ?? "",
        gst_rate: p.gst_rate == null ? "" : String(p.gst_rate),
        carton_units: p.carton_units == null ? "" : String(p.carton_units),
        carton_weight_kg: p.carton_weight_kg == null ? "" : String(p.carton_weight_kg),
        carton_dimensions: p.carton_dimensions ?? "",
        description: p.description ?? "",
        mrp: p.mrp == null ? "" : String(p.mrp),
        price: prices ? String(prices.price_per_unit) : "",
        unit: p.unit ?? "",
        negotiable: yesNo(p.negotiable),
        images: [...p.product_images]
          .sort((a, b) => a.sort - b.sort)
          .map((i) => publicImageUrl("product_images", i.path))
          .join(" | "),
        youtube_url: p.youtube_url ?? "",
        packaging_details: p.packaging_details ?? "",
        warranty_return: p.warranty_return ?? "",
        variant_group: "",
        size: "",
        color: "",
        stock: String(p.stock_qty ?? 0),
        winning_product: yesNo(p.is_winning),
        hot_selling: yesNo(p.is_hot_selling),
        seo_title: p.seo_title ?? "",
        seo_description: p.seo_description ?? "",
        search_image: p.seo_image_path ? publicImageUrl("product_images", p.seo_image_path) : "",
        // Blank on purpose: re-importing an export never submits anything for review by itself.
        publish: "",
      };
      const variants = [...p.product_variants].sort((a, b) => a.sort - b.sort);
      if (variants.length === 0) {
        rows.push(IMPORT_COLUMNS.map((c) => base[c]));
        continue;
      }
      variants.forEach((v, i) => {
        const row: ImportRow = {
          ...base,
          sku: v.seller_sku,
          price: variantPrice.has(v.id) ? String(variantPrice.get(v.id)) : base.price,
          stock: String(v.stock_qty),
          variant_group: p.seller_sku ?? "",
          size: v.attrs?.Size ?? v.attrs?.size ?? "",
          color: v.attrs?.Color ?? v.attrs?.Colour ?? v.attrs?.color ?? "",
          // Images belong to the product: list them once, on its first row.
          images: i === 0 ? base.images : "",
        };
        rows.push(IMPORT_COLUMNS.map((c) => row[c]));
      });
    }

    const stamp = new Date().toISOString().slice(0, 10);
    // BOM so Excel shows ₹ and other non-ASCII text correctly.
    return new Response("﻿" + toCsv(rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="products-${stamp}.csv"`,
      },
    });
  } catch (error) {
    console.error("Product export failed:", error);
    return new Response("Could not export products.", { status: 500 });
  }
}
