"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { startsNavigation } from "@/lib/navigation-progress"

/**
 * Thin brand-colour bar at the top of the screen: starts the instant a link
 * is tapped, creeps while the next page loads, fills and fades when it
 * arrives, so every tap gets visible feedback.
 */
export function NavigationProgress() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [progress, setProgress] = useState(0)
  const timers = useRef<{ trickle?: number; safety?: number }>({})

  // Start on a tap that leads to another page of the site.
  useEffect(() => {
    const t = timers.current
    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null
      if (!anchor) return
      const go = startsNavigation(
        event,
        { href: anchor.href, target: anchor.target, download: anchor.hasAttribute("download") },
        window.location.href,
      )
      if (!go) return
      window.clearInterval(t.trickle)
      window.clearTimeout(t.safety)
      setProgress(12)
      t.trickle = window.setInterval(() => {
        setProgress((p) => (p > 0 && p < 90 ? p + (90 - p) * 0.12 : p))
      }, 200)
      // Never stays stuck if a link changes nothing.
      t.safety = window.setTimeout(() => setProgress((p) => (p > 0 ? 100 : p)), 12000)
    }
    // Capture phase: next/link preventDefaults its own clicks (it routes
    // client-side), so by the bubble phase every link looks cancelled.
    document.addEventListener("click", onClick, true)
    return () => {
      document.removeEventListener("click", onClick, true)
      window.clearInterval(t.trickle)
      window.clearTimeout(t.safety)
    }
  }, [])

  // The new page is here: fill to 100%.
  const route = `${pathname}?${searchParams.toString()}`
  const [seenRoute, setSeenRoute] = useState(route)
  if (seenRoute !== route) {
    setSeenRoute(route)
    if (progress > 0) setProgress(100)
  }

  // Once full, fade out and reset.
  useEffect(() => {
    if (progress !== 100) return
    const t = timers.current
    window.clearInterval(t.trickle)
    window.clearTimeout(t.safety)
    const hide = window.setTimeout(() => setProgress(0), 350)
    return () => window.clearTimeout(hide)
  }, [progress])

  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px]">
      <div
        className="h-full bg-primary transition-[width,opacity] duration-300 ease-out motion-reduce:transition-none"
        style={{ width: `${progress}%`, opacity: progress > 0 && progress < 100 ? 1 : 0 }}
      />
    </div>
  )
}
