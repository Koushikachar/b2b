import { getCachedMegaMenuCategories } from "@/lib/storefront-cache";
import { TRENDING_SEARCHES } from "@/lib/search-suggest";
import { SearchMegaMenu } from "./search-mega-menu";

/**
 * Homepage hero: the search mega menu fed with live catalog categories.
 * Streams in via Suspense on the homepage; renders nothing when no
 * categories exist yet.
 */
export async function SearchMegaMenuSection() {
  const categories = await getCachedMegaMenuCategories();
  if (categories.length === 0) return null;
  return (
    // data-hero-search: the header and phone search bars hide while this is on screen.
    <div data-hero-search>
      <SearchMegaMenu
        categories={categories}
        trending={TRENDING_SEARCHES}
        showCategoryChips={false}
        showCategoryList={false}
      />
    </div>
  );
}
