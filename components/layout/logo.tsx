"use client"

import Link from "next/link"
import Image from "next/image"

/**
 * Brand logo mark, wrapped in a home link. public/logo.png is the
 * transparent mark (no white square), so it sits cleanly on any header colour.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className="flex shrink-0 items-center" aria-label="Direct2Hub home">
      <Image
        src="/logo.png"
        alt="Direct2Hub"
        width={40}
        height={40}
        className={className ?? "size-8"}
      />
    </Link>
  )
}
