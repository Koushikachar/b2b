import { describe, expect, it } from "vitest";
import {
  discountPercent,
  generateSku,
  orderImagesByKeys,
  parseImageOrder,
  productSchema,
  productVariantSchema,
} from "../lib/supplier/products";
import {
  attributesFromVariants,
  buildVariantRows,
  combinations,
  comboLabel,
  parseValues,
} from "../app/supplier/dashboard/products/variant-builder";

const baseProduct = {
  title: "Self adhesive cable organiser clip",
  category_id: "3883c1d6-80db-4b49-8e1e-ace97885b674",
  description: "x".repeat(60),
  price_per_unit: "50",
};

describe("orderImagesByKeys", () => {
  it("follows the dragged order across saved and new images", () => {
    expect(
      orderImagesByKeys(["new:1", "existing:a.jpg", "new:0"], ["a.jpg", "b.jpg"], ["n0.jpg", "n1.jpg"]),
    ).toEqual(["n1.jpg", "a.jpg", "n0.jpg", "b.jpg"]);
  });

  it("ignores stale or unknown keys", () => {
    expect(orderImagesByKeys(["existing:gone.jpg", "new:9", "junk"], ["a.jpg"], ["n0.jpg"])).toEqual([
      "a.jpg",
      "n0.jpg",
    ]);
  });

  it("parses the posted order safely", () => {
    expect(parseImageOrder('["new:0","existing:a.jpg"]')).toEqual(["new:0", "existing:a.jpg"]);
    expect(parseImageOrder("not json")).toEqual([]);
    expect(parseImageOrder(null)).toEqual([]);
  });
});

describe("optional listing fields", () => {
  it("accepts a product without SKU, HSN, GST or unit", () => {
    const parsed = productSchema.safeParse({
      ...baseProduct,
      seller_sku: "",
      hsn_code: "",
      gst_rate: "",
      unit: "",
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.seller_sku).toBe("");
    expect(parsed.data.hsn_code).toBe("");
    expect(parsed.data.gst_rate).toBeNull();
    expect(parsed.data.unit).toBe("pcs");
  });

  it("still validates values that are provided", () => {
    expect(productSchema.safeParse({ ...baseProduct, hsn_code: "12" }).success).toBe(false);
    expect(productSchema.safeParse({ ...baseProduct, gst_rate: "7" }).success).toBe(false);
    expect(productSchema.safeParse({ ...baseProduct, seller_sku: "a b" }).success).toBe(false);
    expect(productSchema.safeParse({ ...baseProduct, gst_rate: "18", hsn_code: "6115" }).success).toBe(true);
  });

  it("generates SKUs that pass the SKU rule", () => {
    const sku = generateSku();
    expect(sku).toMatch(/^[A-Z0-9-_]{3,30}$/);
    expect(generateSku()).not.toBe(sku);
    expect(productVariantSchema.safeParse({ label: "Pack of 2", seller_sku: "", price: 10 }).success).toBe(true);
  });
});

describe("discountPercent", () => {
  it("rounds MRP 199 → 50 to 75% off", () => {
    expect(discountPercent(199, 50)).toBe(75);
  });

  it("is 0 without a higher MRP", () => {
    expect(discountPercent(null, 50)).toBe(0);
    expect(discountPercent(40, 50)).toBe(0);
    expect(discountPercent(50, 50)).toBe(0);
  });
});

describe("variant builder", () => {
  it("builds one row per combination", () => {
    const combos = combinations([
      { name: "Size", values: ["S", "M"] },
      { name: "Colour", values: ["Red", "Blue"] },
    ]);
    expect(combos).toHaveLength(4);
    expect(comboLabel(combos[0])).toBe("S / Red");
  });

  it("labels a single short value with its attribute", () => {
    expect(comboLabel({ Size: "S" })).toBe("Size S");
  });

  it("keeps typed prices when attributes change", () => {
    const first = buildVariantRows([{ name: "Pack", values: ["Pack of 2"] }], []);
    first[0].price = 99;
    const next = buildVariantRows([{ name: "Pack", values: ["Pack of 2", "Pack of 6"] }], first);
    expect(next.map((v) => [v.label, v.price])).toEqual([
      ["Pack of 2", 99],
      ["Pack of 6", 0],
    ]);
  });

  it("restores attributes from saved variants", () => {
    expect(
      attributesFromVariants([
        { label: "S / Red", attrs: { Size: "S", Colour: "Red" }, seller_sku: "A", price: 1, moq: null, stock_qty: 0 },
        { label: "M / Red", attrs: { Size: "M", Colour: "Red" }, seller_sku: "B", price: 1, moq: null, stock_qty: 0 },
      ]),
    ).toEqual([
      { name: "Size", values: ["S", "M"] },
      { name: "Colour", values: ["Red"] },
    ]);
  });

  it("splits pasted comma lists without duplicates", () => {
    expect(parseValues("pack of 2, pack of 6,Pack of 2 ,", ["pack of 8"])).toEqual([
      "pack of 8",
      "pack of 2",
      "pack of 6",
    ]);
  });
});

describe("priceBand", () => {
  it("Under ₹9 has no floor; later buckets start above the previous one", async () => {
    const { priceBand } = await import("../lib/promotions");
    expect(priceBand(9)).toEqual({ maxPrice: 9 });
    expect(priceBand(29)).toEqual({ minPrice: 9.01, maxPrice: 29 });
    expect(priceBand(49)).toEqual({ minPrice: 29.01, maxPrice: 49 });
    expect(priceBand(99)).toEqual({ minPrice: 49.01, maxPrice: 99 });
  });
});

describe("variant builder keeps saved rows", () => {
  it("matches by attribute values, so custom labels and prices survive", () => {
    const saved = [
      { id: "v1", label: "Red pack", attrs: { Colour: "Red" }, seller_sku: "RED-1", price: 120, moq: 2, stock_qty: 5 },
    ];
    const [row] = buildVariantRows([{ name: "Colour", values: ["Red", "Blue"] }], saved);
    expect(row).toMatchObject({ id: "v1", label: "Red pack", seller_sku: "RED-1", price: 120, moq: 2, stock_qty: 5 });
  });
});
