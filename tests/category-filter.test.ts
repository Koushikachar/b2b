import { describe, expect, it } from "vitest";
import { inEitherCategory } from "../lib/storefront";

const A = "0cc2b085-608f-4975-9af6-5c052571b222";
const B = "0cfdbeb9-d3dc-499f-8005-c5c5427ce268";

describe("inEitherCategory", () => {
  it("matches the main or the second category", () => {
    expect(inEitherCategory([A, B])).toBe(
      `category_id.in.(${A},${B}),secondary_category_id.in.(${A},${B})`,
    );
  });

  it("drops anything that is not a uuid", () => {
    expect(inEitherCategory([A, "x),status.eq.draft"])).toBe(
      `category_id.in.(${A}),secondary_category_id.in.(${A})`,
    );
  });
});
