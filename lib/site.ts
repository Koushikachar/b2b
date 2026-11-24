// Single source of truth for the public site URL and display name.
// Set NEXT_PUBLIC_APP_URL in production; localhost is a dev-only default.
import { COMPANY } from "@/lib/company"

/**
 * Production must never publish localhost in canonical links, the sitemap or
 * structured data: a missing or localhost setting falls back to the real domain.
 */
export function resolveSiteUrl(appUrl: string | undefined, nodeEnv: string | undefined): string {
  const isLocal = !appUrl || /\/\/(localhost|127\.0\.0\.1)\b/.test(appUrl)
  if (nodeEnv === "production" && isLocal) return COMPANY.website
  return (appUrl ?? "http://localhost:3000").replace(/\/+$/, "")
}

export const SITE_URL = resolveSiteUrl(process.env.NEXT_PUBLIC_APP_URL, process.env.NODE_ENV)

// One brand name everywhere (titles, Open Graph, schema) so Google and AI
// engines see a single entity, not "D2B" on some pages and "Direct2Hub" on others.
export const SITE_NAME = COMPANY.brand;
// Customer support channels shown on Account → Contact Us. Configure per
// deployment; a channel that is not set is simply not shown.
// D2H Core's WhatsApp number is the default; an env value overrides it.
export const SUPPORT_WHATSAPP = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || "7483274168";
export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "";
export const SUPPORT_PHONE = process.env.NEXT_PUBLIC_SUPPORT_PHONE ?? "";
