/**
 * JSON for a `<script type="application/ld+json">` tag. Plain JSON.stringify
 * leaves `</script>` intact, so supplier text such as a product title could
 * close the tag and inject markup (stored XSS). Escaping `<` as < keeps
 * the JSON identical for parsers (Next 16 docs, guides/json-ld).
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
