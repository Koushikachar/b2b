import {
  parseCatalogueFilters,
  type CatalogueSearchParams,
} from "@/lib/catalogue"
import {
  getCachedCatalogueCategories,
  getCachedCataloguePage,
} from "@/lib/storefront-cache"
import { Catalogue } from "@/components/storefront/catalogue"

export async function CatalogueSection({
  searchParams,
  basePath,
  title = "All products",
  description,
  headingLevel = "h2",
  storeId,
  showCategoryRail = false,
  priceExitPath,
}: {
  searchParams: CatalogueSearchParams
  basePath: string
  title?: string
  description?: string
  headingLevel?: "h1" | "h2"
  storeId?: string | null
  /** "Top categories" tiles (with item counts) under the filter row. */
  showCategoryRail?: boolean
  /** Price-range pages: removing the range leaves for this path. */
  priceExitPath?: string
}) {
  const filters = parseCatalogueFilters(searchParams)
  const [categoryData, initialPage] = await Promise.all([
    getCachedCatalogueCategories(),
    getCachedCataloguePage(filters, storeId),
  ])

  return (
    <Catalogue
      categoryData={categoryData}
      filters={filters}
      initialPage={initialPage}
      basePath={basePath}
      title={filters.imageToken ? "Products similar to your photo" : title}
      description={
        filters.imageToken
          ? "Showing products visually similar to your uploaded image."
          : description
      }
      headingLevel={headingLevel}
      showCategoryRail={showCategoryRail && !filters.imageToken}
      priceExitPath={priceExitPath}
    />
  )
}
