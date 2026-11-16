"use client"

import { useSyncExternalStore } from "react"
import Link from "next/link"
import Script from "next/script"

const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? ""
const STORAGE_KEY = "d2h:analytics-consent"
type Consent = "granted" | "denied" | null

// Consent lives in localStorage; a tiny external store keeps every reader in
// sync and renders nothing on the server (no hydration mismatch).
const listeners = new Set<() => void>()
function readConsent(): Consent {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY)
    return value === "granted" || value === "denied" ? value : null
  } catch {
    return null
  }
}
function writeConsent(value: Exclude<Consent, null>) {
  try {
    window.localStorage.setItem(STORAGE_KEY, value)
  } catch {
    // Storage blocked: the choice lasts for this page view only.
  }
  listeners.forEach((listener) => listener())
}
function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/**
 * Google Analytics, loaded only after the visitor accepts. Without
 * NEXT_PUBLIC_GA_ID nothing renders: the site's own cookies (sign-in) are
 * strictly necessary and need no banner.
 */
export function AnalyticsConsent() {
  const consent = useSyncExternalStore(subscribe, readConsent, () => "denied" as Consent)
  if (!GA_ID) return null

  return (
    <>
      {consent === "granted" ? (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
          <Script id="ga-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}',{anonymize_ip:true});`}
          </Script>
        </>
      ) : null}

      {consent === null ? (
        <div
          role="dialog"
          aria-live="polite"
          aria-label="Cookie consent"
          className="fixed inset-x-3 bottom-[calc(var(--bottom-nav-offset,0px)+0.75rem)] z-[60] mx-auto max-w-xl rounded-xl border border-border bg-card p-4 shadow-lg lg:bottom-4"
        >
          <p className="text-sm text-foreground">
            We use cookies to keep you signed in and, with your permission, to understand how the
            site is used. See our{" "}
            <Link href="/privacy" className="font-semibold text-primary underline-offset-2 hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => writeConsent("granted")}
              className="press h-10 flex-1 rounded-lg bg-primary text-sm font-bold text-primary-foreground hover:bg-brand-dark"
            >
              Accept analytics
            </button>
            <button
              type="button"
              onClick={() => writeConsent("denied")}
              className="press h-10 flex-1 rounded-lg border border-border bg-card text-sm font-semibold hover:bg-muted"
            >
              Only necessary
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
}
