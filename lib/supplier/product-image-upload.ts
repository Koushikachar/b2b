import type { SupabaseClient } from "@supabase/supabase-js";
import { optimizeImageUpload } from "@/lib/image-optimize";

/** Storage bucket that holds every product image. */
export const PRODUCT_IMAGE_BUCKET = "product_images";

/**
 * Compress and upload one product image. Shared by the single-product form and
 * the CSV importer so both store exactly the same file shape.
 */
export async function uploadProductImage(
  supabase: SupabaseClient,
  userId: string,
  productId: string,
  file: File,
  folder: string | null = null,
): Promise<string> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const baseName = safeName.replace(/\.[^.]+$/, "");

  // Compress at upload time so storage stays small. Fall back to the original
  // file if optimization fails, so uploads never break.
  let body: Buffer | File = file;
  let contentType = file.type || "application/octet-stream";
  let extension = safeName.includes(".") ? safeName.split(".").pop()! : "bin";
  try {
    // Defaults: high-quality 1600px master (see lib/image-optimize.ts).
    const optimized = await optimizeImageUpload(file);
    body = optimized.buffer;
    contentType = optimized.contentType;
    extension = optimized.extension;
  } catch (err) {
    console.error("product image optimization failed, uploading original:", err);
  }

  const path = folder
    ? `${userId}/${folder}/${productId}_${Date.now()}_${baseName}.${extension}`
    : `${userId}/${productId}_${Date.now()}_${baseName}.${extension}`;
  const { error } = await supabase.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .upload(path, body, { contentType, upsert: false });
  if (error) throw new Error("Could not upload product image. Try again.");
  return path;
}

/** Best-effort storage cleanup; callers never fail because of it. */
export async function removeStoredPaths(
  supabase: SupabaseClient,
  paths: string[],
): Promise<void> {
  if (paths.length === 0) return;
  const { error } = await supabase.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .remove(paths);
  if (error) {
    console.error("storage cleanup failed:", error);
  }
}
