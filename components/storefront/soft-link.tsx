"use client"

import { useTransition, type ComponentProps, type MouseEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

/**
 * Link for in-page filter changes (category, chips). A plain click navigates
 * inside a transition without scrolling, so the current page stays on screen
 * while the new results load instead of the route's loading skeleton
 * replacing the whole page. Modified clicks (new tab, etc.) behave normally.
 */
export function SoftLink({
  href,
  onClick,
  scrollToId,
  ...props
}: Omit<ComponentProps<typeof Link>, "href"> & {
  href: string
  /** Smoothly bring this element into view (e.g. the results list). */
  scrollToId?: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    onClick?.(e)
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
      return
    }
    e.preventDefault()
    if (scrollToId) document.getElementById(scrollToId)?.scrollIntoView({ behavior: "smooth", block: "start" })
    startTransition(() => router.push(href, { scroll: false }))
  }

  return (
    <Link
      href={href}
      scroll={false}
      onClick={handleClick}
      data-pending={pending ? "" : undefined}
      aria-busy={pending || undefined}
      {...props}
    />
  )
}
