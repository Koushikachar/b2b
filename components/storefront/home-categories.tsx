import { getCachedHomeCategories } from "@/lib/storefront-cache"
import { SectionHeader } from "@/components/storefront/section-header"
import { CategoryTile } from "@/components/storefront/category-tiles"

const MAX_TILES = 8

const RAIL_CLASS =
  "-mx-4 no-scrollbar flex snap-x gap-2.5 overflow-x-auto scroll-pl-4 px-4 pb-1 md:mx-0 md:grid md:grid-cols-5 md:overflow-visible md:px-0 lg:grid-cols-8"

export async function TopCategoriesSection() {
  const categories = await getCachedHomeCategories()
  if (categories.length === 0) return null

  const visible = categories.slice(0, MAX_TILES)

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-5">
      <SectionHeader title="Top categories" />
      <div className={RAIL_CLASS}>
        {visible.map((category, index) => (
          <CategoryTile
            key={category.id}
            category={category}
            priority={index === 0}
            showCount={false}
            sizes="(min-width: 1024px) 12vw, (min-width: 768px) 18vw, 84px"
            className="w-[84px] md:w-auto"
          />
        ))}
      </div>
    </section>
  )
}
