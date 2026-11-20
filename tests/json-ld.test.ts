import { describe, expect, it } from "vitest";
import { serializeJsonLd } from "../lib/json-ld";

describe("serializeJsonLd (SECURITY.md S-1)", () => {
  const title = "Steel pipes</script><script>alert(1)</script>";

  it("cannot close the script tag it is placed in", () => {
    const out = serializeJsonLd({ name: title });
    expect(out).not.toContain("<");
    expect(out.toLowerCase()).not.toContain("</script");
  });

  it("parses back to exactly the same data", () => {
    const data = { "@type": "Product", name: title, offers: { price: 12.5 } };
    expect(JSON.parse(serializeJsonLd(data))).toEqual(data);
  });
});
