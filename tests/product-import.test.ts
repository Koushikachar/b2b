import { describe, expect, it } from "vitest";
import {
  cellToText,
  csvToTable,
  groupImagesBySku,
  groupIntoUnits,
  IMPORT_COLUMNS,
  localFileKey,
  localFilesOf,
  missingRequired,
  parseImportCsv,
  parseYesNo,
  rowsFromTable,
  skuFromImageName,
  suggestMapping,
  templateCsv,
  toCsv,
  validateImportUnit,
  type ImportRow,
} from "../lib/supplier/product-import";

const categories = [
  { id: "11111111-1111-4111-8111-111111111111", name: "Electronics & Accessories" },
  { id: "22222222-2222-4222-8222-222222222222", name: "Home Essentials" },
  { id: "33333333-3333-4333-8333-333333333333", name: "Fashion & Accessories" },
];

const unitsOf = (rows: ImportRow[]) => groupIntoUnits(rows.map((row, i) => ({ line: i + 2, row })));

describe("product import", () => {
  it("has every Add-product form field as a column", () => {
    for (const field of [
      "title", "category", "sku", "hsn_code", "gst_rate", "carton_units", "carton_weight_kg",
      "carton_dimensions", "description", "mrp", "price", "unit", "negotiable", "images",
      "youtube_url", "packaging_details", "warranty_return", "winning_product", "hot_selling",
      "seo_title", "seo_description", "search_image", "publish",
    ]) {
      expect(IMPORT_COLUMNS).toContain(field);
    }
  });

  it("round-trips the template: simple product with all form fields + a 2-variant product", () => {
    const { rows, error } = parseImportCsv(templateCsv());
    expect(error).toBeUndefined();
    expect(rows).toHaveLength(3);
    const units = unitsOf(rows);
    expect(units).toHaveLength(2);

    const simple = validateImportUnit(units[0], categories);
    expect(simple.ok).toBe(true);
    if (simple.ok) {
      expect(simple.values).toMatchObject({
        price_per_unit: 7.85,
        carton_weight_kg: 6.5,
        carton_dimensions: "40 x 30 x 25 cm",
        negotiable: false,
        is_hot_selling: true,
        is_winning: false,
      });
      expect(simple.stock).toBe(500);
      expect(simple.publish).toBe(false);
      // Web link + a Windows path + a bare file name, in order.
      expect(simple.images).toEqual([
        { kind: "url", url: "https://example.com/clip-1.jpg" },
        { kind: "file", name: "clip-2.jpg" },
        { kind: "file", name: "clip-3.jpg" },
      ]);
      expect(localFilesOf(simple)).toEqual(["clip-2.jpg", "clip-3.jpg"]);
    }

    const tshirt = validateImportUnit(units[1], categories);
    expect(tshirt.ok).toBe(true);
    if (tshirt.ok) {
      expect(tshirt.values.seller_sku).toBe("TSHIRT-01");
      expect(tshirt.values.price_per_unit).toBe(149); // cheapest variant
      expect(tshirt.stock).toBe(200);
      expect(tshirt.publish).toBe(true);
      expect(tshirt.images).toHaveLength(3);
      expect(tshirt.variants.map((v) => v.label)).toEqual(["M / Black", "L / Black"]);
      expect(tshirt.variants[0]).toMatchObject({ seller_sku: "TSHIRT-01-M", attrs: { Size: "M", Color: "Black" } });
    }
  });

  it("keeps the supplier's own SEO text and a local search image", () => {
    const base = parseImportCsv(templateCsv()).rows[0];
    const result = validateImportUnit(
      unitsOf([{ ...base, seo_title: "Cable clips", seo_description: "Tidy cables", search_image: "D:\\pics\\Cover.PNG" }])[0],
      categories,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.values.seo_title).toBe("Cable clips");
      expect(result.searchImage).toEqual({ kind: "file", name: "cover.png" });
    }
  });

  it("maps header aliases, strips Excel's BOM and parses ₹ prices", () => {
    const csv = "\uFEFFProduct Name,Category,Description,Selling Price,MRP (₹),Price negotiable\n" +
      `"Steel Water Bottle 1L, Leak Proof",home essentials,${"Double wall steel bottle that keeps water cold. ".repeat(2)},"₹1,299","1,999",Yes`;
    const { rows, error } = parseImportCsv(csv);
    expect(error).toBeUndefined();
    const result = validateImportUnit(unitsOf(rows)[0], categories);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.values.price_per_unit).toBe(1299);
      expect(result.values.mrp).toBe(1999);
      expect(result.values.negotiable).toBe(true);
    }
  });

  it("lets a custom mapping cover odd headers", () => {
    const table = csvToTable("Item,Cat,Info,Cost\nWidget Pro Max 3000,Home Essentials," + "x".repeat(60) + ",10");
    expect(missingRequired(suggestMapping(table[0]))).toEqual(["title", "category", "description", "price"]);
    const rows = rowsFromTable(table, ["title", "category", "description", "price"]);
    expect(validateImportUnit(unitsOf(rows)[0], categories).ok).toBe(true);
  });

  it("reports the first problem with its spreadsheet line", () => {
    const base = parseImportCsv(templateCsv()).rows[0];
    expect(validateImportUnit(unitsOf([{ ...base, category: "Mobil" }])[0], categories)).toEqual({
      ok: false, line: 2, message: 'Category "Mobil" not found.',
    });
    expect(validateImportUnit(unitsOf([{ ...base, price: "abc" }])[0], categories).ok).toBe(false);
    expect(validateImportUnit(unitsOf([{ ...base, images: "ftp://x/y.jpg" }])[0], categories))
      .toMatchObject({ ok: false, message: expect.stringMatching(/isn't a web link/) });
    expect(validateImportUnit(unitsOf([{ ...base, images: "C:\\docs\\notes.pdf" }])[0], categories).ok).toBe(false);
    expect(validateImportUnit(unitsOf([{ ...base, negotiable: "maybe" }])[0], categories))
      .toMatchObject({ ok: false, message: "negotiable must be yes or no." });
  });

  it("rejects duplicate variants and variants without size or color", () => {
    const [, m, l] = parseImportCsv(templateCsv()).rows;
    const dup = validateImportUnit(unitsOf([m, { ...l, size: "M" }])[0], categories);
    expect(dup).toMatchObject({ ok: false, line: 3, message: 'Duplicate variant "M / Black".' });
    const bare = validateImportUnit(unitsOf([m, { ...l, size: "", color: "", sku: "" }])[0], categories);
    expect(bare).toMatchObject({ ok: false, line: 3, message: "Add a size or color for each variant." });
  });

  it("normalises local paths and yes/no cells", () => {
    expect(localFileKey("C:\\Users\\me\\Photos\\Shirt FRONT.JPG")).toBe("shirt front.jpg");
    expect(localFileKey("file:///home/me/a.png")).toBe("a.png");
    expect(localFileKey("photos/b.webp")).toBe("b.webp");
    expect([parseYesNo(""), parseYesNo("Yes"), parseYesNo("TRUE"), parseYesNo("no"), parseYesNo("x")])
      .toEqual([false, true, true, false, null]);
  });

  it("matches image file names to SKUs", () => {
    expect(skuFromImageName("CABLE-ORG-01_1.jpg")).toBe("CABLE-ORG-01");
    expect(skuFromImageName("folder/tshirt-01-m-2.PNG")).toBe("TSHIRT-01-M");
    expect(skuFromImageName("notes.txt")).toBeNull();
    const file = (n: string) => new File(["x"], n, { type: "image/jpeg" });
    const { bySku, unmatched } = groupImagesBySku([file("A1B_2.jpg"), file("A1B_10.jpg"), file("A1B_1.jpg"), file("x.gif")]);
    expect(bySku.get("A1B")?.map((f) => f.name)).toEqual(["A1B_1.jpg", "A1B_2.jpg", "A1B_10.jpg"]);
    expect(unmatched).toEqual(["x.gif"]);
  });

  it("converts Excel cells and quotes CSV cells", () => {
    expect(cellToText(12.5)).toBe("12.5");
    expect(cellToText(true)).toBe("yes");
    expect(cellToText(null)).toBe("");
    expect(cellToText(new Date("2026-01-02T00:00:00Z"))).toBe("2026-01-02");
    expect(toCsv([["a,b", 'say "hi"', "plain"]])).toBe('"a,b","say ""hi""",plain');
  });
});
