/**
 * One-time fix for product photos stored before uploads kept full quality
 * (the old 100 KB target saved many at ~800px / quality 50).
 *
 *   node --env-file=.env scripts/upscale-product-images.ts            # dry run: report only
 *   node --env-file=.env scripts/upscale-product-images.ts --apply    # make the change
 *
 * For each product image whose longest side is under 1400px: upscale it to
 * 1600px (Lanczos resampling + light sharpening), save it as WebP quality 90
 * NEXT TO the original (`…_hq.webp`), and point product_images at the new file.
 * Originals are never deleted, and every change is written to a CSV log, so it
 * can be rolled back by setting each row's path back to `old_path`.
 *
 * Note: resampling can't restore detail the old compression removed; it makes
 * small images display larger and crisper. Re-uploading the original photo is
 * the only full fix.
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (server key).
 */
import { writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const BUCKET = "product_images";
const TARGET = 1600;
const LOW_RES_BELOW = 1400;

const apply = process.argv.includes("--apply");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (run with --env-file=.env).");
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

type Row = { id: string; product_id: string; path: string };

async function allImages(): Promise<Row[]> {
  const rows: Row[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from("product_images").select("id, product_id, path").order("id").range(from, from + 999);
    if (error) throw new Error(`Listing product images failed: ${error.message}`);
    rows.push(...(data as Row[]));
    if (!data || data.length < 1000) return rows;
  }
}

async function main() {
  const rows = (await allImages()).filter((r) => !r.path.endsWith("_hq.webp"));
  const log: string[][] = [["image_id", "product_id", "old_path", "new_path", "old_size", "new_size", "status"]];
  let changed = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      const { data: blob, error } = await db.storage.from(BUCKET).download(row.path);
      if (error || !blob) throw new Error(error?.message ?? "download failed");
      const input = Buffer.from(await blob.arrayBuffer());
      const meta = await sharp(input).metadata();
      const longest = Math.max(meta.width ?? 0, meta.height ?? 0);
      if (longest >= LOW_RES_BELOW) {
        skipped++;
        continue;
      }

      const { data: output, info } = await sharp(input)
        .rotate()
        .resize(TARGET, TARGET, { fit: "inside", kernel: "lanczos3" })
        .sharpen({ sigma: 0.6 })
        .webp({ quality: 90 })
        .toBuffer({ resolveWithObject: true });
      const newPath = `${row.path.replace(/\.[^./]+$/, "")}_hq.webp`;
      const sizes = [`${meta.width}x${meta.height}`, `${info.width}x${info.height}`];

      if (apply) {
        const { error: upErr } = await db.storage.from(BUCKET).upload(newPath, output, { contentType: "image/webp", upsert: true });
        if (upErr) throw new Error(`upload failed: ${upErr.message}`);
        const { error: rowErr } = await db.from("product_images").update({ path: newPath }).eq("id", row.id);
        if (rowErr) throw new Error(`row update failed: ${rowErr.message}`);
      }
      changed++;
      log.push([row.id, row.product_id, row.path, newPath, ...sizes, apply ? "upscaled" : "would upscale"]);
      process.stdout.write(apply ? "+" : ".");
    } catch (err) {
      failed++;
      log.push([row.id, row.product_id, row.path, "", "", "", `failed: ${err instanceof Error ? err.message : err}`]);
      process.stdout.write("x");
    }
  }

  const file = `upscale-product-images-${apply ? "applied" : "dry-run"}-${new Date().toISOString().slice(0, 19).replace(/:/g, "")}.csv`;
  writeFileSync(file, log.map((r) => r.map((c) => (/[",]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(",")).join("\n"));
  console.log(
    `\n${apply ? "Upscaled" : "Would upscale"} ${changed}, already sharp ${skipped}, failed ${failed} of ${rows.length}. Log: ${file}`,
  );
  if (!apply) console.log("Dry run only. Re-run with --apply to make the change.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
