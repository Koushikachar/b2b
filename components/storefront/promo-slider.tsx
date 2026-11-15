"use client"

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"

/**
 * Horizontal snap slider. Cards are server-rendered children; this island only
 * owns the scroll container and the desktop prev/next arrows, so the slider
 * ships almost no JS. Touch and trackpad use native scrolling.
 */
export function PromoSlider({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ start: true, end: false })

  const measure = useCallback(() => {
    const el = trackRef.current
    if (!el) return
    const start = el.scrollLeft <= 4
    const end = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4
    setEdges((prev) =>
      prev.start === start && prev.end === end ? prev : { start, end }
    )
  }, [])

  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    measure()
    el.addEventListener("scroll", measure, { passive: true })
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => {
      el.removeEventListener("scroll", measure)
      observer.disconnect()
    }
  }, [measure])

  // Mouse drag-to-scroll (touch and trackpads already scroll natively). Snap
  // is suspended while dragging so the track follows the cursor, and the click
  // that ends a drag is swallowed so it never opens a product by accident.
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null)
  const [dragging, setDragging] = useState(false)

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || e.button !== 0 || !trackRef.current) return
    drag.current = { x: e.clientX, left: trackRef.current.scrollLeft, moved: false }
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const state = drag.current
    const el = trackRef.current
    if (!state || !el) return
    const dx = e.clientX - state.x
    if (!state.moved) {
      if (Math.abs(dx) < 6) return
      state.moved = true
      setDragging(true)
      el.setPointerCapture(e.pointerId)
    }
    el.scrollLeft = state.left - dx
  }

  const endDrag = () => {
    if (!drag.current) return
    const moved = drag.current.moved
    drag.current = null
    if (!moved) return
    setDragging(false)
    // Re-snap to the nearest card once the drag ends.
    const el = trackRef.current
    const card = el?.querySelector<HTMLElement>("[data-slide]")
    if (el && card) {
      const step = card.offsetWidth + 16
      el.scrollTo({ left: Math.round(el.scrollLeft / step) * step, behavior: "smooth" })
    }
    const swallow = (event: MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
    }
    window.addEventListener("click", swallow, { capture: true, once: true })
    window.setTimeout(() => window.removeEventListener("click", swallow, { capture: true }), 0)
  }

  const scrollBy = (direction: 1 | -1) => {
    const el = trackRef.current
    if (!el) return
    const card = el.querySelector<HTMLElement>("[data-slide]")
    const step = card ? card.offsetWidth + 16 : el.clientWidth * 0.8
    el.scrollBy({ left: direction * step, behavior: "smooth" })
  }

  return (
    <div className="relative">
      <div
        ref={trackRef}
        role="region"
        aria-label={label}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDragStart={(e) => e.preventDefault()}
        className={cn(
          "no-scrollbar relative flex scroll-px-4 gap-4 overflow-x-auto overscroll-x-contain px-4 pt-1 pb-3 focus-visible:outline-none lg:cursor-grab",
          dragging ? "cursor-grabbing snap-none select-none" : "snap-x snap-mandatory"
        )}
      >
        {children}
      </div>

      {(["prev", "next"] as const).map((dir) => {
        const hidden = dir === "prev" ? edges.start : edges.end
        return (
          <button
            key={dir}
            type="button"
            aria-label={dir === "prev" ? "Previous" : "Next"}
            onClick={() => scrollBy(dir === "prev" ? -1 : 1)}
            className={cn(
              "absolute top-1/2 z-10 hidden size-10 -translate-y-1/2 items-center justify-center rounded-lg border border-border bg-card text-foreground shadow-md transition-opacity duration-(--motion-fast) hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none lg:flex",
              dir === "prev" ? "left-1" : "right-1",
              hidden && "pointer-events-none opacity-0"
            )}
          >
            <HugeiconsIcon
              icon={dir === "prev" ? ArrowLeft01Icon : ArrowRight01Icon}
              strokeWidth={2.2}
              className="size-5"
            />
          </button>
        )
      })}
    </div>
  )
}
