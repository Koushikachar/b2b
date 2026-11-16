/**
 * Cache tags of every storefront read that lists products (listings, prices,
 * category counts, home rows). Product mutations expire all of them.
 */
export const CATALOGUE_TAGS = ["products", "prices", "categories", "catalogue", "home"] as const;
