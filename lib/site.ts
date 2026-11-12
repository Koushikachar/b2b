// Single source of truth for the public site URL and display name.
// Set NEXT_PUBLIC_APP_URL in production; localhost is a dev-only default.

export const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const SITE_NAME = "D2B";
// Customer support channels shown on Account → Contact Us. Configure per
// deployment; a channel that is not set is simply not shown.
export const SUPPORT_WHATSAPP = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? "";
export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "";
export const SUPPORT_PHONE = process.env.NEXT_PUBLIC_SUPPORT_PHONE ?? "";
