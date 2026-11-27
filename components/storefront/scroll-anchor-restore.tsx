"use client"

import { useEffect, useRef } from "react"
import { usePathname, useSearchParams } from "next/navigation"

const KEY = "d2h:scroll-anchor"
const CONTAINER = "[id], section[aria-label]"

type Anchor = { path: string; href: string; container: string; index: number; top: number }

/**
 * Back from a product returns to the card you tapped, not just the old scroll
 * number: sections above it can change while you were away (e.g. "Recently
 * viewed" appears on the home page), which made the page land on a different
 * product. On tap we remember the card (its section + position in it) and its
 * place on screen; on Back we scroll that card to the same place, re-checking
 * briefly while streamed sections arrive, and stop once the user scrolls.
 */
export function ScrollAnchorRestore() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const cameBack = useRef(false)
  const current = `${pathname}?${searchParams.toString()}`

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.('a[href^="/products/"]')
      if (!link) return
      const href = link.getAttribute("href")!
      const box = link.closest(CONTAINER)
      const container = box ? box.id || box.getAttribute("aria-label") || "" : ""
      const scope = box ?? document
      const index = [...scope.querySelectorAll(`a[href="${href}"]`)].indexOf(link)
      const anchor: Anchor = {
        path: `${window.location.pathname}?${new URLSearchParams(window.location.search).toString()}`,
        href,
        container,
        index,
        top: link.getBoundingClientRect().top,
      }
      try {
        sessionStorage.setItem(KEY, JSON.stringify(anchor))
      } catch {
        // Storage blocked: Back falls back to the browser's own restore.
      }
    }
    const onPop = () => {
      cameBack.current = true
    }
    document.addEventListener("click", onClick, true)
    window.addEventListener("popstate", onPop)
    return () => {
      document.removeEventListener("click", onClick, true)
      window.removeEventListener("popstate", onPop)
    }
  }, [])

  useEffect(() => {
    if (!cameBack.current) return
    cameBack.current = false
    let anchor: Anchor | null = null
    try {
      anchor = JSON.parse(sessionStorage.getItem(KEY) ?? "null")
    } catch {}
    if (!anchor || anchor.path !== current) return

    let stopped = false
    const stop = () => {
      stopped = true
    }
    window.addEventListener("wheel", stop, { once: true, passive: true })
    window.addEventListener("touchstart", stop, { once: true, passive: true })
    window.addEventListener("keydown", stop, { once: true })

    let tries = 0
    const find = () => {
      const a = anchor!
      const box = a.container
        ? [...document.querySelectorAll(CONTAINER)].find((el) => (el.id || el.getAttribute("aria-label")) === a.container)
        : document
      const links = box ? [...box.querySelectorAll(`a[href="${a.href}"]`)] : []
      return links[a.index] ?? links[0] ?? null
    }
    const settle = () => {
      if (stopped) return
      const link = find()
      if (link) {
        const delta = link.getBoundingClientRect().top - anchor!.top
        if (Math.abs(delta) > 2) window.scrollBy(0, delta)
      }
      // Streamed sections can still shift the page for a moment.
      if (++tries < 15) window.setTimeout(settle, 120)
    }
    requestAnimationFrame(settle)
    return () => {
      stopped = true
      window.removeEventListener("wheel", stop)
      window.removeEventListener("touchstart", stop)
      window.removeEventListener("keydown", stop)
    }
  }, [current])

  return null
}
