/**
 * Browser-only image helpers for uploads.
 *
 * Vercel rejects any request to a function (server action or route handler)
 * over 4.5 MB with HTTP 413, whatever next.config's bodySizeLimit says. Phone
 * photos are often 3–6 MB, so every upload shrinks images here first.
 */

const MAX_DIMENSION = 1600;

/**
 * Per-image upload budget. A product save sends up to 8 images + 1 search
 * image in one request: 9 × 450 KB keeps it under 4.5 MB. The server
 * re-optimizes to ~100 KB anyway.
 */
export const MAX_UPLOAD_IMAGE_BYTES = 450 * 1024;

/**
 * Resolve a URL to a drawable image while honoring EXIF orientation (matters
 * for phone photos). Falls back to <img> where createImageBitmap is missing.
 */
export async function loadOrientedImage(url: string): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function" && typeof ImageBitmap !== "undefined") {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("fetch failed");
      const blob = await res.blob();
      return await createImageBitmap(blob, { imageOrientation: "from-image" });
    } catch {
      // Fall through to the classic <img> loader.
    }
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load the image."));
    img.src = url;
  });
}

/**
 * Shrink an image before upload: fit within 1600px, re-encode as JPEG,
 * stepping quality down until it is under the budget. Small files and
 * anything that fails to decode pass through unchanged (the server still
 * validates type and size).
 */
export async function shrinkImageFile(file: File): Promise<File> {
  if (file.size <= MAX_UPLOAD_IMAGE_BYTES || !file.type.startsWith("image/")) return file;
  const url = URL.createObjectURL(file);
  try {
    const image = await loadOrientedImage(url);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    // JPEG has no transparency: put transparent PNG cut-outs on white.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    let blob: Blob | null = null;
    for (const quality of [0.82, 0.7, 0.55, 0.4]) {
      blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", quality),
      );
      if (blob && blob.size <= MAX_UPLOAD_IMAGE_BYTES) break;
    }
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.jpg`, {
      type: "image/jpeg",
      lastModified: file.lastModified,
    });
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * For a plain `<input type="file" name=…>` submitted by a form: swap the
 * picked image for its shrunk copy in place, so the form posts the small one.
 * Returns the file now in the input (or null).
 */
export async function shrinkFileInput(input: HTMLInputElement): Promise<File | null> {
  const picked = input.files?.[0] ?? null;
  if (!picked) return null;
  const file = await shrinkImageFile(picked);
  if (file !== picked) {
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
  }
  return file;
}
