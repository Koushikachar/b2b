import Image from "next/image"
import { HugeiconsIcon } from "@hugeicons/react"
import { UserIcon } from "@hugeicons/core-free-icons"
import { publicTransformedImageUrl } from "@/lib/storage"
import { cn } from "@/lib/utils"

/** Circular buyer avatar (semantic circle — allowed by DESIGN.md). */
export function AccountAvatar({
  path,
  name,
  className,
  priority = false,
}: {
  path: string | null
  name: string
  className?: string
  priority?: boolean
}) {
  return (
    <span
      className={cn(
        "relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-muted-foreground",
        className
      )}
    >
      {path ? (
        <Image
          src={publicTransformedImageUrl("avatars", path, { width: 192, height: 192 })}
          alt={`${name}'s profile photo`}
          fill
          sizes="96px"
          priority={priority}
          className="object-cover"
        />
      ) : (
        <HugeiconsIcon icon={UserIcon} strokeWidth={1.6} className="size-1/2" aria-hidden />
      )}
    </span>
  )
}
