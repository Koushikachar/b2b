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

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }]
  },
  images: {
    // Image optimization enabled: AVIF/WebP conversion + auto-resizing via
    // Next.js Image Optimization API. Remote images from Supabase storage are
    // proxied and resized on demand.
    formats: ["image/avif", "image/webp"],
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
      // Match Vercel's hard 4.5 MB request cap (it returns 413 above it, and
      // this setting cannot raise it), so local dev fails the same way prod
      // would. Image uploads are shrunk in the browser to stay under it
      // (lib/shrink-image.ts); per-file rules are enforced in each action.
      bodySizeLimit: "4.5mb",
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
