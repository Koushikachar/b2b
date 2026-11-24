import { Geist_Mono } from "next/font/google"
import localFont from "next/font/local"
import type { Metadata, Viewport } from "next"
import { MotionConfig } from "motion/react"

import "./globals.css"
import { Toaster } from "@/components/ui/toast"
import { cn } from "@/lib/utils"
import { SITE_NAME, SITE_URL } from "@/lib/site"
import { serializeJsonLd } from "@/lib/json-ld"
import { siteJsonLd } from "@/lib/seo"
import { AnalyticsConsent } from "@/components/layout/analytics-consent"

// Organization + WebSite schema (knowledge panel, entity for AI engines, site search).
const SITE_JSON_LD = siteJsonLd(SITE_URL)

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: {
    default: `${SITE_NAME} — Wholesale Marketplace India | Bulk Buying from Verified Suppliers`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Buy wholesale in bulk from verified Indian suppliers on Direct2Hub. Low MOQs, ₹3,000 minimum order, GST invoices, 5–7 day delivery and free damage protection.",
  category: "shopping",
  openGraph: {
    siteName: SITE_NAME,
    type: "website",
    locale: "en_IN",
  },
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: false },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#FF6A00",
}

const inter = localFont({
  src: [
    {
      path: "../public/fonts/Inter-400.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/Inter-500.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/fonts/Inter-600.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../public/fonts/Inter-700.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-sans",
  display: "swap",
  preload: true,
})

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  // Only used on order/payment and dashboard screens; don't preload it on
  // the storefront's first paint.
  preload: false,
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={cn(
        "light",
        "antialiased",
        fontMono.variable,
        "font-sans",
        inter.variable
      )}
    >
      {/* Browser extensions (e.g. ColorZilla's `cz-shortcut-listen`) add
          attributes to <body> before hydration. This only silences attribute
          mismatches on <body> itself, not on anything rendered inside it. */}
      <body suppressHydrationWarning>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(SITE_JSON_LD) }}
        />
        {/* Motion honours prefers-reduced-motion app-wide (apple-design §14). */}
        <MotionConfig reducedMotion="user">
          {children}
          <Toaster />
          <AnalyticsConsent />
        </MotionConfig>
      </body>
    </html>
  )
}
