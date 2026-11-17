import { describe, expect, it } from "vitest";
import {
  PRODUCT_IMPORT_COLUMNS,
  PRODUCT_IMPORT_MAX_ROWS,
  buildProductImportPreview,
  buildProductImportTemplate,
  checkImportImages,
  createCategoryLookup,
  csvCell,
  groupImportImages,
  imageWarnings,
  parseProductImportCsv,
  validateProductImportRow,
  type ProductImportRawRow,
} from "../lib/supplier/product-import";

const CATEGORY = {
  id: "6f4e6d0e-2a7d-4e5f-9d3c-1b2a3c4d5e6f",
  name: "Drinkware",
  slug: "drinkware",
};
const DESCRIPTION =
  "Single-wall stainless steel water bottle with a leak-proof cap.";

function rawRow(
  line: number,
  cells: Partial<Record<string, string>>,
): ProductImportRawRow {
  return { line, cells: cells as ProductImportRawRow["cells"] };
}

function validCells(): Record<string, string> {
  return {
    title: "Steel water bottle 1 L",
    category: "Drinkware",
    seller_sku: "skutest-1",
    description: DESCRIPTION,
    hsn_code: "73239390",
    gst_rate: "18",
    unit: "pcs",
    price_per_unit: "245",
    mrp: "399",
    moq: "12",
    stock_qty: "100",
  };
}

function photo(relativePath: string, size = 1000) {
  return { relativePath, size };
}

describe("parseProductImportCsv", () => {
  it("maps common header aliases and skips blank rows", () => {
    const parsed = parseProductImportCsv(
      [
        "Product Name,Category Slug,Description,Price,Seller SKU",
        `Steel bottle,Drinkware,${DESCRIPTION},245,sku-1`,
        ",,,,",
        `Glass bottle,Drinkware,${DESCRIPTION},199,sku-2`,
      ].join("\n"),
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows[0].line).toBe(2);
    expect(parsed.rows[0].cells.title).toBe("Steel bottle");
    expect(parsed.rows[0].cells.category).toBe("Drinkware");
    expect(parsed.rows[0].cells.price_per_unit).toBe("245");
    expect(parsed.rows[0].cells.seller_sku).toBe("sku-1");
    // Blank rows are skipped, so rows are numbered among non-empty rows.
    expect(parsed.rows[1].line).toBe(3);
  });

  it("rejects a file without recognisable columns", () => {
    const parsed = parseProductImportCsv("colour,size\nred,L\n");
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.message).toMatch(/no recognizable columns/i);
  });

  it("lists the required columns that are missing", () => {
    const parsed = parseProductImportCsv("Product title,Category\nBottle,Drinkware\n");
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.message).toContain("Description");
    expect(parsed.message).toContain("Price per unit");
  });

  it("rejects a header-only file and a file above the row limit", () => {
    const empty = parseProductImportCsv(
      PRODUCT_IMPORT_COLUMNS.map((column) => column.header).join(","),
    );
    expect(empty.ok).toBe(false);

    const header = PRODUCT_IMPORT_COLUMNS.map((column) => column.header).join(",");
    const row = PRODUCT_IMPORT_COLUMNS.map(() => "x").join(",");
    const tooMany = parseProductImportCsv(
      [header, ...Array.from({ length: PRODUCT_IMPORT_MAX_ROWS + 1 }, () => row)].join(
        "\n",
      ),
    );
    expect(tooMany.ok).toBe(false);
    if (tooMany.ok) return;
    expect(tooMany.message).toContain(String(PRODUCT_IMPORT_MAX_ROWS));
  });

  it("accepts a UTF-8 BOM from spreadsheet exports", () => {
    const parsed = parseProductImportCsv(
      `\uFEFFProduct title,Category,Description,Price per unit\nBottle,Drinkware,${DESCRIPTION},245\n`,
    );
    expect(parsed.ok).toBe(true);
  });
});

describe("buildProductImportTemplate", () => {
  it("round-trips through the parser with a valid sample row", () => {
    const template = buildProductImportTemplate([CATEGORY]);
    const parsed = parseProductImportCsv(template);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.rows).toHaveLength(1);

    const result = validateProductImportRow(
      parsed.rows[0],
      createCategoryLookup([CATEGORY]),
    );
    expect(result.ok).toBe(true);
  });

  it("writes every template header in order without an image column", () => {
    const template = buildProductImportTemplate([CATEGORY]);
    const header = template.split("\r\n")[0];
    expect(header).toBe(
      PRODUCT_IMPORT_COLUMNS.map((column) => csvCell(column.header)).join(","),
    );
    expect(header).not.toMatch(/image/i);
  });
});

describe("createCategoryLookup", () => {
  const lookup = createCategoryLookup([CATEGORY]);

  it("matches id, name and slug case-insensitively", () => {
    expect(lookup.idFor(CATEGORY.id)).toBe(CATEGORY.id);
    expect(lookup.idFor(" drinkware ")).toBe(CATEGORY.id);
    expect(lookup.idFor("DRINKWARE")).toBe(CATEGORY.id);
    expect(lookup.idFor("Kitchen")).toBeNull();
    expect(lookup.nameFor(CATEGORY.id)).toBe("Drinkware");
  });
});

describe("validateProductImportRow", () => {
  const lookup = createCategoryLookup([CATEGORY]);

  it("normalises a valid row", () => {
    const result = validateProductImportRow(rawRow(2, validCells()), lookup);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.title).toBe("Steel water bottle 1 L");
    expect(result.sku).toBe("SKUTEST-1");
    expect(result.warnings).toEqual([]);
    expect(result.values.category_id).toBe(CATEGORY.id);
    expect(result.values.category_name).toBe("Drinkware");
    expect(result.values.moq).toBe(12);
    expect(result.values.stock_qty).toBe(100);
  });

  it("keeps image warnings out of row validation", () => {
    const cells = { ...validCells(), seller_sku: "" };
    const result = validateProductImportRow(rawRow(3, cells), lookup);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.sku).toBe("");
    expect(result.values.seller_sku).toBe("");
    // The preview adds image warnings once it knows the matched photo count.
    expect(result.warnings).toEqual([]);
  });

  it("reports how many more photos a product needs to publish", () => {
    expect(imageWarnings(0)[0]).toMatch(/no photos/i);
    expect(imageWarnings(1)[0]).toMatch(/2 more photos/i);
    expect(imageWarnings(2)[0]).toMatch(/1 more photo/i);
    expect(imageWarnings(3)).toEqual([]);
  });

  it("passes YouTube, SEO and negotiable values through", () => {
    const result = validateProductImportRow(
      rawRow(7, {
        ...validCells(),
        youtube_url: "https://youtu.be/dQw4w9WgXcQ",
        seo_title: "Steel water bottle 1 L wholesale",
        seo_description: "Buy leak-proof steel water bottles in bulk from verified suppliers.",
        negotiable: "Yes",
      }),
      lookup,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.values.youtube_url).toBe("https://youtu.be/dQw4w9WgXcQ");
    expect(result.values.seo_title).toBe("Steel water bottle 1 L wholesale");
    expect(result.values.seo_description).toBe(
      "Buy leak-proof steel water bottles in bulk from verified suppliers.",
    );
    expect(result.values.negotiable).toBe(true);
  });

  it("treats a blank negotiable column as No", () => {
    const result = validateProductImportRow(rawRow(8, validCells()), lookup);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.values.negotiable).toBe(false);
  });

  it("rejects an invalid YouTube link and a non Yes/No negotiable value", () => {
    const result = validateProductImportRow(
      rawRow(9, {
        ...validCells(),
        youtube_url: "not-a-video",
        negotiable: "Maybe",
      }),
      lookup,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    const message = result.errors.join(" ");
    expect(message).toMatch(/YouTube URL/);
    expect(message).toMatch(/Yes.*No/);
  });

  it("rejects an unknown category", () => {
    const result = validateProductImportRow(
      rawRow(5, { ...validCells(), category: "Nope" }),
      lookup,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.join(" ")).toMatch(/not found/i);
  });

  it("rejects invalid title, SKU, MOQ and stock", () => {
    const cells = {
      ...validCells(),
      title: "Bottle",
      seller_sku: "x",
      moq: "0",
      stock_qty: "-5",
    };
    const result = validateProductImportRow(rawRow(6, cells), lookup);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    const message = result.errors.join(" ");
    expect(message).toMatch(/Title needs at least 10 characters/);
    expect(message).toMatch(/SKU/);
    expect(message).toMatch(/MOQ must be a whole number/);
    expect(message).toMatch(/Stock qty must be a whole number/);
  });
});

describe("groupImportImages", () => {
  it("groups photos by SKU folder, case-insensitively", () => {
    const grouped = groupImportImages([
      photo("images/SKU-001/2.jpg"),
      photo("images/sku-001/1.jpg"),
      photo("images/SKU-002/1.webp"),
    ]);
    expect(grouped.folders.map((folder) => folder.sku)).toEqual([
      "SKU-001",
      "SKU-002",
    ]);
    expect(grouped.folders[0].files.map((file) => file.relativePath)).toEqual([
      "images/sku-001/1.jpg",
      "images/SKU-001/2.jpg",
    ]);
  });

  it("orders 1, 2, 10 and ignores junk files", () => {
    const grouped = groupImportImages([
      photo("images/SKU-1/10.jpg"),
      photo("images/SKU-1/2.jpg"),
      photo("images/SKU-1/1.PNG"),
      photo("images/SKU-1/notes.txt"),
      photo("images/SKU-1/.DS_Store"),
    ]);
    expect(grouped.folders[0].files.map((file) => file.relativePath)).toEqual([
      "images/SKU-1/1.PNG",
      "images/SKU-1/2.jpg",
      "images/SKU-1/10.jpg",
    ]);
    expect(grouped.ignored).toEqual([
      "images/SKU-1/.DS_Store",
      "images/SKU-1/notes.txt",
    ]);
  });

  it("reports photos that sit outside a SKU folder", () => {
    const grouped = groupImportImages([photo("images/1.jpg"), photo("1.jpg")]);
    expect(grouped.folders).toEqual([]);
    expect(grouped.loose).toEqual(["1.jpg", "images/1.jpg"]);
  });

  it("dedupes repeated paths", () => {
    const grouped = groupImportImages([
      photo("images/SKU-1/1.jpg"),
      photo("images/SKU-1/1.jpg"),
    ]);
    expect(grouped.folders[0].files).toHaveLength(1);
  });
});

describe("checkImportImages", () => {
  const skus = new Set(["SKU-1", "SKU-2"]);

  it("accepts folders that match a row", () => {
    const check = checkImportImages(
      [photo("images/SKU-1/1.jpg"), photo("images/SKU-1/2.jpg")],
      skus,
    );
    expect(check.errorsBySku.size).toBe(0);
    expect(check.notes).toEqual([]);
    expect(check.folders[0].files).toHaveLength(2);
  });

  it("blocks oversized photos and names the exact file", () => {
    const check = checkImportImages(
      [photo("images/SKU-1/2.jpg", 3 * 1024 * 1024)],
      skus,
    );
    const errors = (check.errorsBySku.get("SKU-1") ?? []).join(" ");
    expect(errors).toContain("images/SKU-1/2.jpg");
    expect(errors).toMatch(/under 2 MB/i);
  });

  it("blocks more than eight photos and names the extras", () => {
    const files = Array.from({ length: 10 }, (_, index) =>
      photo(`images/SKU-1/${index + 1}.jpg`),
    );
    const errors = (checkImportImages(files, skus).errorsBySku.get("SKU-1") ?? []).join(
      " ",
    );
    expect(errors).toMatch(/10 photos/i);
    expect(errors).toContain("images/SKU-1/9.jpg");
    expect(errors).toContain("images/SKU-1/10.jpg");
  });

  it("notes unmatched folders and skipped files without blocking", () => {
    const check = checkImportImages(
      [photo("images/SKU-999/1.jpg"), photo("images/SKU-1/readme.txt")],
      skus,
    );
    expect(check.errorsBySku.size).toBe(0);
    const notes = check.notes.join(" ");
    expect(notes).toMatch(/SKU-999/);
    expect(notes).toMatch(/readme\.txt/);
  });
});

describe("buildProductImportPreview", () => {
  function preview(cells: Record<string, string>, images: ReturnType<typeof photo>[]) {
    return buildProductImportPreview({
      rows: [rawRow(2, cells)],
      categories: [CATEGORY],
      existing: new Set<string>(),
      images,
    });
  }

  it("counts matched photos and warns when a folder has fewer than three", () => {
    const result = preview(validCells(), [photo("images/skutest-1/1.jpg")]);
    expect(result.summary.ready).toBe(1);
    expect(result.summary.errors).toBe(0);
    expect(result.rows[0].images).toBe(1);
    expect(result.rows[0].warnings.join(" ")).toMatch(/2 more photos/i);
  });

  it("turns an oversized photo into a blocking row error", () => {
    const result = preview(validCells(), [
      photo("images/skutest-1/1.jpg", 3 * 1024 * 1024),
    ]);
    expect(result.summary.errors).toBe(1);
    expect(result.summary.ready).toBe(0);
    expect(result.rows[0].status).toBe("error");
    expect(result.rows[0].message).toContain("images/skutest-1/1.jpg");
  });

  it("notes a folder that matches no row without blocking the import", () => {
    const result = preview(validCells(), [photo("images/OTHER-1/1.jpg")]);
    expect(result.summary.errors).toBe(0);
    expect(result.rows[0].status).toBe("ready");
    expect(result.imageNotes.join(" ")).toMatch(/OTHER-1/);
  });

  it("marks a repeated SKU in the file as a duplicate", () => {
    const result = buildProductImportPreview({
      rows: [rawRow(2, validCells()), rawRow(3, validCells())],
      categories: [CATEGORY],
      existing: new Set<string>(),
      images: [],
    });
    expect(result.summary.ready).toBe(1);
    expect(result.summary.duplicates).toBe(1);
  });
});

describe("csvCell", () => {
  it("quotes commas, quotes and line breaks", () => {
    expect(csvCell("plain")).toBe("plain");
    expect(csvCell("a,b")).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell("two\nlines")).toBe('"two\nlines"');
  });
});
