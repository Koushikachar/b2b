import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import {
  PRODUCT_IMPORT_COLUMNS,
  createCategoryLookup,
  validateProductImportRow,
} from "../lib/supplier/product-import-sheet";
import {
  buildProductImportWorkbook,
  parseProductImportWorkbook,
} from "../lib/supplier/product-import-xlsx";

const CATEGORY = {
  id: "6f4e6d0e-2a7d-4e5f-9d3c-1b2a3c4d5e6f",
  name: "Drinkware",
  slug: "drinkware",
};

async function loadWorkbook(buffer: Buffer): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  return workbook;
}

type ValidationModel = Record<
  string,
  { type: string; formulae?: string[]; allowBlank?: boolean }
>;

function validations(sheet: ExcelJS.Worksheet): ValidationModel {
  return (
    sheet as unknown as { dataValidations: { model: ValidationModel } }
  ).dataValidations.model;
}

describe("buildProductImportWorkbook", () => {
  it("writes the template headers, a sample row and the helper sheets", async () => {
    const workbook = await loadWorkbook(await buildProductImportWorkbook([CATEGORY]));
    const sheet = workbook.getWorksheet("Products");
    expect(sheet).toBeDefined();
    if (!sheet) return;

    const header = sheet.getRow(1);
    const headerValues = header.values as unknown[];
    expect(headerValues.slice(1)).toEqual(
      PRODUCT_IMPORT_COLUMNS.map((column) => column.header),
    );
    expect(sheet.getRow(2).getCell(1).value).toContain("SAMPLE");
    expect(sheet.views[0]?.state).toBe("frozen");
    expect(sheet.autoFilter).toBeTruthy();

    expect(workbook.getWorksheet("Lists")?.state).toBe("hidden");
    expect(workbook.getWorksheet("Instructions")).toBeDefined();
  });

  it("adds dropdowns for category, unit and GST plus numeric checks", async () => {
    const workbook = await loadWorkbook(await buildProductImportWorkbook([CATEGORY]));
    const sheet = workbook.getWorksheet("Products");
    expect(sheet).toBeDefined();
    if (!sheet) return;

    const model = validations(sheet);
    expect(model["B2"]?.type).toBe("list");
    expect(model["B2"]?.formulae?.[0]).toContain("'Lists'!");
    expect(model["G2"]?.type).toBe("list");
    expect(model["F2"]?.type).toBe("list");
    expect(model["T2"]?.type).toBe("list");
    expect(model["H2"]?.type).toBe("decimal");
    expect(model["J2"]?.type).toBe("whole");

    const lists = workbook.getWorksheet("Lists");
    expect(lists?.getCell("A2").value).toBe("Drinkware");
    expect(lists?.getCell("B2").value).toBe("pcs");
    expect(String(lists?.getCell("C2").value)).toBe("0");
    expect(lists?.getCell("D2").value).toBe("Yes");
    expect(lists?.getCell("D3").value).toBe("No");
  });

  it("round-trips its own sample row through the parser and validator", async () => {
    const buffer = await buildProductImportWorkbook([CATEGORY]);
    const parsed = await parseProductImportWorkbook(buffer);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.rows).toHaveLength(1);

    const row = parsed.rows[0];
    expect(row.cells.title).toContain("Steel water bottle");
    expect(row.cells.gst_rate).toBe("18");
    expect(row.cells.price_per_unit).toBe("245");

    const validated = validateProductImportRow(
      row,
      createCategoryLookup([CATEGORY]),
    );
    expect(validated.ok).toBe(true);
  });

  it("has no image column and explains the SKU photo folders", async () => {
    const workbook = await loadWorkbook(await buildProductImportWorkbook([CATEGORY]));
    const sheet = workbook.getWorksheet("Products");
    expect(sheet).toBeDefined();
    if (!sheet) return;

    const header = (sheet.getRow(1).values as unknown[]).slice(1);
    expect(header).not.toContain("Image URLs");

    const instructions = workbook.getWorksheet("Instructions");
    const text = (instructions?.getColumn(1).values as unknown[] | undefined) ?? [];
    expect(text.join(" ")).toMatch(/one subfolder for each Seller SKU/i);
    expect(text.join(" ")).toMatch(/images \/ SKU-001 \/ 1\.jpg/i);
    expect(text.join(" ")).toMatch(/YouTube URL/i);
    expect(text.join(" ")).toMatch(/Negotiable price/i);
  });

  it("rejects bytes that are not a workbook", async () => {
    const parsed = await parseProductImportWorkbook(
      new TextEncoder().encode("not a spreadsheet"),
    );
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.message).toMatch(/could not read/i);
  });
});
