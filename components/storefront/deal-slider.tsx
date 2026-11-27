"use client"

import { Children, useEffect, useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"

const AUTOPLAY_MS = 5000

/**
 * Cross-fading slides that fill their frame (the home deal card). Each child
 * is one slide; with one child it renders just that slide. Pauses on hover
 * and when the visitor prefers reduced motion.
 */
export function DealSlider({ children, label }: { children: ReactNode; label: string }) {
  const slides = Children.toArray(children)
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (slides.length < 2 || paused) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const timer = setInterval(() => setIndex((i) => (i + 1) % slides.length), AUTOPLAY_MS)
    return () => clearInterval(timer)
  }, [slides.length, paused])

  if (slides.length === 1) return <>{slides[0]}</>

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      className="absolute inset-0"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {slides.map((slide, i) => (
        <div
          key={i}
          aria-hidden={i !== index}
          inert={i !== index}
          className={cn(
            "absolute inset-0 transition-opacity duration-500 ease-out",
            i === index ? "opacity-100" : "pointer-events-none opacity-0",
          )}
        >
          {slide}
        </div>
      ))}
      <div className="absolute inset-x-0 bottom-2 z-10 flex justify-center gap-1.5">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Show offer ${i + 1} of ${slides.length}`}
            aria-current={i === index}
            onClick={() => setIndex(i)}
            className={cn(
              "h-1.5 rounded-full shadow-xs transition-all",
              i === index ? "w-5 bg-primary" : "w-1.5 bg-white/80 hover:bg-white",
            )}
          />
        ))}
      </div>
    </div>
  )
}
