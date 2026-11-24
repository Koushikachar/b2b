import { beforeEach, describe, expect, it } from "vitest"
import type { CatalogueFilters } from "@/lib/catalogue"
import { clearGridSnapshots, restoreGrid, saveGrid } from "@/lib/catalogue-grid-cache"

const homeFilters: CatalogueFilters = { query: "", categorySlug: "", sort: "relevance" as CatalogueFilters["sort"] }
const kitchenFilters: CatalogueFilters = { ...homeFilters, categorySlug: "kitchen-dining" }
const items = (...ids: string[]) => ids.map((id) => ({ id }))

describe("catalogue grid snapshot (keeps the list when coming back from a product)", () => {
  beforeEach(() => clearGridSnapshots())

  it("has nothing to restore on a first visit", () => {
    expect(restoreGrid(homeFilters, "a")).toBeNull()
  })

  it("restores the loaded pages, cursor and scroll position for the same list", () => {
    saveGrid(homeFilters, { items: items("a", "b", "c"), cursor: "page-3", complete: false, scrollY: 1840 })

    expect(restoreGrid(homeFilters, "a")).toEqual({
      items: items("a", "b", "c"),
      cursor: "page-3",
      complete: false,
      scrollY: 1840,
    })
  })

  it("does not restore one list's products into a different list", () => {
    saveGrid(homeFilters, { items: items("a", "b"), cursor: null, complete: true, scrollY: 0 })

    expect(restoreGrid(kitchenFilters, "a")).toBeNull()
  })

  it("starts fresh when the first product changed (catalogue was updated)", () => {
    saveGrid(homeFilters, { items: items("a", "b"), cursor: "page-2", complete: false, scrollY: 900 })

    expect(restoreGrid(homeFilters, "z")).toBeNull()
  })

  it("keeps only the most recent lists", () => {
    for (let i = 0; i < 12; i++) {
      saveGrid({ ...homeFilters, query: `q${i}` }, { items: items("a"), cursor: null, complete: true, scrollY: i })
    }

    expect(restoreGrid({ ...homeFilters, query: "q0" }, "a")).toBeNull()
    expect(restoreGrid({ ...homeFilters, query: "q11" }, "a")?.scrollY).toBe(11)
  })
})
