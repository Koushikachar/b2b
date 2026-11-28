import type { NextConfig } from "next"

/**
 * Security headers on every response. HSTS makes browsers use HTTPS only (it
 * is ignored on http://localhost). frame-ancestors / X-Frame-Options stop
 * clickjacking; camera + geolocation stay allowed for this site only (photo
 * search, address detection).
 */
const SECURITY_HEADERS = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(self), geolocation=(self), microphone=(), payment=(), usb=(), interest-cohort=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
]

/**
 * Private areas: kept out of search with a noindex header rather than a
 * robots.txt block. Google can index a robots-blocked URL it finds through a
 * link (Search Console: "Indexed, though blocked by robots.txt") because the
 * block stops it seeing any noindex; crawlable + noindex removes them.
 * They stay private regardless: every one requires sign-in.
 */
export const PRIVATE_PREFIXES = ["/account", "/cart", "/checkout", "/orders", "/auth", "/supplier", "/admin", "/api"]
/** Stores not launched yet ("coming soon"): out of search until they have real content. */
export const UPCOMING_PREFIXES = ["/select"]
const NOINDEX = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }]

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: SECURITY_HEADERS },
      ...[...PRIVATE_PREFIXES, ...UPCOMING_PREFIXES].flatMap((prefix) => [
        { source: prefix, headers: NOINDEX },
        { source: `${prefix}/:path*`, headers: NOINDEX },
      ]),
    ]
  },
  images: {
    // Image optimization enabled: AVIF/WebP conversion + auto-resizing via
    // Next.js Image Optimization API. Remote images from Supabase storage are
    // proxied and resized on demand.
    formats: ["image/avif", "image/webp"],
    // 75 = default; 90 = product photos (ProductImage / gallery), where a
    // second lossy pass at 75 visibly softened detail. Next 16 requires the list.
    qualities: [75, 90],
    // Fewer candidate widths (defaults are 15 per image): each <img> srcset
    // shrinks by about half, which was 261KB of the home page's HTML. Still
    // covers 3x phones (390px × 3 ≈ 1170 → 1280) and full-width desktop art.
    deviceSizes: [640, 828, 1080, 1280, 1920],
    imageSizes: [64, 128, 256, 384],
    // Some IPv6-only networks (NAT64/DNS64) resolve *.supabase.co to
    // 64:ff9b::/96, which Next's SSRF guard treats as private, so every product
    // image 400s locally ("url" parameter is not allowed). Dev only: the
    // remotePatterns below still restrict the optimizer to Supabase storage.
    dangerouslyAllowLocalIP: process.env.NODE_ENV === "development",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/render/image/public/**",
      },
    ],
  },
  experimental: {
    serverActions: {
      // Self-hosted (nginx): up to 8 high-quality product photos per save
      // (lib/shrink-image.ts budgets 1.8 MB each); per-file rules are enforced
      // in each action. nginx's client_max_body_size must be at least this.
      // (On Vercel this could not exceed its hard 4.5 MB request cap.)
      bodySizeLimit: "20mb",
    },
    // Dev-memory fix (8 GB RAM machines were swapping): several dependencies
    // ship a single barrel that re-exports thousands of modules — notably
    // `@hugeicons/core-free-icons` (~148 MB, imported by ~60 files) and
    // `recharts` (`import *`). Without this, compiling any page that touches
    // one icon parses the entire barrel. This rewrites those imports to
    // per-module paths at compile time; no source changes needed.
    optimizePackageImports: [
      "@hugeicons/core-free-icons",
      "@hugeicons/react",
      "@base-ui/react",
      "embla-carousel-react",
      "recharts",
      "@tiptap/react",
      "@tiptap/starter-kit",
      "@tiptap/extension-link",
    ],
  },
}

export default nextConfig
