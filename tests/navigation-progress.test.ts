import { describe, expect, it } from "vitest";
import { startsNavigation } from "../lib/navigation-progress";

const here = "https://direct2hub.in/products?sort=newest";
const click = { button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, defaultPrevented: false };
const link = (href: string, extra: { target?: string; download?: boolean } = {}) => ({ href, ...extra });

describe("startsNavigation (when the top loading bar should start)", () => {
  it("starts for a normal tap on a link to another page of the site", () => {
    expect(startsNavigation(click, link("https://direct2hub.in/under/49"), here)).toBe(true);
    expect(startsNavigation(click, link("https://direct2hub.in/products?sort=price_asc"), here)).toBe(true);
  });

  it("does not start for the page you are already on, or a #section on it", () => {
    expect(startsNavigation(click, link(here), here)).toBe(false);
    expect(startsNavigation(click, link(`${here}#reviews`), here)).toBe(false);
  });

  it("does not start for other sites, new tabs, downloads or modified clicks", () => {
    expect(startsNavigation(click, link("https://wa.me/919187166233"), here)).toBe(false);
    expect(startsNavigation(click, link("https://direct2hub.in/faq", { target: "_blank" }), here)).toBe(false);
    expect(startsNavigation(click, link("https://direct2hub.in/orders/x/invoice", { download: true }), here)).toBe(false);
    expect(startsNavigation({ ...click, ctrlKey: true }, link("https://direct2hub.in/faq"), here)).toBe(false);
    expect(startsNavigation({ ...click, button: 1 }, link("https://direct2hub.in/faq"), here)).toBe(false);
    expect(startsNavigation({ ...click, defaultPrevented: true }, link("https://direct2hub.in/faq"), here)).toBe(false);
  });
});
