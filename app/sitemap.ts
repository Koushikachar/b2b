import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/site";

const absolute = (path: string) => `${SITE_URL}${path}`;

const PAGE_SIZE = 5000;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();
  const now = new Date();

  const [{ data: products }, { data: categories }, { data: suppliers }] = await Promise.all([
    supabase
      .from("products")
      .select("id, updated_at")
      .eq("status", "approved")
      .eq("is_hidden", false)
      .limit(PAGE_SIZE),
    supabase.from("categories").select("slug").limit(500),
    supabase.from("storefront_suppliers").select("id").limit(1000),
  ]);

  return [
    { url: absolute("/"), lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: absolute("/products"), lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: absolute("/categories"), lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: absolute("/faq"), changeFrequency: "monthly" as const, priority: 0.6 },
    ...["/stores", "/stores/d2h-core", "/select", "/suppliers", "/services"].map((path) => ({
      url: absolute(path),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...["/about", "/contact", "/privacy", "/terms"].map((path) => ({
      url: absolute(path),
      changeFrequency: "yearly" as const,
      priority: 0.2,
    })),
    ...((categories ?? []) as { slug: string }[]).map((category) => ({
      url: absolute(`/category/${category.slug}`),
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...((products ?? []) as { id: string; updated_at: string | null }[]).map((product) => ({
      url: absolute(`/products/${product.id}`),
      // Real edit date, so crawlers re-fetch only products that changed.
      lastModified: product.updated_at ? new Date(product.updated_at) : now,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...((suppliers ?? []) as { id: string }[]).map((supplier) => ({
      url: absolute(`/store/${supplier.id}`),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
  ];
}
