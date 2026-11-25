"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"

/**
 * Whether the page's own big search panel (`[data-hero-search]`, the homepage
 * hero) is on screen below the header. `null` until that panel exists on the
 * page (it streams in), so callers can avoid flashing a second search box.
 *
 * shortcut: a page whose hero never renders keeps `null`; only the homepage
 * has one and it always renders while categories exist.
 */
export function useHeroSearchVisible(): boolean | null {
  const pathname = usePathname()
  const [visible, setVisible] = useState<boolean | null>(null)

  useEffect(() => {
    let io: IntersectionObserver | null = null
    const attach = () => {
      const hero = document.querySelector("[data-hero-search]")
      if (!hero) return false
      // Ignore the strip under the sticky header: "visible" means usable.
      io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
        rootMargin: "-64px 0px 0px 0px",
      })
      io.observe(hero)
      return true
    }
    let mo: MutationObserver | null = null
    if (!attach()) {
      mo = new MutationObserver(() => {
        if (attach()) mo?.disconnect()
      })
      mo.observe(document.body, { childList: true, subtree: true })
    }
    return () => {
      io?.disconnect()
      mo?.disconnect()
      setVisible(null)
    }
  }, [pathname])

  return visible
}
