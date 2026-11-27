"use server";

import { revalidatePath } from "next/cache";
import { requireUser, getVerifiedSupplierId } from "@/lib/auth/guard";
import { getDashboardStore } from "@/lib/supplier/dashboard-store";
import { getCachedActiveCategories } from "@/lib/storefront-cache";
import {
  MAX_PRODUCT_IMAGES,
  MIN_PRODUCT_IMAGES,
  extractYoutubeId,
  generateSku,
  validateProductImageFile,
} from "@/lib/supplier/products";
import { defaultSeoDescription, defaultSeoTitle } from "@/lib/supplier/rich-text";
import { sanitizeRichText } from "@/lib/supplier/sanitize";
import {
  removeStoredPaths,
  uploadProductImage,
} from "@/lib/supplier/product-image-upload";
import { isMissingMrpColumn } from "@/lib/supplier/mrp-column";
import {
  refreshCatalogue,
  SUPPLIER_PRODUCTS_PATH,
} from "@/lib/supplier/catalogue-cache";
import {
  PRODUCT_IMPORT_IMAGE_MAX_BYTES,
  PRODUCT_IMPORT_MAX_BYTES,
  PRODUCT_IMPORT_MAX_PHOTOS,
  PRODUCT_IMPORT_MAX_ROWS,
  PRODUCT_IMPORT_WRITE_BATCH_SIZE,
  PRODUCT_IMPORT_XLSX_MAX_BYTES,
  buildProductImportPreview,
  createCategoryLookup,
  imageWarnings,
  parseProductImportCsv,
  validateProductImportRows,
  type ImportCategory,
  type ProductImportBatchResult,
  type ProductImportFilePreview,
  type ProductImportImageEntry,
  type ProductImportImagesResult,
  type ProductImportRawRow,
} from "@/lib/supplier/product-import-sheet";
import { parseProductImportWorkbook } from "@/lib/supplier/product-import-xlsx";

type Supabase = Awaited<ReturnType<typeof requireUser>>["supabase"];

const NO_SUPPLIER_MESSAGE = "Only suppliers can import products.";
/** 500 rows × 8 photos: the largest manifest the import accepts. */
const MAX_MANIFEST_ENTRIES = PRODUCT_IMPORT_MAX_ROWS * PRODUCT_IMPORT_MAX_PHOTOS;

/** Shared cached list, refreshed when an admin edits a category. */
function loadCategories(): Promise<ImportCategory[]> {
  return getCachedActiveCategories();
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

async function loadExistingSkus(
  supabase: Supabase,
  supplierId: string,
  skus: string[],
): Promise<Set<string>> {
  const unique = Array.from(new Set(skus.map((sku) => sku.trim().toUpperCase()).filter(Boolean)));
  const found = new Set<string>();
  for (const batch of chunk(unique, 150)) {
    const { data, error } = await supabase
      .from("products")
      .select("seller_sku")
      .eq("supplier_id", supplierId)
      .in("seller_sku", batch);
    if (error) throw error;
    for (const row of data ?? []) found.add(row.seller_sku as string);
  }
  return found;
}

/** Plain CSV descriptions become paragraphs instead of one collapsed line. */
function toRichText(text: string): string {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, "<br>")}</p>`);
  return sanitizeRichText(paragraphs.join("") || text);
}

/**
 * Keep only manifest fields the preview needs, and reject absurd payloads.
 * File bytes are never sent here: the folder selector sends names and sizes,
 * and `importProductImages` validates each real file before compressing it.
 */
function sanitizeManifest(
  value: ProductImportImageEntry[] | undefined,
): { ok: true; entries: ProductImportImageEntry[] } | { ok: false; message: string } {
  if (value == null) return { ok: true, entries: [] };
  if (!Array.isArray(value)) return { ok: true, entries: [] };
  if (value.length > MAX_MANIFEST_ENTRIES) {
    return {
      ok: false,
      message: `That folder holds more than ${MAX_MANIFEST_ENTRIES} files. Select a folder with only the photos for this file, or split the import.`,
    };
  }

  const entries: ProductImportImageEntry[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const relativePath =
      typeof record.relativePath === "string" ? record.relativePath.trim() : "";
    const size =
      typeof record.size === "number" && Number.isFinite(record.size)
        ? record.size
        : -1;
    if (!relativePath || relativePath.length > 400) continue;
    if (relativePath.split("/").some((part) => part === "..")) continue;
    if (size < 0) continue;
    entries.push({
      relativePath,
      size,
      ...(typeof record.type === "string" ? { type: record.type.slice(0, 100) } : {}),
    });
  }
  return { ok: true, entries };
}

/**
 * Read an uploaded .xlsx or .csv on the server, then check it against the
 * catalogue and the selected photos folder. Excel parsing stays server-side so
 * the client bundle does not carry a spreadsheet parser.
 */
export async function previewProductImportFile(
  formData: FormData,
  images?: ProductImportImageEntry[],
): Promise<ProductImportFilePreview> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Choose a file to check." };
  }

  const name = file.name.toLowerCase();
  const isXlsx = name.endsWith(".xlsx");
  const isCsv = name.endsWith(".csv");
  if (!isXlsx && !isCsv) {
    return { ok: false, message: "Use an Excel (.xlsx) or CSV (.csv) file." };
  }

  const maxBytes = isXlsx ? PRODUCT_IMPORT_XLSX_MAX_BYTES : PRODUCT_IMPORT_MAX_BYTES;
  if (file.size > maxBytes) {
    return {
      ok: false,
      message: `That file is ${(file.size / (1024 * 1024)).toFixed(1)} MB. ${isXlsx ? "Excel" : "CSV"} files can be up to ${maxBytes / (1024 * 1024)} MB.`,
    };
  }

  const manifest = sanitizeManifest(images);
  if (!manifest.ok) return { ok: false, message: manifest.message };

  const parsed = isXlsx
    ? await parseProductImportWorkbook(await file.arrayBuffer())
    : parseProductImportCsv(await file.text());
  if (!parsed.ok) return { ok: false, message: parsed.message };
  if (parsed.rows.length > PRODUCT_IMPORT_MAX_ROWS) {
    return {
      ok: false,
      message: `Check up to ${PRODUCT_IMPORT_MAX_ROWS} rows at a time.`,
    };
  }

  const { supabase, user } = await requireUser();
  const supplierId = await getVerifiedSupplierId(supabase, user.id);
  if (!supplierId) return { ok: false, message: NO_SUPPLIER_MESSAGE };

  try {
    const [categories, existing] = await Promise.all([
      loadCategories(),
      loadExistingSkus(
        supabase,
        supplierId,
        parsed.rows.map((row) => row.cells.seller_sku ?? ""),
      ),
    ]);

    return {
      ok: true,
      rows: parsed.rows,
      preview: buildProductImportPreview({
        rows: parsed.rows,
        categories,
        existing,
        images: manifest.entries,
      }),
    };
  } catch (err) {
    console.error("previewProductImportFile failed:", err);
    return { ok: false, message: "Could not check the file. Try again." };
  }
}

type ProductInsert = Record<string, unknown>;

/**
 * Create one short batch of products as drafts. Photos are uploaded by
 * `importProductImages` afterwards, one product at a time, so no request has
 * to carry every photo in one body.
 */
export async function importProductBatch(
  rows: ProductImportRawRow[],
  options: { storeId?: string },
): Promise<ProductImportBatchResult> {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { ok: false, message: "There are no rows to import." };
  }
  if (rows.length > PRODUCT_IMPORT_WRITE_BATCH_SIZE) {
    return {
      ok: false,
      message: `Import at most ${PRODUCT_IMPORT_WRITE_BATCH_SIZE} rows per batch.`,
    };
  }

  const { supabase, user } = await requireUser();
  const supplierId = await getVerifiedSupplierId(supabase, user.id);
  if (!supplierId) return { ok: false, message: NO_SUPPLIER_MESSAGE };

  const requestedStore = options.storeId?.trim() || null;
  const { stores } = await getDashboardStore();
  const allowedStores = new Set(stores.map((store) => store.id));
  if (requestedStore && !allowedStores.has(requestedStore)) {
    return { ok: false, message: "You can't add products to that store." };
  }
  const storeId = requestedStore;

  try {
    const [categories, existing] = await Promise.all([
      loadCategories(),
      loadExistingSkus(
        supabase,
        supplierId,
        rows.map((row) => row.cells.seller_sku ?? ""),
      ),
    ]);
    const { ready, failed } = validateProductImportRows(
      rows,
      createCategoryLookup(categories),
      existing,
    );
    const failedRows = failed.map((row) => ({
      line: row.line,
      title: row.title,
      message: row.message,
    }));
    if (ready.length === 0) {
      return { ok: true, created: [], failed: failedRows };
    }

    const usedSkus = new Set([...existing, ...ready.map((row) => row.values.seller_sku)]);
    for (const row of ready) {
      if (row.values.seller_sku) continue;
      let sku = generateSku();
      while (usedSkus.has(sku)) sku = generateSku();
      usedSkus.add(sku);
      row.values.seller_sku = sku;
    }

    const payload: ProductInsert[] = ready.map((row) => {
      const values = row.values;
      return {
        supplier_id: supplierId,
        store_id: storeId,
        category_id: values.category_id,
        title: values.title,
        description: toRichText(values.description),
        seller_sku: values.seller_sku,
        hsn_code: values.hsn_code,
        gst_rate: values.gst_rate,
        carton_units: values.carton_units,
        carton_dimensions: values.carton_dimensions,
        carton_weight_kg: values.carton_weight_kg,
        unit: values.unit,
        price_per_unit: values.price_per_unit,
        ...(values.mrp != null ? { mrp: values.mrp } : {}),
        moq: values.moq,
        stock_qty: values.stock_qty,
        lead_time_days: 7,
        negotiable: values.negotiable,
        is_winning: false,
        is_hot_selling: false,
        sample_available: false,
        sample_price: null,
        packaging_details: values.packaging_details,
        warranty_return: values.warranty_return,
        youtube_url: values.youtube_url || null,
        youtube_id: values.youtube_url ? extractYoutubeId(values.youtube_url) : null,
        seo_title: values.seo_title || defaultSeoTitle(values.title),
        seo_description:
          values.seo_description || defaultSeoDescription(values.description),
        status: "draft",
      };
    });

    const insert = () =>
      supabase.from("products").insert(payload).select("id, seller_sku");

    let { data: inserted, error: insertError } = await insert();
    // Database without the `mrp` column yet: retry when nothing needs it.
    if (
      isMissingMrpColumn(insertError) &&
      ready.every((row) => row.values.mrp == null)
    ) {
      for (const row of payload) delete row.mrp;
      ({ data: inserted, error: insertError } = await insert());
    }
    if (insertError) {
      console.error("importProductBatch insert failed:", insertError);
      return {
        ok: false,
        message:
          insertError.code === "23505"
            ? "A SKU in this batch already exists. Re-check the file and try again."
            : "Could not create the products. Try again.",
      };
    }

    const idBySku = new Map<string, string>();
    for (const row of (inserted ?? []) as { id: string; seller_sku: string }[]) {
      idBySku.set(row.seller_sku, row.id);
    }

    const created: {
      line: number;
      title: string;
      sku: string;
      productId: string;
      warnings: string[];
    }[] = [];

    for (const row of ready) {
      const productId = idBySku.get(row.values.seller_sku);
      if (!productId) {
        failedRows.push({
          line: row.line,
          title: row.title,
          message: "The product was not created. Try this row again.",
        });
        continue;
      }
      created.push({
        line: row.line,
        title: row.title,
        sku: row.values.seller_sku,
        productId,
        warnings: [...row.warnings],
      });
    }

    return { ok: true, created, failed: failedRows };
  } catch (err) {
    console.error("importProductBatch failed:", err);
    return { ok: false, message: "Could not import this batch. Try again." };
  }
}

/**
 * Compress and attach one product's photos, then optionally publish it. Kept
 * to one product per request so each body stays well under the server-action
 * size limit and the browser can show real progress.
 */
export async function importProductImages(
  formData: FormData,
): Promise<ProductImportImagesResult> {
  const productId = String(formData.get("product_id") ?? "").trim();
  if (!productId) return { ok: false, message: "Choose a product for these photos." };
  const publish = formData.get("publish") === "true";

  const files = formData
    .getAll("images")
    .filter((value): value is File => value instanceof File && value.size > 0);
  if (files.length === 0) return { ok: false, message: "There are no photos to add." };
  if (files.length > MAX_PRODUCT_IMAGES) {
    return {
      ok: false,
      message: `A product can have up to ${MAX_PRODUCT_IMAGES} photos. Remove the extras and try again.`,
    };
  }
  for (const file of files) {
    if (file.size > PRODUCT_IMPORT_IMAGE_MAX_BYTES) {
      return {
        ok: false,
        message: `${file.name} is over 2 MB. Resize it and select the folder again.`,
      };
    }
    const invalid = await validateProductImageFile(file);
    if (invalid) return { ok: false, message: `${file.name}: ${invalid}` };
  }

  const { supabase, user } = await requireUser();
  const supplierId = await getVerifiedSupplierId(supabase, user.id);
  if (!supplierId) return { ok: false, message: NO_SUPPLIER_MESSAGE };

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id")
    .eq("id", productId)
    .eq("supplier_id", supplierId)
    .maybeSingle();
  if (productError) {
    console.error("importProductImages product lookup failed:", productError);
    return { ok: false, message: "Could not find that product. Try importing again." };
  }
  if (!product) {
    return { ok: false, message: "Could not find that product. Try importing again." };
  }

  const paths: string[] = [];
  try {
    for (const file of files) {
      paths.push(await uploadProductImage(supabase, user.id, productId, file));
    }

    const { error: attachError } = await supabase.rpc("replace_product_images", {
      p_product_id: productId,
      p_paths: paths,
    });
    if (attachError) {
      console.error("importProductImages attach failed:", attachError);
      await removeStoredPaths(supabase, paths);
      return {
        ok: false,
        message: "Photos could not be attached. Open the product and add them again.",
      };
    }
  } catch (err) {
    console.error("importProductImages upload failed:", err);
    await removeStoredPaths(supabase, paths);
    return {
      ok: false,
      message:
        err instanceof Error ? err.message : "Photos could not be uploaded. Try again.",
    };
  }

  const warnings = imageWarnings(paths.length);
  let published = false;
  if (publish && paths.length >= MIN_PRODUCT_IMAGES) {
    const { error: publishError } = await supabase.rpc(
      "submit_product_for_approval",
      { p_product_id: productId },
    );
    if (publishError) {
      console.error("importProductImages publish failed:", publishError);
      warnings.push(`Saved as a draft; could not publish: ${publishError.message}`);
    } else {
      published = true;
    }
  }

  return { ok: true, productId, attached: paths.length, published, warnings };
}

/** One cache refresh for the whole import, after every batch has finished. */
export async function finishProductImport(published: number): Promise<void> {
  // A public endpoint like every server action: only a verified supplier may
  // flush the catalogue cache (otherwise anyone could force full rebuilds).
  const { supabase, user } = await requireUser();
  if (!(await getVerifiedSupplierId(supabase, user.id))) return;
  revalidatePath(SUPPLIER_PRODUCTS_PATH);
  // Only published rows changed the storefront.
  if (published > 0) refreshCatalogue();
}
