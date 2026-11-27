/**
 * "What describes you best?" — asked once after login/sign-up and stored on
 * profiles.business_type. Values must match profiles_business_type_check
 * (supabase/migrations/20261127020000_profile_business_type.sql).
 */
export const BUSINESS_TYPES = [
  { value: "retailer", label: "Retailer / shop owner" },
  { value: "wholesaler", label: "Wholesaler / distributor" },
  { value: "online_seller", label: "Online seller (Amazon, Flipkart, Meesho)" },
  { value: "dropshipper", label: "Dropshipper" },
  { value: "reseller", label: "Reseller (WhatsApp, Instagram)" },
  { value: "business_use", label: "Buying for my business or office" },
  { value: "personal_use", label: "Personal use" },
] as const

export type BusinessType = (typeof BUSINESS_TYPES)[number]["value"]

export function isBusinessType(value: unknown): value is BusinessType {
  return BUSINESS_TYPES.some((type) => type.value === value)
}
