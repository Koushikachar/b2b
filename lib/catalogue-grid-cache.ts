import type { CatalogueFilters } from "@/lib/catalogue"

/**
 * What the infinite product grid had loaded, kept in memory so going back from
 * a product page shows the same list at the same scroll position instead of
 * starting again from page 1. Module memory, so a full page reload (or a new
 * tab) always starts fresh.
 */
export type GridSnapshot<T extends { id: string }> = {
  items: T[]
  cursor: string | null
  complete: boolean
  scrollY: number
}

const MAX_LISTS = 10
// After this, prices/photos may have changed (e.g. a supplier re-uploaded
// images and the old files were deleted), so the list loads fresh.
const MAX_AGE_MS = 5 * 60_000
const snapshots = new Map<string, GridSnapshot<{ id: string }> & { savedAt: number }>()

const keyOf = (filters: CatalogueFilters) => JSON.stringify(filters)

export function saveGrid<T extends { id: string }>(filters: CatalogueFilters, snapshot: GridSnapshot<T>) {
  const key = keyOf(filters)
  snapshots.delete(key) // re-insert so it counts as most recent
  snapshots.set(key, { ...snapshot, savedAt: Date.now() })
  if (snapshots.size > MAX_LISTS) snapshots.delete(snapshots.keys().next().value as string)
}

/** The saved list, or null when none exists, it is too old, or the catalogue's first product changed. */
export function restoreGrid<T extends { id: string }>(
  filters: CatalogueFilters,
  firstItemId: string | undefined,
  now: number = Date.now(),
): GridSnapshot<T> | null {
  const snapshot = snapshots.get(keyOf(filters))
  if (!snapshot || snapshot.items[0]?.id !== firstItemId || now - snapshot.savedAt > MAX_AGE_MS) return null
  const { items, cursor, complete, scrollY } = snapshot
  return { items: items as T[], cursor, complete, scrollY }
}

export function clearGridSnapshots() {
  snapshots.clear()
}
