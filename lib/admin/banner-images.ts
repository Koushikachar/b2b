import { SLOT_ASPECTS, type BannerSlot } from "./banner-slots";

export const BANNER_OUTPUT_WIDTH = 1600;
/** Tall (portrait) uploads are capped here instead of growing without bound. */
export const BANNER_MAX_HEIGHT = 2400;

/**
 * The size that fills a slot exactly (recommended upload size). Uploads keep
 * their own shape, so any other shape works too and is shown whole.
 */
export function getBannerOutputSize(slot: BannerSlot) {
  const width = BANNER_OUTPUT_WIDTH;
  const height = Math.round(width / SLOT_ASPECTS[slot]);

  return {
    width,
    height,
  };
}
