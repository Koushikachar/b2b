export const PUBLIC_PATH_PREFIXES = ["/auth"] as const;

export const LOGIN_PATH = "/auth/login";

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

const SAFE_BASE = "https://same-origin.invalid";

/**
 * Where to send someone after login: a path on this site, else "/". Browsers
 * read "/\host" (and tabs/newlines inside it) like "//host", so backslashes and
 * control characters are refused, and the result must stay on our origin.
 */
export function getSafeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(next)) {
    return "/";
  }
  try {
    const url = new URL(next, SAFE_BASE);
    if (url.origin !== SAFE_BASE) return "/";
    const path = `${url.pathname}${url.search}${url.hash}`;
    return path.startsWith("//") ? "/" : path;
  } catch {
    return "/";
  }
}
