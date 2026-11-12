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
        className="no-scrollbar relative flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto overscroll-x-contain px-4 pt-1 pb-3 focus-visible:outline-none"
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
