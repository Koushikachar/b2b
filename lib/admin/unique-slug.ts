import type { SupabaseClient } from "@supabase/supabase-js";

/** "Kitchen & Dining!" → "kitchen-dining" (only a–z, 0–9 and "-"); `fallback` when nothing is left. */
export function slugify(name: string, fallback: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || fallback
  );
}

/** First free of base, base-2 … base-10; after that a timestamped slug. */
export function pickFreeSlug(base: string, taken: ReadonlySet<string>): string {
  for (let n = 1; n <= 10; n += 1) {
    const slug = n === 1 ? base : `${base}-${n}`;
    if (!taken.has(slug)) return slug;
  }
  return `${base}-${Date.now()}`;
}

/**
 * A slug for `name` that no other row in `table` uses (ignoring `ignoreId`,
 * the row being renamed). One query for every candidate: slugify output has
 * no LIKE wildcards (`%`, `_`), so `base%` matches exactly the slugs that
 * could clash. Previously this checked base, base-2 … base-10 one query each.
 */
export async function uniqueSlug(
  supabase: SupabaseClient,
  table: "categories" | "stores",
  name: string,
  fallback: string,
  ignoreId?: string,
): Promise<string> {
  const base = slugify(name, fallback);
  let query = supabase.from(table).select("slug").like("slug", `${base}%`);
  if (ignoreId) query = query.neq("id", ignoreId);
  const { data } = await query;
  return pickFreeSlug(base, new Set((data ?? []).map((row) => row.slug as string)));
}
