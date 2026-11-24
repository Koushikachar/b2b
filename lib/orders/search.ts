// Supplier order search (?q=): order number or buyer name, across all pages.

const MAX_TERM = 60;

/**
 * Clean an untrusted search box value. Only letters, digits, spaces and
 * hyphens survive, so the term can't alter the PostgREST `or` filter or act
 * as a LIKE wildcard. An order number with either prefix (old B2B-, current
 * D2H-) reduces to its digits so both find the same order.
 */
export function orderSearchTerm(raw: string | string[] | null | undefined): string | null {
  // A repeated ?q= arrives as an array; use the first value.
  const value = Array.isArray(raw) ? raw[0] : raw;
  const cleaned = (value ?? "")
    .replace(/[^\p{L}\p{N} -]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_TERM);
  const term = cleaned.replace(/^(b2b|d2h)-?(?=\d)/i, "");
  return term || null;
}

/** PostgREST `or` filter for a term from orderSearchTerm. */
export function orderSearchFilter(term: string): string {
  return `reference.ilike.%${term}%,delivery->>fullName.ilike.%${term}%`;
}
