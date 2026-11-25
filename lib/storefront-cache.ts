import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createClient as createAnonClient } from "@supabase/supabase-js";
import {
  attachListingExtras,
  getCatalogueCategories,
  getCataloguePage,
  getCategoryBySlug,
  getCategoryProductCount,
  getFeaturedSuppliers,
  getHomeBanners,
  getHomeCategories,
  getHomeProducts,
  getHotSellingProducts,
  getMegaMenuCategories,
  getNavigationCategories,
  getProduct,
  getProducts,
  getRecommendedProducts,
  getWinningProducts,
  getRelatedProducts,
  getSourceRegions,
  type ProductListParams,
} from "./storefront";
import {
  catalogueFiltersKey,
  type CatalogueFilters,
} from "./catalogue";
import { PRICE_LIMITS, priceBand, type PriceLimit, type PromoEvent } from "./promotions";

/**
 * Cookie-less public client for cached catalog reads. `lib/supabase/server.ts`
 * uses `cookies()` which opts every caller out of the Data Cache, so cached
 * wrappers build their own anon client internally. RLS still applies.
 */
function makePublicClient() {
  return createAnonClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

type AnyClient = Parameters<typeof getNavigationCategories>[0];

function normalizeProductParams(params: ProductListParams): ProductListParams {
  return {
    query: params.query?.trim() || undefined,
    categorySlug: params.categorySlug?.trim().toLowerCase() || undefined,
    sort: params.sort ?? "relevance",
    minPrice: params.minPrice,
    maxPrice: params.maxPrice,
    minMoq: params.minMoq,
    maxMoq: params.maxMoq,
    negotiable: params.negotiable,
    sampleAvailable: params.sampleAvailable,
    page: params.page ?? 1,
    perPage: params.perPage ?? 24,
    // imageProductIds intentionally excluded from the stable key helper below —
    // callers bypass the cache when it is present (unique per upload).
    imageProductIds: params.imageProductIds,
    storeId: params.storeId,
  };
}

function stableParamsKey(params: ProductListParams): string {
  const n = normalizeProductParams(params);
  const { imageProductIds: _omit, ...rest } = n;
  void _omit;
  return JSON.stringify(rest);
}

export const getCachedNavigationCategories = cache(
  unstable_cache(
    async () => getNavigationCategories(makePublicClient() as unknown as AnyClient),
    ["nav-categories"],
    { revalidate: 3600, tags: ["categories", "nav"] },
  ),
);

export type ActiveCategory = { id: string; name: string; slug: string };

/**
 * Active categories in display order, for category pickers and the bulk
 * importers (which ran this query per page / per 10-product batch). Shared
 * across users; refreshed when an admin edits a category (lib/admin/
 * categories.ts revalidates "categories"), else hourly.
 */
export const getCachedActiveCategories = cache(
  unstable_cache(
    async (): Promise<ActiveCategory[]> => {
      const { data, error } = await makePublicClient()
        .from("categories")
        .select("id, name, slug")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw new Error(`Active categories query failed: ${error.message}`);
      return (data ?? []) as ActiveCategory[];
    },
    ["active-categories"],
    { revalidate: 3600, tags: ["categories"] },
  ),
);

export const getCachedHomeCategories = unstable_cache(
  async () => getHomeCategories(makePublicClient() as unknown as AnyClient),
  ["home-categories"],
  { revalidate: 600, tags: ["categories", "home", "products"] },
);

export const getCachedMegaMenuCategories = cache(
  unstable_cache(
    async () => getMegaMenuCategories(makePublicClient() as unknown as AnyClient),
    ["mega-menu-categories"],
    { revalidate: 600, tags: ["categories", "home", "products"] },
  ),
);

/** Newest listings of one store (null = all stores); the arg is part of the key. */
export const getCachedHomeProducts = unstable_cache(
  async (storeId: string | null = null) =>
    getHomeProducts(makePublicClient() as unknown as AnyClient, storeId),
  ["home-products"],
  { revalidate: 120, tags: ["products", "prices", "home"] },
);

export async function getCachedWinningProducts(storeId?: string | null) {
  const client = makePublicClient() as unknown as AnyClient;
  const key = storeId ? `select-winning-products:${storeId}` : "select-winning-products";
  return unstable_cache(
    async () => getWinningProducts(client, 4, storeId),
    [key],
    { revalidate: 120, tags: ["products", "prices", "home"] },
  )();
}

export async function getCachedHotSellingProducts(storeId?: string | null) {
  const client = makePublicClient() as unknown as AnyClient;
  const key = storeId ? `select-hot-selling-products:${storeId}` : "select-hot-selling-products";
  return unstable_cache(
    async () => getHotSellingProducts(client, 4, storeId),
    [key],
    { revalidate: 120, tags: ["products", "prices", "home"] },
  )();
}

/**
 * Recommended products are derived from a buyer's interest categories, then
 * cached by the category set itself (not by user), so many buyers share the
 * same cached slice. Guests fall through to the newest products.
 */
export async function getCachedRecommendedProducts(
  categoryIds: string[],
  storeId: string | null = null,
  limit = 8,
) {
  const normalized = [...new Set(categoryIds)].sort()
  const key = normalized.join(",") || "all"
  return unstable_cache(
    async () =>
      getRecommendedProducts(
        makePublicClient() as unknown as AnyClient,
        normalized,
        limit,
        storeId,
      ),
    ["recommended", key, storeId ?? "all-stores", String(limit)],
    { revalidate: 120, tags: ["products", "prices", "home"] },
  )()
}

export const getCachedHomeBanners = unstable_cache(
  async () => getHomeBanners(makePublicClient() as unknown as AnyClient),
  ["home-banners"],
  { revalidate: 300, tags: ["banners", "home"] },
);

export const getCachedSourceRegions = unstable_cache(
  async () => getSourceRegions(makePublicClient() as unknown as AnyClient),
  ["source-regions"],
  { revalidate: 3600, tags: ["suppliers", "home"] },
);

export const getCachedFeaturedSuppliers = unstable_cache(
  async () => getFeaturedSuppliers(makePublicClient() as unknown as AnyClient),
  ["featured-suppliers"],
  { revalidate: 600, tags: ["suppliers", "home"] },
);

export const getCachedProduct = cache(
  unstable_cache(
    async (productId: string) =>
      getProduct(makePublicClient() as unknown as AnyClient, productId),
    ["product"],
    { revalidate: 180, tags: ["products"] },
  ),
);

export const getCachedRelatedProducts = unstable_cache(
  async (categoryId: string, excludeId: string) =>
    getRelatedProducts(makePublicClient() as unknown as AnyClient, categoryId, excludeId),
  ["related"],
  { revalidate: 120, tags: ["products"] },
);

export const getCachedCatalogueCategories = unstable_cache(
  async () => getCatalogueCategories(makePublicClient() as unknown as AnyClient),
  ["catalogue-categories"],
  { revalidate: 600, tags: ["categories", "products", "catalogue"] },
);

/**
 * First page of the shared catalogue. Deeper pages are loaded by a server
 * action (never cached), and image-search candidate sets are unique per upload,
 * so they bypass the cache entirely.
 */
export async function getCachedCataloguePage(
  filters: CatalogueFilters,
  storeId?: string | null,
) {
  if (filters.imageToken) {
    return getCataloguePage(
      makePublicClient() as unknown as AnyClient,
      filters,
      null,
      storeId,
    );
  }

  const key = catalogueFiltersKey(filters) + (storeId ? `:store:${storeId}` : "");
  const tags = ["products", "prices", "catalogue"];
  if (filters.categorySlug) tags.push(`category:${filters.categorySlug}`);
  if (storeId) tags.push(`store:${storeId}`);

  return unstable_cache(
    async () =>
      getCataloguePage(makePublicClient() as unknown as AnyClient, filters, null, storeId),
    ["catalogue", key],
    { revalidate: 60, tags },
  )();
}

export const getCachedCategoryBySlug = cache(
  unstable_cache(
    async (slug: string) =>
      getCategoryBySlug(makePublicClient() as unknown as AnyClient, slug.toLowerCase()),
    ["category"],
    { revalidate: 600, tags: ["categories"] },
  ),
);

export const getCachedCategoryProductCount = cache(
  unstable_cache(
    async (categoryId: string) =>
      getCategoryProductCount(makePublicClient() as unknown as AnyClient, categoryId),
    ["category-count"],
    { revalidate: 300, tags: ["categories", "products"] },
  ),
);

async function getProductsUncached(params: ProductListParams) {
  return getProducts(makePublicClient() as unknown as AnyClient, normalizeProductParams(params));
}

/**
 * Cached product listing. Image-search candidate pools (`imageProductIds`) are
 * unique per upload so they bypass the cache to avoid an unbounded key space.
 * Deep pages (>7, beyond the rendered pagination window) also bypass.
 */
export async function getCachedProducts(params: ProductListParams) {
  const normalized = normalizeProductParams(params);
  if (normalized.imageProductIds?.length) {
    return getProductsUncached(normalized);
  }
  if ((normalized.page ?? 1) > 7) {
    return getProductsUncached(normalized);
  }
  const key = stableParamsKey(normalized);
  const tags = ["products", "prices"];
  if (normalized.categorySlug) tags.push(`category:${normalized.categorySlug}`);
  const cached = unstable_cache(
    async () => getProductsUncached(normalized),
    ["products", key],
    { revalidate: 60, tags },
  );
  return cached();
}

// ---------------------------------------------------------------------------
// D2H Select promotional sliders + festival events
// ---------------------------------------------------------------------------

const PROMO_ROW_LIMIT = 4;

/** A store's id by slug, cached (stores rarely change). */
export const getCachedStoreId = unstable_cache(
  async (slug: string): Promise<string | null> => {
    const { data: store } = await makePublicClient()
      .from("stores")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    return (store?.id as string | undefined) ?? null;
  },
  ["store-id-by-slug"],
  { revalidate: 3600, tags: ["stores"] },
);

/**
 * D2H Select's store id: deals (Under ₹X, Winning, Hot selling) only ever
 * show Select products. D2H Core and Select are separate stores, so there is
 * no fallback to other stores' products.
 */
export function getCachedDealsStoreId(): Promise<string | null> {
  return getCachedStoreId("d2h-select");
}

/**
 * Everything the Select slider row needs in one cached call: winning,
 * hot-selling and the four "Under ₹X" buckets. All six reads run in parallel
 * and share one cache entry, so the slider costs a single cache lookup.
 */
export const getCachedPromoCollections = unstable_cache(
  async (storeId: string | null = null) => {
    const client = makePublicClient() as unknown as AnyClient;
    const [rawWinning, rawHotSelling, ...rawUnder] = await Promise.all([
      getWinningProducts(client, PROMO_ROW_LIMIT, storeId),
      getHotSellingProducts(client, PROMO_ROW_LIMIT, storeId),
      ...PRICE_LIMITS.map(async (limit) => {
        const list = (band: { minPrice?: number; maxPrice: number }) =>
          getProducts(client, normalizeProductParams({
            ...band,
            perPage: PROMO_ROW_LIMIT,
            sort: "newest",
            storeId: storeId ?? undefined,
          })).then((page) => page.products);
        // Own band first (Under ₹29 = above ₹9); whole "≤ X" range only if empty.
        const band = priceBand(limit);
        const inBand = await list(band);
        return inBand.length > 0 || band.minPrice == null ? inBand : list({ maxPrice: limit });
      }),
    ]);
    // One extra read for MRP + stock across all six rows, then split back.
    const sizes = [rawWinning.length, rawHotSelling.length, ...rawUnder.map((row) => row.length)];
    const extras = await attachListingExtras(client, [rawWinning, rawHotSelling, ...rawUnder].flat());
    const rows: (typeof extras)[] = [];
    let offset = 0;
    for (const size of sizes) {
      rows.push(extras.slice(offset, offset + size));
      offset += size;
    }
    const [winning, hotSelling, ...under] = rows;
    return {
      winning,
      hotSelling,
      under: Object.fromEntries(
        PRICE_LIMITS.map((limit, index) => [limit, under[index] ?? []]),
      ) as Record<PriceLimit, (typeof under)[number]>,
    };
  },
  ["select-promo-collections-v2"],
  { revalidate: 120, tags: ["products", "prices", "home"] },
);

type PromoEventRow = {
  key: string;
  theme: PromoEvent["theme"];
  title: string;
  starts_at: string;
  ends_at: string;
  max_reward: number;
};

/** Events that have not ended yet; callers check the live window at render. */
export const getCachedPromoEvents = unstable_cache(
  async (): Promise<PromoEvent[]> => {
    const { data, error } = await makePublicClient()
      .from("promo_events")
      .select("key, theme, title, starts_at, ends_at, max_reward")
      .gte("ends_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(5);
    if (error) {
      console.error("getCachedPromoEvents failed:", error.code, error.message);
      return [];
    }
    return ((data ?? []) as PromoEventRow[]).map((row) => ({
      key: row.key,
      theme: row.theme,
      title: row.title,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      maxReward: Number(row.max_reward),
    }));
  },
  ["promo-events"],
  { revalidate: 300, tags: ["promo-events"] },
);

// ---------------------------------------------------------------------------
// Supplier directory (/suppliers)
// ---------------------------------------------------------------------------

export type DirectorySupplier = {
  id: string;
  business_name: string;
  city: string | null;
  state: string | null;
  logo_path: string | null;
  created_at: string;
  /** null when the directory view is not migrated yet (count unknown). */
  product_count: number | null;
  category_names: string[];
};

/**
 * Every verified supplier with live product counts, in one cached read.
 * Search / state filter / sort run in memory on this list (a few hundred rows),
 * so changing filters never costs another database round trip.
 */
export const getCachedSupplierDirectory = unstable_cache(
  async (): Promise<DirectorySupplier[]> => {
    const client = makePublicClient();
    const { data, error } = await client
      .from("storefront_supplier_directory")
      .select("id, business_name, city, state, logo_path, created_at, product_count, category_names")
      .limit(1000);

    if (!error) {
      return ((data ?? []) as DirectorySupplier[]).map((row) => ({
        ...row,
        product_count: Number(row.product_count ?? 0),
        category_names: row.category_names ?? [],
      }));
    }

    // Directory view not migrated yet: fall back to the base supplier view.
    console.error("getCachedSupplierDirectory failed:", error.code, error.message);
    const fallback = await client
      .from("storefront_suppliers")
      .select("id, business_name, city, state, logo_path, created_at")
      .limit(1000);
    return ((fallback.data ?? []) as Omit<DirectorySupplier, "product_count" | "category_names">[]).map(
      (row) => ({ ...row, product_count: null, category_names: [] }),
    );
  },
  ["supplier-directory"],
  { revalidate: 600, tags: ["suppliers", "products"] },
);
