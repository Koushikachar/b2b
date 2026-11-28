/**
 * Search titles for the category pages (owner's SEO brief, 2026-11-28).
 * The site template adds " | Direct2Hub". A new category without an entry
 * gets "Wholesale <name>".
 */
const TITLES: Record<string, string> = {
  "home-essentials": "Wholesale Home Essentials Online",
  "kitchen-dining": "Wholesale Kitchen & Dining Products",
  "bath-accessories": "Wholesale Bathroom Accessories",
  "fashion-accessories": "Wholesale Fashion Accessories",
  "electronics-accessories": "Wholesale Electronic Accessories",
  "beauty-personal-care": "Wholesale Beauty & Personal Care Products",
  "toys-kids-baby": "Wholesale Toys & Baby Products",
  "sports-fitness": "Wholesale Sports & Fitness Accessories",
  "automotive-accessories": "Wholesale Automotive Accessories",
  "office-stationery": "Wholesale Office & Stationery Products",
  "tools-home-improvement": "Wholesale Tools & Home Improvement Products",
  "pet-supplies": "Wholesale Pet Supplies",
  "garden-outdoor": "Wholesale Garden & Outdoor Products",
}

export function categorySeoTitle(slug: string, name: string): string {
  return TITLES[slug] ?? `Wholesale ${name}`
}

/** 120–160 characters: what Google shows under the title. */
export function categorySeoDescription(name: string): string {
  return `Buy ${name} wholesale on Direct2Hub for your shop or online store. Live prices, low MOQs, GST invoices and 5–7 day delivery across India.`
}
