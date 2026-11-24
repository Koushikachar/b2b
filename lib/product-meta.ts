// Pure helpers for the storefront <head> metadata. Kept dependency-free so
// they can be unit-tested without a Supabase client.
import { stripHtml } from "@/lib/supplier/rich-text";

export type ProductMetaSource = {
  title: string;
  description: string;
  seo_title: string | null;
  seo_description: string | null;
};

const META_DESCRIPTION_MAX = 160;

export function resolveProductMetaTitle(product: ProductMetaSource): string {
  const seo = product.seo_title?.trim() ?? "";
  return seo.length > 0 ? seo : product.title;
}

/**
 * Title for the product page's metadata. Most SEO titles already end in
 * "| Direct2Hub"; those skip the site's "%s | Direct2Hub" template so the
 * brand is not shown twice.
 */
export function productPageTitle(title: string): string | { absolute: string } {
  return /direct2hub/i.test(title) ? { absolute: title } : title;
}

export function resolveProductMetaDescription(product: ProductMetaSource): string {
  const seo = product.seo_description?.trim() ?? "";
  const body = stripHtml(product.description).trim();
  const source = seo.length > 0 ? seo : body;
  if (source.length <= META_DESCRIPTION_MAX) return source;
  return `${source.slice(0, META_DESCRIPTION_MAX - 1).trimEnd()}…`;
}