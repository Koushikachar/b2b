"use client"

import { useEffect, useState } from "react"

/**
 * Cart badge updates without re-rendering the page: an add-to-cart button
 * announces the new count and every badge listening picks it up.
 */
const EVENT = "d2h:cart-count"

export function announceCartCount(count: number | undefined) {
  if (typeof count !== "number") return
  window.dispatchEvent(new CustomEvent<number>(EVENT, { detail: count }))
}

/** The server's count, kept current by announcements between page loads. */
export function useLiveCartCount(serverCount: number): number {
  const [count, setCount] = useState(serverCount)
  // A fresh server count (navigation/refresh) always wins.
  const [seen, setSeen] = useState(serverCount)
  if (seen !== serverCount) {
    setSeen(serverCount)
    setCount(serverCount)
  }
  useEffect(() => {
    const onCount = (event: Event) => setCount((event as CustomEvent<number>).detail)
    window.addEventListener(EVENT, onCount)
    return () => window.removeEventListener(EVENT, onCount)
  }, [])
  return count
}
