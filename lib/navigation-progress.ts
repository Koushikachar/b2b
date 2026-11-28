/**
 * Should a click on this link start the top loading bar? Only for a plain
 * left-click to another page of this site (not new tabs, downloads, other
 * sites, modified clicks, or the page/section already shown).
 */
export function startsNavigation(
  click: { button: number; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean; defaultPrevented: boolean },
  link: { href: string; target?: string; download?: boolean },
  currentHref: string,
): boolean {
  if (click.defaultPrevented || click.button !== 0) return false;
  if (click.metaKey || click.ctrlKey || click.shiftKey || click.altKey) return false;
  if ((link.target && link.target !== "_self") || link.download) return false;
  let to: URL, from: URL;
  try {
    to = new URL(link.href, currentHref);
    from = new URL(currentHref);
  } catch {
    return false;
  }
  if (to.origin !== from.origin) return false;
  return to.pathname !== from.pathname || to.search !== from.search;
}
