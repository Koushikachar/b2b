import { Geist_Mono } from "next/font/google"
import localFont from "next/font/local"
import type { Metadata, Viewport } from "next"
import { MotionConfig } from "motion/react"

import "./globals.css"
import { Toaster } from "@/components/ui/toast"
import { cn } from "@/lib/utils"
import { SITE_NAME, SITE_URL, SUPPORT_EMAIL, SUPPORT_PHONE } from "@/lib/site"
import { serializeJsonLd } from "@/lib/json-ld"
import { AnalyticsConsent } from "@/components/layout/analytics-consent"

// Organization schema (search engines' knowledge panel / sitelinks).
const ORGANIZATION_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Direct2Hub",
  alternateName: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/logo.jpg`,
  ...(SUPPORT_EMAIL || SUPPORT_PHONE
    ? {
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "customer support",
          areaServed: "IN",
          ...(SUPPORT_EMAIL ? { email: SUPPORT_EMAIL } : {}),
          ...(SUPPORT_PHONE ? { telephone: SUPPORT_PHONE } : {}),
        },
      }
    : {}),
}

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Wholesale Sourcing from Verified Indian Suppliers`,
    template: `%s · ${SITE_NAME}`,
  },
  description:
    "Source wholesale products directly from verified Indian manufacturers and suppliers. Live pricing, MOQs and negotiated deals across categories.",
  openGraph: {
    siteName: SITE_NAME,
    type: "website",
    locale: "en_IN",
  },
  robots: {
    index: true,
    follow: true,
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
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(ORGANIZATION_JSON_LD) }}
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
