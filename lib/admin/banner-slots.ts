/** Prices with a homepage "Under ₹X" tile; each tile has its own image slot. */
export const UNDER_TILE_PRICES = [9, 49, 99, 199] as const;
export type UnderTilePrice = (typeof UNDER_TILE_PRICES)[number];

export const BANNER_SLOTS = [
  "hero",
  "promo",
  "deal",
  "under_9",
  "under_49",
  "under_99",
  "under_199",
  "popup_desktop",
  "popup_mobile",
] as const;
export type BannerSlot = (typeof BANNER_SLOTS)[number];

export function underSlot(price: UnderTilePrice): BannerSlot {
  return `under_${price}`;
}

export const SLOT_LABELS: Record<BannerSlot, string> = {
  hero: "Hero carousel",
  promo: "Promotional strip",
  deal: "Home deal card (beside Under ₹ tiles)",
  under_9: "Under ₹9 tile",
  under_49: "Under ₹49 tile",
  under_99: "Under ₹99 tile",
  under_199: "Under ₹199 tile",
  popup_desktop: "Offer popup (desktop)",
  popup_mobile: "Offer popup (mobile)",
};

/** Where each slot shows, for the admin page. */
export const SLOT_PLACEMENT: Record<BannerSlot, string> = {
  hero: "Rotates at the top of the home page",
  promo: "Single strip under the category grid",
  deal: "Wide card: full width above the Under ₹ tiles on phones, beside them on desktop; replaces the festival artwork while active. One wide image (about 12:5) covers it on every device",
  under_9: "Under ₹9 tile: square on phones, wide on desktop. One image for every device",
  under_49: "Under ₹49 tile: square on phones, wide on desktop. One image for every device",
  under_99: "Under ₹99 tile: square on phones, wide on desktop. One image for every device",
  under_199: "Under ₹199 tile: square on phones, wide on desktop. One image for every device",
  popup_desktop:
    "Pops up 3s after anyone opens the home page, on tablets and desktops. Also used on phones if no mobile popup is uploaded",
  popup_mobile:
    "Same popup on phones. Also used on desktop if no desktop popup is uploaded",
};

// Desktop tile shape (16:5); on phones tiles are square. Uploads cover the tile either way.
const UNDER_TILE_ASPECT = 16 / 5;

export const SLOT_ASPECTS: Record<BannerSlot, number> = {
  hero: 12 / 5,
  promo: 1248 / 128,
  // Wide card on every device (12:5 on phones, ≈ 2.3:1 beside the tiles on desktop).
  deal: 12 / 5,
  under_9: UNDER_TILE_ASPECT,
  under_49: UNDER_TILE_ASPECT,
  under_99: UNDER_TILE_ASPECT,
  under_199: UNDER_TILE_ASPECT,
  popup_desktop: 2 / 1,
  popup_mobile: 9 / 16,
};
