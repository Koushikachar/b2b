import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { isSupportedImageType, sniffImageType } from "@/lib/storage";

const MAX_REMOTE_IMAGE_BYTES = 10 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 10_000;

/**
 * True for addresses a supplier-supplied URL must never reach (SSRF guard):
 * loopback, private, link-local (cloud metadata), CGNAT, multicast/reserved,
 * and IPv6 equivalents including IPv4-mapped forms.
 */
export function isPrivateAddress(ip: string): boolean {
  const mapped = ip.toLowerCase().match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateAddress(mapped[1]);
  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19))
    );
  }
  if (isIP(ip) === 6) {
    const v = ip.toLowerCase();
    return v === "::" || v === "::1" || /^f[cd]/.test(v) || /^fe[89ab]/.test(v) || v.startsWith("ff");
  }
  return true; // not an IP at all: refuse
}

/**
 * Download an image from a URL a supplier put in their import file.
 * http(s) only, every resolved address must be public, no redirects (they
 * could bounce to an internal host), 10 s timeout, 10 MB cap, real image bytes.
 *
 * shortcut: DNS is checked before the fetch, so a host that re-resolves to a
 * private IP in between (DNS rebinding) isn't caught; pin the resolved IP with
 * a custom dispatcher if imports ever run with access to sensitive internals.
 */
export async function fetchRemoteImage(url: string): Promise<File> {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("Only http(s) image links are allowed.");
  }
  const host = parsed.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
  if (addresses.length === 0 || addresses.some((a) => isPrivateAddress(a.address))) {
    throw new Error("Image link points to a private address.");
  }

  const res = await fetch(parsed, {
    redirect: "error",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: { Accept: "image/*" },
  });
  if (!res.ok) throw new Error(`Image link returned ${res.status}.`);
  const length = Number(res.headers.get("content-length") ?? 0);
  if (length > MAX_REMOTE_IMAGE_BYTES) throw new Error("Image is larger than 10 MB.");

  // Stream with a hard cap: content-length can be missing or wrong.
  const reader = res.body?.getReader();
  if (!reader) throw new Error("Image link returned no data.");
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_REMOTE_IMAGE_BYTES) {
      await reader.cancel();
      throw new Error("Image is larger than 10 MB.");
    }
    chunks.push(value);
  }

  const name = parsed.pathname.split("/").pop() || "image";
  const file = new File(chunks as BlobPart[], name, { type: res.headers.get("content-type") ?? "" });
  if (!isSupportedImageType(await sniffImageType(file))) {
    throw new Error("Image link is not a JPG, PNG or WEBP image.");
  }
  return file;
}
