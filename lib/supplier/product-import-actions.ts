"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { requireUser, getVerifiedSupplierId } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { optimizeImageUpload } from "@/lib/image-optimize";
import { indexProductImages } from "@/lib/ai/index-product-image";
import { getDashboardStore } from "@/lib/supplier/dashboard-store";
import { MAX_PRODUCT_IMAGES, MAX_VARIANTS, extractYoutubeId, generateSku } from "@/lib/supplier/products";
import { defaultSeoDescription, defaultSeoTitle } from "@/lib/supplier/rich-text";
import { sanitizeRichText } from "@/lib/supplier/sanitize";
import { fetchRemoteImage } from "@/lib/supplier/fetch-remote-image";
import {
  IMPORT_CHUNK_SIZE,
  IMPORT_COLUMNS,
  validateImportUnit,
  type ImportRow,
  type ImportUnit,
} from "@/lib/supplier/product-import";

export type ImportMode = "create" | "upsert";

export type ImportUnitResult = {
  /** Spreadsheet line numbers of the product's rows (header = line 1). */
  lines: number[];
  status: "created" | "updated" | "failed";
  message?: string;
  productId?: string;
  sku?: string;
};

type Supabase = Awaited<ReturnType<typeof requireUser>>["supabase"];

function indexLater(ids: string[]) {
  if (ids.length === 0) return;
  // Search-by-image indexing after the response, like single saves.
  after(async () => {
    for (const id of ids) {
      try {
        await indexProductImages(createAdminClient(), id);
      } catch (err) {
        console.error(`[image-search] skipped indexing for imported product ${id}:`, err);
      }
    }
  });
}

/** Point the product at a new search (social preview) image; removes the old file. */
async function setSearchImage(supabase: Supabase, supplierId: string, productId: string, path: string) {
  const { data: old } = await supabase.from("products").select("seo_image_path").eq("id", productId).maybeSingle();
  const { error } = await supabase
    .from("products")
    .update({ seo_image_path: path })
    .eq("id", productId)
    .eq("supplier_id", supplierId);
  if (error) {
    await supabase.storage.from("product_images").remove([path]);
    throw new Error("Could not save the social preview image.");
  }
  const oldPath = old?.seo_image_path as string | null | undefined;
  if (oldPath && oldPath !== path) await supabase.storage.from("product_images").remove([oldPath]);
}

/** Set a product's images; removes the replaced files. Throws on failure. */
async function replaceImages(supabase: Supabase, productId: string, paths: string[]) {
  const { data: old } = await supabase.from("product_images").select("path").eq("product_id", productId);
  const { error } = await supabase.rpc("replace_product_images", { p_product_id: productId, p_paths: paths });
  if (error) throw new Error("Could not attach the images.");
  const oldPaths = (old ?? []).map((r) => r.path as string).filter((p) => !paths.includes(p));
  if (oldPaths.length) await supabase.storage.from("product_images").remove(oldPaths);
}

/** Fetch, compress and store a product's image links; all-or-nothing. */
async function storeLinkedImages(supabase: Supabase, userId: string, productId: string, urls: string[]) {
  const results = await Promise.allSettled(
    urls.map(async (url, i) => {
      const optimized = await optimizeImageUpload(await fetchRemoteImage(url), {
        maxDimension: 1600,
        targetBytes: 100 * 1024,
      });
      const path = `${userId}/${productId}_${Date.now()}_import${i}.${optimized.extension}`;
      const { error } = await supabase.storage
        .from("product_images")
        .upload(path, optimized.buffer, { contentType: optimized.contentType, upsert: false });
      if (error) throw new Error("Could not store the image.");
      return path;
    }),
  );
  const paths = results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
  const failedIndex = results.findIndex((r) => r.status === "rejected");
  if (failedIndex !== -1) {
    if (paths.length) await supabase.storage.from("product_images").remove(paths);
    const reason = (results[failedIndex] as PromiseRejectedResult).reason;
    throw new Error(`Image ${failedIndex + 1}: ${reason instanceof Error ? reason.message : "could not be downloaded."}`);
  }
  return paths;
}

/** Untrusted payload → exactly our columns as bounded strings. */
function cleanRow(input: unknown): ImportRow {
  const src = (input ?? {}) as Record<string, unknown>;
  return Object.fromEntries(
    IMPORT_COLUMNS.map((c) => [c, typeof src[c] === "string" ? (src[c] as string).slice(0, 10_000) : ""]),
  ) as ImportRow;
}

/**
 * Import one chunk of products (≤ IMPORT_CHUNK_SIZE; a product is one row or
 * one variant group). Everything is validated again here; the supplier and
 * store come from the session, never from the file. New products are drafts —
 * the supplier reviews them, adds images if needed, and submits as usual.
 */
export async function importProductsChunk(
  units: ImportUnit[],
  mode: ImportMode,
): Promise<{ results: ImportUnitResult[] } | { error: string }> {
  if (!Array.isArray(units) || units.length === 0 || units.length > IMPORT_CHUNK_SIZE) {
    return { error: `Send between 1 and ${IMPORT_CHUNK_SIZE} products per request.` };
  }
  if (mode !== "create" && mode !== "upsert") return { error: "Unknown import mode." };

  const { supabase, user } = await requireUser();
  const supplierId = await getVerifiedSupplierId(supabase, user.id);
  if (!supplierId) return { error: "Only verified suppliers can import products." };

  const [{ data: categoryRows }, { store }] = await Promise.all([
    supabase.from("categories").select("id, name").eq("is_active", true),
    getDashboardStore(),
  ]);
  const categories = (categoryRows ?? []).map((c) => ({ id: c.id as string, name: c.name as string }));

  const results: ImportUnitResult[] = [];
  const indexIds: string[] = [];

  for (const raw of units) {
    const rows = Array.isArray(raw?.rows) ? raw.rows.slice(0, MAX_VARIANTS).map(cleanRow) : [];
    const lines = Array.isArray(raw?.lines) ? raw.lines.slice(0, rows.length).map(Number) : [];
    if (rows.length === 0 || lines.length !== rows.length) {
      results.push({ lines, status: "failed", message: "Malformed product." });
      continue;
    }
    const checked = validateImportUnit({ lines, rows }, categories);
    if (!checked.ok) {
      results.push({ lines, status: "failed", message: `Row ${checked.line}: ${checked.message}` });
      continue;
    }
    const v = checked.values;
    const sku = v.seller_sku ? v.seller_sku.toUpperCase() : null;
    const seoTitle = v.seo_title?.trim() || null;
    const seoDescription = v.seo_description?.trim() || null;

    // The same columns the Add-product form saves.
    const fields = {
      category_id: v.category_id,
      title: v.title.trim(),
      description: sanitizeRichText(v.description),
      hsn_code: v.hsn_code || null,
      gst_rate: v.gst_rate,
      carton_units: v.carton_units,
      carton_dimensions: v.carton_dimensions?.trim() || null,
      carton_weight_kg: v.carton_weight_kg,
      unit: v.unit,
      price_per_unit: v.price_per_unit,
      stock_qty: checked.stock,
      ...(v.mrp != null ? { mrp: v.mrp } : {}),
      negotiable: v.negotiable,
      is_winning: v.is_winning,
      is_hot_selling: v.is_hot_selling,
      packaging_details: v.packaging_details?.trim() || null,
      warranty_return: v.warranty_return?.trim() || null,
      youtube_url: v.youtube_url?.trim() || null,
      youtube_id: v.youtube_url?.trim() ? extractYoutubeId(v.youtube_url.trim()) : null,
      // An update only touches SEO the file actually fills in.
      ...(seoTitle ? { seo_title: seoTitle } : {}),
      ...(seoDescription ? { seo_description: seoDescription } : {}),
    };

    try {
      const { data: existing } = sku
        ? await supabase
            .from("products")
            .select("id, status")
            .eq("supplier_id", supplierId)
            .eq("seller_sku", sku)
            .maybeSingle()
        : { data: null };

      if (existing && mode === "create") {
        results.push({ lines, status: "failed", sku: sku ?? undefined, message: `SKU ${sku} already exists (choose "Update it" to update it).` });
        continue;
      }
      if (existing?.status === "pending") {
        results.push({ lines, status: "failed", sku: sku ?? undefined, message: `SKU ${sku} is under review and can't be changed right now.` });
        continue;
      }

      let productId: string;
      const finalSku = sku ?? generateSku();
      if (existing) {
        const { error } = await supabase.from("products").update(fields).eq("id", existing.id).eq("supplier_id", supplierId);
        if (error) throw error;
        productId = existing.id as string;
      } else {
        const { data: created, error } = await supabase
          .from("products")
          .insert({
            ...fields,
            // Like the form: blank SEO fields default from the title / description.
            seo_title: seoTitle ?? defaultSeoTitle(v.title),
            seo_description: seoDescription ?? defaultSeoDescription(v.description),
            supplier_id: supplierId,
            store_id: store?.id ?? null,
            seller_sku: finalSku,
            moq: 1,
            lead_time_days: 7,
            sample_available: false,
            // Publishing (submit) happens after images are attached, from the browser.
            status: "draft",
          })
          .select("id")
          .single();
        if (error || !created) {
          if (error?.code === "23505") {
            results.push({ lines, status: "failed", sku: finalSku, message: `SKU ${finalSku} is already used.` });
            continue;
          }
          throw error;
        }
        productId = created.id as string;
      }

      // Variant groups replace the product's variants; a simple row on update leaves them as they are.
      if (checked.variants.length > 0) {
        const { error } = await supabase.rpc("replace_product_variants", {
          p_product_id: productId,
          p_variants: checked.variants,
        });
        if (error) {
          results.push({
            lines, status: existing ? "updated" : "created", productId, sku: finalSku,
            message: `Saved without variants: ${error.message || "variants could not be saved."}`,
          });
          continue;
        }
      }

      // Web links are downloaded here; local files are uploaded by the browser
      // afterwards and appended (attachUploadedImages).
      const imageUrls = checked.images.flatMap((r) => (r.kind === "url" ? [r.url] : []));
      const warnings: string[] = [];
      if (imageUrls.length > 0) {
        try {
          const paths = await storeLinkedImages(supabase, user.id, productId, imageUrls);
          try {
            await replaceImages(supabase, productId, paths);
          } catch (err) {
            await supabase.storage.from("product_images").remove(paths);
            throw err;
          }
          indexIds.push(productId);
        } catch (err) {
          warnings.push(`Saved without web images: ${err instanceof Error ? err.message : "images failed."}`);
        }
      }
      if (checked.searchImage?.kind === "url") {
        try {
          const [path] = await storeLinkedImages(supabase, user.id, `seo/${productId}`, [checked.searchImage.url]);
          await setSearchImage(supabase, supplierId, productId, path);
        } catch (err) {
          warnings.push(`Social preview image skipped: ${err instanceof Error ? err.message : "failed."}`);
        }
      }
      results.push({
        lines, status: existing ? "updated" : "created", productId, sku: finalSku,
        ...(warnings.length ? { message: warnings.join(" ") } : {}),
      });
    } catch (err) {
      console.error("importProductsChunk product failed:", lines, err);
      results.push({ lines, status: "failed", message: "Could not save this product. Try again." });
    }
  }

  indexLater(indexIds);
  revalidatePath("/supplier/dashboard/products");
  return { results };
}

/**
 * Attach images the browser already uploaded to Storage (matched by file name
 * to a SKU). Paths must sit in the caller's own folder (where the storage
 * policy let them upload) and the product must belong to the caller's company.
 */
export async function attachUploadedImages(
  productId: string,
  options: { images?: string[]; append?: boolean; searchImage?: string },
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { supabase, user } = await requireUser();
  const supplierId = await getVerifiedSupplierId(supabase, user.id);
  if (!supplierId) return { ok: false, message: "Only verified suppliers can add images." };

  const images = Array.isArray(options?.images) ? options.images : [];
  const searchImage = typeof options?.searchImage === "string" ? options.searchImage : null;
  // Only files the caller could have uploaded: their own storage folder.
  const ownPath = (p: unknown) => typeof p === "string" && p.startsWith(`${user.id}/`) && !p.includes("..");
  if (images.length > MAX_PRODUCT_IMAGES || !images.every(ownPath) || (searchImage && !ownPath(searchImage))) {
    return { ok: false, message: "Invalid image list." };
  }
  if (images.length === 0 && !searchImage) return { ok: true };

  const { data: product } = await supabase
    .from("products")
    .select("id, status")
    .eq("id", productId)
    .eq("supplier_id", supplierId)
    .maybeSingle();
  if (!product) return { ok: false, message: "Product not found." };
  if (product.status === "pending") return { ok: false, message: "Product is under review." };

  try {
    if (images.length > 0) {
      let paths = images;
      if (options.append) {
        const { data: current } = await supabase
          .from("product_images")
          .select("path")
          .eq("product_id", productId)
          .order("sort", { ascending: true });
        paths = [...(current ?? []).map((r) => r.path as string), ...images];
        if (paths.length > MAX_PRODUCT_IMAGES) {
          return { ok: false, message: `Products can have up to ${MAX_PRODUCT_IMAGES} images.` };
        }
      }
      await replaceImages(supabase, productId, paths);
    }
    if (searchImage) await setSearchImage(supabase, supplierId, productId, searchImage);
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Could not attach the images." };
  }
  if (images.length > 0) indexLater([productId]);
  revalidatePath("/supplier/dashboard/products");
  return { ok: true };
}

/** SKU → product id for the caller's products (to match image files after import). */
export async function findProductsBySku(
  skus: string[],
): Promise<Record<string, string>> {
  const { supabase, user } = await requireUser();
  const supplierId = await getVerifiedSupplierId(supabase, user.id);
  if (!supplierId || !Array.isArray(skus) || skus.length === 0) return {};
  const wanted = [...new Set(skus.filter((s) => typeof s === "string").map((s) => s.toUpperCase()))].slice(0, 1000);
  const { data } = await supabase
    .from("products")
    .select("id, seller_sku")
    .eq("supplier_id", supplierId)
    .in("seller_sku", wanted);
  return Object.fromEntries((data ?? []).map((p) => [String(p.seller_sku).toUpperCase(), p.id as string]));
}
