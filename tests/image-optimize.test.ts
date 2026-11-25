import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { optimizeImageUpload } from "../lib/image-optimize";

/** A 3000×2000 PNG: smooth gradient (compresses well) or noise (worst case). */
async function photo(kind: "gradient" | "noise"): Promise<File> {
  const width = 3000;
  const height = 2000;
  const raw = Buffer.alloc(width * height * 3);
  for (let i = 0; i < raw.length; i += 3) {
    const x = (i / 3) % width;
    raw[i] = kind === "noise" ? Math.random() * 255 : (x / width) * 255;
    raw[i + 1] = kind === "noise" ? Math.random() * 255 : 120;
    raw[i + 2] = kind === "noise" ? Math.random() * 255 : 200;
  }
  const png = await sharp(raw, { raw: { width, height, channels: 3 } }).png().toBuffer();
  return new File([new Uint8Array(png)], "photo.png", { type: "image/png" });
}

describe("optimizeImageUpload (stored product image master)", () => {
  it("keeps a typical photo at full 2560px (sharp on zoom and 4K screens) within 900 KB", async () => {
    const out = await optimizeImageUpload(await photo("gradient"));
    expect(out.width).toBe(2560);
    expect(out.buffer.byteLength).toBeLessThanOrEqual(900 * 1024);
    expect(out.contentType).toBe("image/webp");
  });

  it("never drops a hard-to-compress photo below 85% size (2176px)", async () => {
    const out = await optimizeImageUpload(await photo("noise"));
    expect(out.width).toBeGreaterThanOrEqual(2176);
  }, 60_000);
});
