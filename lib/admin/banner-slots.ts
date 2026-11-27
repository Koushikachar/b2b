/** Prices with a homepage "Under ₹X" tile; each tile has its own image slot. */
export const UNDER_TILE_PRICES = [9, 49, 99, 199] as const;
export type UnderTilePrice = (typeof UNDER_TILE_PRICES)[number];

export const BANNER_SLOTS = [
  "hero",
  "promo",
  "deal",
  "deal_mobile",
  "under_9",
  "under_9_mobile",
  "under_49",
  "under_49_mobile",
  "under_99",
  "under_99_mobile",
  "under_199",
  "under_199_mobile",
  "popup_desktop",
  "popup_mobile",
] as const;
export type BannerSlot = (typeof BANNER_SLOTS)[number];

export function underSlot(price: UnderTilePrice): BannerSlot {
  return `under_${price}`;
}

/** Phone-only image slot for a tile (falls back to the desktop one). */
export function underMobileSlot(price: UnderTilePrice): BannerSlot {
  return `under_${price}_mobile`;
}

export const SLOT_LABELS: Record<BannerSlot, string> = {
  hero: "Hero carousel",
  promo: "Promotional strip",
  deal: "Home deal card (desktop)",
  deal_mobile: "Home deal card (mobile)",
  under_9: "Under ₹9 tile (desktop)",
  under_9_mobile: "Under ₹9 tile (mobile)",
  under_49: "Under ₹49 tile (desktop)",
  under_49_mobile: "Under ₹49 tile (mobile)",
  under_99: "Under ₹99 tile (desktop)",
  under_99_mobile: "Under ₹99 tile (mobile)",
  under_199: "Under ₹199 tile (desktop)",
  under_199_mobile: "Under ₹199 tile (mobile)",
  popup_desktop: "Offer popup (desktop)",
  popup_mobile: "Offer popup (mobile)",
};

const ALSO_PHONES = "Also used on phones if no mobile image is uploaded";
const ALSO_DESKTOP = "Also used on tablets and desktops if no desktop image is uploaded";
const tile = (price: number, where: string) => `Under ₹${price} tile ${where}`;

/** Where each slot shows, for the admin page. */
export const SLOT_PLACEMENT: Record<BannerSlot, string> = {
  hero: "Rotates at the top of the home page",
  promo: "Single strip under the category grid",
  deal: `Wide card left of the Under ₹ tiles on tablets and desktops (about 12:5); replaces the signup artwork while active. Add several to rotate them; with no link, a tap opens sign-up / wallet. ${ALSO_PHONES}`,
  deal_mobile: `Tall card left of the Under ₹ tiles on phones (about 2:3). Add several to rotate them (paired in order with the desktop ones). ${ALSO_DESKTOP}`,
  under_9: `${tile(9, "on tablets and desktops (wide, about 16:5)")}. ${ALSO_PHONES}`,
  under_9_mobile: `${tile(9, "on phones (square)")}. ${ALSO_DESKTOP}`,
  under_49: `${tile(49, "on tablets and desktops (wide, about 16:5)")}. ${ALSO_PHONES}`,
  under_49_mobile: `${tile(49, "on phones (square)")}. ${ALSO_DESKTOP}`,
  under_99: `${tile(99, "on tablets and desktops (wide, about 16:5)")}. ${ALSO_PHONES}`,
  under_99_mobile: `${tile(99, "on phones (square)")}. ${ALSO_DESKTOP}`,
  under_199: `${tile(199, "on tablets and desktops (wide, about 16:5)")}. ${ALSO_PHONES}`,
  under_199_mobile: `${tile(199, "on phones (square)")}. ${ALSO_DESKTOP}`,
  popup_desktop:
    "Pops up 3s after anyone opens the home page, on tablets and desktops. Also used on phones if no mobile popup is uploaded",
  popup_mobile:
    "Same popup on phones. Also used on desktop if no desktop popup is uploaded",
};

// Frame shapes on the home page (components/storefront/home-banner-actions.tsx).
const TILE_DESKTOP = 16 / 5;
const TILE_MOBILE = 1;

export const SLOT_ASPECTS: Record<BannerSlot, number> = {
  hero: 12 / 5,
  promo: 1248 / 128,
  deal: 12 / 5,
  deal_mobile: 2 / 3,
  under_9: TILE_DESKTOP,
  under_9_mobile: TILE_MOBILE,
  under_49: TILE_DESKTOP,
  under_49_mobile: TILE_MOBILE,
  under_99: TILE_DESKTOP,
  under_99_mobile: TILE_MOBILE,
  under_199: TILE_DESKTOP,
  under_199_mobile: TILE_MOBILE,
  popup_desktop: 2 / 1,
  popup_mobile: 9 / 16,
};
