"use client"

import { useId, useRef, useState, useTransition, type PointerEvent as ReactPointerEvent } from "react"
import Image from "next/image"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowDown01Icon, ArrowUp01Icon, DragDropVerticalIcon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import { cn } from "@/lib/utils"
import type { ArrangeResult } from "@/lib/supplier/arrange-actions"

export type ArrangeItem = { id: string; label: string; imageUrl?: string | null }

/**
 * Reorder, then Save; the first item shows first on the home page.
 * - Drag: press and hold the grip (⋮⋮) and move up/down. Pointer events, so
 *   mouse, pen and touch all work (same pattern as the product photo gallery).
 *   With a mouse the whole row can be grabbed.
 * - ↑ / ↓ buttons for precise moves and keyboard use.
 */
export function ArrangeList({
  title,
  description,
  items: initial,
  emptyText,
  save,
}: {
  title: string
  description: string
  items: ArrangeItem[]
  emptyText: string
  save: (ids: string[]) => Promise<ArrangeResult>
}) {
  const [items, setItems] = useState(initial)
  const [dirty, setDirty] = useState(false)
  const [pending, startTransition] = useTransition()
  const [dragId, setDragId] = useState<string | null>(null)
  const dragStart = useRef<{ y: number; moved: boolean } | null>(null)
  // Scopes drop targets to this list (a page has several).
  const listId = useId()

  const moveTo = (id: string, toIndex: number) => {
    setItems((current) => {
      const from = current.findIndex((item) => item.id === id)
      if (from < 0 || from === toIndex) return current
      const next = [...current]
      const [moved] = next.splice(from, 1)
      next.splice(Math.max(0, Math.min(toIndex, next.length)), 0, moved)
      return next
    })
    setDirty(true)
  }

  const onPointerDown = (e: ReactPointerEvent<HTMLLIElement>, id: string) => {
    const onGrip = (e.target as HTMLElement).closest("[data-grip]")
    const onButton = (e.target as HTMLElement).closest("button")
    // Touch/pen: only the grip starts a drag (the rest of the row still scrolls the page).
    if (onButton || (e.pointerType !== "mouse" && !onGrip)) return
    if (e.pointerType === "mouse" && e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragStart.current = { y: e.clientY, moved: false }
    setDragId(id)
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLLIElement>) => {
    const start = dragStart.current
    if (!dragId || !start) return
    if (!start.moved && Math.abs(e.clientY - start.y) < 6) return
    start.moved = true
    const over = document
      .elementFromPoint(e.clientX, e.clientY)
      ?.closest<HTMLElement>(`[data-list="${listId}"] [data-item-id]`)?.dataset.itemId
    if (!over || over === dragId) return
    moveTo(dragId, items.findIndex((item) => item.id === over))
  }

  const endDrag = () => {
    dragStart.current = null
    setDragId(null)
  }

  const onSave = () =>
    startTransition(async () => {
      const result = await save(items.map((item) => item.id))
      toast.add({ type: result.ok ? "success" : "error", title: result.message })
      if (result.ok) setDirty(false)
    })

  return (
    <section className="rounded-lg border border-border bg-card">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-4">
        <div className="min-w-0">
          <h2 className="text-base font-bold tracking-tight">{title}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
        <Button size="sm" onClick={onSave} disabled={!dirty || pending}>
          {pending ? <Spinner className="size-4" /> : null}
          {dirty ? "Save order" : "Saved"}
        </Button>
      </div>
      {items.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <ol data-list={listId} className="divide-y divide-border">
          {items.map((item, index) => (
            <li
              key={item.id}
              data-item-id={item.id}
              onPointerDown={(e) => onPointerDown(e, item.id)}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              className={cn(
                "flex items-center gap-2 px-2 py-2 select-none sm:gap-3 sm:px-4 [@media(pointer:fine)]:cursor-grab",
                dragId === item.id && "relative z-10 bg-brand-50 shadow-md ring-1 ring-primary/40 [@media(pointer:fine)]:cursor-grabbing",
              )}
            >
              <span
                data-grip
                aria-hidden
                className="flex size-9 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground hover:bg-muted active:cursor-grabbing"
              >
                <HugeiconsIcon icon={DragDropVerticalIcon} strokeWidth={2} className="size-5" />
              </span>
              <span className="w-5 shrink-0 text-right text-sm font-bold text-muted-foreground tabular-nums">{index + 1}</span>
              {item.imageUrl !== undefined ? (
                <span className="relative size-10 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
                  {item.imageUrl ? (
                    <Image src={item.imageUrl} alt="" fill sizes="40px" draggable={false} className="object-cover" />
                  ) : null}
                </span>
              ) : null}
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.label}</span>
              <span className="flex shrink-0 gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="size-9"
                  aria-label={`Move ${item.label} up`}
                  disabled={index === 0 || pending}
                  onClick={() => moveTo(item.id, index - 1)}
                >
                  <HugeiconsIcon icon={ArrowUp01Icon} strokeWidth={2} />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-9"
                  aria-label={`Move ${item.label} down`}
                  disabled={index === items.length - 1 || pending}
                  onClick={() => moveTo(item.id, index + 1)}
                >
                  <HugeiconsIcon icon={ArrowDown01Icon} strokeWidth={2} />
                </Button>
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
