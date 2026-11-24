/**
 * Direct2Hub store programmes (D2H Core, D2H Select, …). These are business
 * programmes rather than supplier rows, so their copy and terms live here.
 * Product counts and catalogues on the pages come from real catalogue reads.
 */

export type StoreFeature = { title: string; body: string }

export type StoreProgramme = {
  slug: string
  name: string
  logo: string
  badge: string
  location: string
  warehouse: string
  summary: string
  heroTitle: string
  heroSubtitle: string
  about: string
  minOrderValue: number
  audience: string
  managedLabel: string
  highlights: string[]
  whyChoose: StoreFeature[]
  ordering: StoreFeature[]
  policies: StoreFeature[]
  orderProgress: StoreFeature[]
  protection: string[]
  /** Where "View store" goes for programmes that already have their own page. */
  href: string
  comingSoon?: boolean
}

export const D2H_CORE: StoreProgramme = {
  slug: "d2h-core",
  // Shown as "Core" (same as the store tabs); the slug stays for existing links.
  name: "Core",
  // Same Core mark as the store tabs (public/stores/store-core.webp).
  logo: "/stores/store-core.webp",
  badge: "Fulfilled by Direct2Hub",
  location: "Surat, Gujarat",
  warehouse: "Surat, Gujarat",
  summary:
    "A Direct2Hub-managed store offering a wide range of products with reliable fulfilment, low minimum order value, and buyer protection.",
  heroTitle: "Core",
  heroSubtitle: "Direct2Hub's own store for ready-to-ship products",
  about:
    "D2H Core is the official store of Direct2Hub, built to make sourcing simple, reliable, and hassle-free. We offer a curated range of quality products, managed and fulfilled directly by Direct2Hub from our warehouse in Surat, Gujarat.",
  minOrderValue: 3000,
  audience: "Beginner Friendly",
  managedLabel: "Managed & Fulfilled",
  highlights: ["Direct2Hub-Managed Fulfilment", "Damage Protection", "Easy Returns"],
  whyChoose: [
    { title: "Beginner-Friendly", body: "Start sourcing easily, even if you're new to B2B buying." },
    { title: "Low Minimum Order Value", body: "Place orders from just ₹3,000." },
    { title: "Direct2Hub-Managed Fulfilment", body: "Packing, quality check, and shipping handled by us." },
    { title: "Reliable & Secure", body: "Transparent process with buyer protection." },
  ],
  ordering: [
    { title: "Minimum order value", body: "₹3,000 per order across any mix of D2H Core products." },
    { title: "How to order", body: "Add products to your cart, choose a delivery address and place the order. The order is reviewed and confirmed before payment." },
    { title: "Payment", body: "Pay after confirmation using the payment details on your order page, then submit your payment reference (UTR)." },
    { title: "GST invoice", body: "Add your GSTIN under My Account → GST Details to receive a GST invoice." },
  ],
  policies: [
    { title: "Damage protection", body: "Report transit damage with photos within 48 hours of delivery for a replacement or refund on eligible orders." },
    { title: "Returns & refunds", body: "Eligible returns are accepted on unused products in original packaging. Approved refunds are credited to your Direct2Hub Wallet." },
    { title: "Cancellations", body: "Orders can be cancelled free of charge before they are shipped." },
  ],
  orderProgress: [
    { title: "Order placed", body: "Your order reaches the D2H Core team for review." },
    { title: "Confirmed", body: "Stock and pricing are confirmed and payment is requested." },
    { title: "Packed & quality checked", body: "Products are packed at the Surat warehouse after a quality check." },
    { title: "Shipped", body: "Your order is handed to the courier with tracking." },
    { title: "Delivered", body: "Your order arrives. Report any damage within 48 hours." },
  ],
  protection: [
    "Damage protection on eligible orders",
    "Easy returns & refunds",
    "Reliable delivery with order tracking",
  ],
  href: "/stores/d2h-core",
}

export const STORE_PROGRAMMES: StoreProgramme[] = [D2H_CORE]

export function getStoreProgramme(slug: string): StoreProgramme | null {
  return STORE_PROGRAMMES.find((store) => store.slug === slug) ?? null
}
