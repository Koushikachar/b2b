import sharp from "sharp";

export type OptimizeImageOptions = {
  maxDimension?: number;
  targetBytes?: number;
  format?: "webp" | "jpeg";
};

export type OptimizedImage = {
  buffer: Buffer;
  contentType: string;
  extension: string;
  width: number;
  height: number;
};

// Stored originals are a master copy: shoppers get next/image's resized,
// re-encoded variants per screen, so a bigger original costs no page speed.
// 2560px covers zoom and 4K screens; above that the gallery (720px, 1440px on
// 2x screens) can't show the extra detail, so it would only cost storage.
const DEFAULT_MAX_DIMENSION = 2560;
const DEFAULT_TARGET_BYTES = 900 * 1024;

/**
 * Compress an uploaded image to (at most) `targetBytes` while keeping it
 * sharp. Tries high quality first and never goes below 85% of the size or
 * quality 84; returns the first result that fits, otherwise the smallest.
 *
 * Server-only: imports `sharp`, so this module must never be imported by
 * client code.
 */
export async function optimizeImageUpload(
  file: File,
  options: OptimizeImageOptions = {},
): Promise<OptimizedImage> {
  const maxDimension = options.maxDimension ?? DEFAULT_MAX_DIMENSION;
  const targetBytes = options.targetBytes ?? DEFAULT_TARGET_BYTES;
  const format = options.format ?? "webp";

  const input = Buffer.from(await file.arrayBuffer());

  const dimensionSteps = [maxDimension, Math.round(maxDimension * 0.85)];
  const qualitySteps = [92, 88, 84];

  let best: { buffer: Buffer; width: number; height: number } | null = null;

  for (const dim of dimensionSteps) {
    for (const quality of qualitySteps) {
      const pipeline = sharp(input)
        .rotate()
        .resize(dim, dim, { fit: "inside", withoutEnlargement: true });

      // resolveWithObject returns the output size too, so the result isn't
      // decoded a second time just to read its dimensions.
      const { data: buffer, info } =
        format === "webp"
          ? // smartSubsample keeps colour edges (labels, logos) crisp.
            await pipeline.webp({ quality, smartSubsample: true, effort: 5 }).toBuffer({ resolveWithObject: true })
          : await pipeline
              .jpeg({ quality, progressive: true, mozjpeg: true })
              .toBuffer({ resolveWithObject: true });

      const width = info.width ?? dim;
      const height = info.height ?? dim;

      if (!best || buffer.byteLength < best.buffer.byteLength) {
        best = { buffer, width, height };
      }

      if (buffer.byteLength <= targetBytes) {
        return {
          buffer,
          contentType: format === "webp" ? "image/webp" : "image/jpeg",
          extension: format === "webp" ? "webp" : "jpg",
          width,
          height,
        };
      }
    }
  }

  if (!best) {
    throw new Error("Could not optimize image.");
  }

  return {
    buffer: best.buffer,
    contentType: format === "webp" ? "image/webp" : "image/jpeg",
    extension: format === "webp" ? "webp" : "jpg",
    width: best.width,
    height: best.height,
  };
}