import "server-only";

import ExcelJS from "exceljs";
import {
  PRODUCT_IMPORT_COLUMNS,
  PRODUCT_IMPORT_MAX_ROWS,
  mapProductImportTable,
  productImportSampleRow,
  type ImportCategory,
  type ParseProductImportResult,
} from "@/lib/supplier/product-import-sheet";
import { PRODUCT_GST_RATES, PRODUCT_UNITS } from "@/lib/supplier/products";

const PRODUCTS_SHEET = "Products";
const LISTS_SHEET = "Lists";
const INSTRUCTIONS_SHEET = "Instructions";
const LAST_ROW = PRODUCT_IMPORT_MAX_ROWS + 1;

/** Column letters in template order, for validation ranges and formulas. */
const COLUMN = {
  title: "A",
  category: "B",
  seller_sku: "C",
  description: "D",
  hsn_code: "E",
  gst_rate: "F",
  unit: "G",
  price_per_unit: "H",
  mrp: "I",
  moq: "J",
  stock_qty: "K",
  carton_units: "L",
  carton_dimensions: "M",
  carton_weight_kg: "N",
  packaging_details: "O",
  warranty_return: "P",
  youtube_url: "Q",
  seo_title: "R",
  seo_description: "S",
  negotiable: "T",
} as const;

const COLUMN_WIDTH: Record<string, number> = {
  title: 42,
  category: 24,
  seller_sku: 18,
  description: 56,
  hsn_code: 14,
  gst_rate: 12,
  unit: 12,
  price_per_unit: 16,
  mrp: 12,
  moq: 10,
  stock_qty: 12,
  carton_units: 16,
  carton_dimensions: 26,
  carton_weight_kg: 18,
  packaging_details: 36,
  warranty_return: 36,
  youtube_url: 40,
  seo_title: 32,
  seo_description: 50,
  negotiable: 18,
};

/**
 * Build the guided Excel template: named sheet, dropdowns for Category, Unit
 * and GST, numeric/required/format checks, and an instructions sheet. The
 * server still validates every row — the workbook only stops mistakes early.
 */
export async function buildProductImportWorkbook(
  categories: ImportCategory[],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "D2B";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(PRODUCTS_SHEET, {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  sheet.columns = PRODUCT_IMPORT_COLUMNS.map((column) => ({
    header: column.header,
    key: column.field,
    width: COLUMN_WIDTH[column.field] ?? 20,
  }));

  const sample = productImportSampleRow(categories);
  sheet.addRow({
    ...sample,
    gst_rate: Number(sample.gst_rate),
    price_per_unit: Number(sample.price_per_unit),
    mrp: Number(sample.mrp),
    moq: Number(sample.moq),
    stock_qty: Number(sample.stock_qty),
    carton_units: Number(sample.carton_units),
    carton_weight_kg: Number(sample.carton_weight_kg),
  });

  styleHeader(sheet);
  // Keep SKUs and HSN codes exactly as typed (no scientific notation, no
  // dropped leading zeros).
  for (const field of ["seller_sku", "hsn_code", "youtube_url"] as const) {
    sheet.getColumn(field).numFmt = "@";
  }
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: PRODUCT_IMPORT_COLUMNS.length },
  };
  sheet.getRow(2).font = { italic: true, color: { argb: "FF6B7076" } };

  const lists = workbook.addWorksheet(LISTS_SHEET, { state: "hidden" });
  const categoryNames = categories.map((category) => category.name);
  lists.getColumn(1).values = ["Categories", ...categoryNames];
  lists.getColumn(2).values = ["Units", ...PRODUCT_UNITS];
  lists.getColumn(3).values = ["GST", ...PRODUCT_GST_RATES.map(String)];
  lists.getColumn(4).values = ["Negotiable", "Yes", "No"];
  lists.getColumn(1).width = 32;
  lists.getColumn(4).width = 18;

  const categoryLast = Math.max(2, categoryNames.length + 1);
  const unitLast = PRODUCT_UNITS.length + 1;
  const gstLast = PRODUCT_GST_RATES.length + 1;
  const negotiableLast = 3;

  if (categoryNames.length > 0) {
    addListValidation(
      sheet,
      COLUMN.category,
      `'${LISTS_SHEET}'!$A$2:$A$${categoryLast}`,
      "Category",
      "Pick a category from the dropdown.",
      false,
    );
  }
  addListValidation(
    sheet,
    COLUMN.unit,
    `'${LISTS_SHEET}'!$B$2:$B$${unitLast}`,
    "Unit",
    `Pick one of: ${PRODUCT_UNITS.join(", ")}.`,
    true,
  );
  addListValidation(
    sheet,
    COLUMN.gst_rate,
    `'${LISTS_SHEET}'!$C$2:$C$${gstLast}`,
    "GST rate",
    "Pick a GST rate from the dropdown.",
    true,
  );
  addListValidation(
    sheet,
    COLUMN.negotiable,
    `'${LISTS_SHEET}'!$D$2:$D$${negotiableLast}`,
    "Negotiable price",
    "Pick Yes or No.",
    true,
  );

  validations(sheet).add(`${COLUMN.title}2:${COLUMN.title}${LAST_ROW}`, {
    type: "textLength",
    operator: "between",
    formulae: [10, 140],
    allowBlank: false,
    showErrorMessage: true,
    errorTitle: "Product title",
    error: "Use 10 to 140 characters.",
  });
  validations(sheet).add(`${COLUMN.description}2:${COLUMN.description}${LAST_ROW}`, {
    type: "custom",
    formulae: [`LEN($${COLUMN.description}2)>=50`],
    allowBlank: false,
    showErrorMessage: true,
    errorTitle: "Description",
    error: "Add at least 50 characters.",
  });
  validations(sheet).add(`${COLUMN.seller_sku}2:${COLUMN.seller_sku}${LAST_ROW}`, {
    type: "custom",
    formulae: [
      `OR($${COLUMN.seller_sku}2="",AND(LEN($${COLUMN.seller_sku}2)>=3,LEN($${COLUMN.seller_sku}2)<=30))`,
    ],
    allowBlank: true,
    showErrorMessage: true,
    errorTitle: "Seller SKU",
    error: "Use 3 to 30 characters, or leave blank to generate one.",
  });
  validations(sheet).add(`${COLUMN.hsn_code}2:${COLUMN.hsn_code}${LAST_ROW}`, {
    type: "custom",
    formulae: [
      `OR($${COLUMN.hsn_code}2="",AND(LEN($${COLUMN.hsn_code}2)>=4,LEN($${COLUMN.hsn_code}2)<=8,ISNUMBER(--$${COLUMN.hsn_code}2)))`,
    ],
    allowBlank: true,
    showErrorMessage: true,
    errorTitle: "HSN code",
    error: "Use 4 to 8 digits.",
  });
  addNumberValidation(sheet, COLUMN.price_per_unit, "decimal", "greaterThan", [0], false, {
    title: "Price per unit",
    error: "Enter a price greater than 0.",
  });
  addNumberValidation(sheet, COLUMN.mrp, "decimal", "greaterThan", [0], true, {
    title: "MRP",
    error: "Enter a positive amount, or leave blank.",
  });
  addNumberValidation(sheet, COLUMN.moq, "whole", "between", [1, 1000000], true, {
    title: "MOQ",
    error: "Enter a whole number of at least 1, or leave blank.",
  });
  addNumberValidation(sheet, COLUMN.stock_qty, "whole", "between", [0, 100000000], true, {
    title: "Stock qty",
    error: "Enter a whole number of 0 or more, or leave blank.",
  });
  addNumberValidation(sheet, COLUMN.carton_units, "whole", "between", [1, 1000000], true, {
    title: "Units per carton",
    error: "Enter a whole number of at least 1, or leave blank.",
  });
  addNumberValidation(sheet, COLUMN.carton_weight_kg, "decimal", "greaterThan", [0], true, {
    title: "Carton weight",
    error: "Enter a positive weight, or leave blank.",
  });
  for (const [column, max, title] of [
    [COLUMN.carton_dimensions, 100, "Carton dimensions"],
    [COLUMN.packaging_details, 1000, "Packaging details"],
    [COLUMN.warranty_return, 1000, "Warranty or return"],
    [COLUMN.youtube_url, 200, "YouTube URL"],
    [COLUMN.seo_title, 200, "SEO title"],
    [COLUMN.seo_description, 400, "SEO description"],
  ] as const) {
    validations(sheet).add(`${column}2:${column}${LAST_ROW}`, {
      type: "custom",
      formulae: [`LEN($${column}2)<=${max}`],
      allowBlank: true,
      showErrorMessage: true,
      errorTitle: title,
      error: `Use ${max} characters or fewer.`,
    });
  }

  if (categoryNames.length > 0) {
    addRedWhen(
      sheet,
      `${COLUMN.category}2:${COLUMN.category}${LAST_ROW}`,
      `AND($${COLUMN.category}2<>"",COUNTIF('${LISTS_SHEET}'!$A$2:$A$${categoryLast},$${COLUMN.category}2)=0)`,
      1,
    );
  }
  addRedWhen(
    sheet,
    `${COLUMN.title}2:${COLUMN.title}${LAST_ROW}`,
    `AND($${COLUMN.title}2<>"",LEN($${COLUMN.title}2)<10)`,
    2,
  );
  addRedWhen(
    sheet,
    `${COLUMN.price_per_unit}2:${COLUMN.price_per_unit}${LAST_ROW}`,
    `AND($${COLUMN.price_per_unit}2<>"",NOT(ISNUMBER($${COLUMN.price_per_unit}2)))`,
    3,
  );

  addInstructions(workbook);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

/** Read the Products sheet of a filled workbook into import rows. */
export async function parseProductImportWorkbook(
  data: ArrayBuffer | Uint8Array,
): Promise<ParseProductImportResult> {
  const workbook = new ExcelJS.Workbook();
  try {
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    // JSZip (inside ExcelJS) accepts any binary view; its typing only says
    // ArrayBuffer, so the cast keeps the call typed without copying.
    await workbook.xlsx.load(bytes as unknown as ArrayBuffer);
  } catch {
    return {
      ok: false,
      message: "Could not read that Excel file. Download the template and try again.",
    };
  }

  const sheet =
    workbook.getWorksheet(PRODUCTS_SHEET) ?? workbook.worksheets[0] ?? null;
  if (!sheet) return { ok: false, message: "The workbook has no sheets." };

  const table: string[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const cells: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
      cells[columnNumber - 1] = cellText(cell);
    });
    for (let index = 0; index < cells.length; index++) cells[index] ??= "";
    if (cells.some((cell) => cell.trim() !== "")) table.push(cells);
  });

  return mapProductImportTable(table);
}

/**
 * ExcelJS ships `worksheet.dataValidations` at runtime but its type
 * definitions omit it, so this narrow cast keeps the call sites typed.
 */
type ValidationTarget = {
  add(range: string, validation: ExcelJS.DataValidation): void;
};

function validations(sheet: ExcelJS.Worksheet): ValidationTarget {
  return (sheet as unknown as { dataValidations: ValidationTarget })
    .dataValidations;
}

function cellText(cell: ExcelJS.Cell): string {
  const value = cell.value;
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    if ("richText" in value) {
      return value.richText
        .map((part) => part.text)
        .join("")
        .trim();
    }
    if ("text" in value && typeof value.text === "string") return value.text.trim();
    if ("result" in value && value.result !== undefined && value.result !== null) {
      return String(value.result).trim();
    }
  }
  return cell.text?.trim() ?? "";
}

function styleHeader(sheet: ExcelJS.Worksheet) {
  const header = sheet.getRow(1);
  header.height = 28;
  header.font = { bold: true };
  header.alignment = { vertical: "middle" };
  header.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFEFF2F5" },
    };
    cell.border = { bottom: { style: "thin", color: { argb: "FFD9DEE3" } } };
  });
}

function addListValidation(
  sheet: ExcelJS.Worksheet,
  column: string,
  source: string,
  title: string,
  error: string,
  allowBlank: boolean,
) {
  validations(sheet).add(`${column}2:${column}${LAST_ROW}`, {
    type: "list",
    allowBlank,
    formulae: [source],
    showErrorMessage: true,
    errorTitle: title,
    error,
  });
}

function addNumberValidation(
  sheet: ExcelJS.Worksheet,
  column: string,
  type: "decimal" | "whole",
  operator: "greaterThan" | "between",
  formulae: number[],
  allowBlank: boolean,
  message: { title: string; error: string },
) {
  validations(sheet).add(`${column}2:${column}${LAST_ROW}`, {
    type,
    operator,
    formulae,
    allowBlank,
    showErrorMessage: true,
    errorTitle: message.title,
    error: message.error,
  });
}

function addRedWhen(
  sheet: ExcelJS.Worksheet,
  ref: string,
  formula: string,
  priority: number,
) {
  sheet.addConditionalFormatting({
    ref,
    rules: [
      {
        type: "expression",
        priority,
        formulae: [formula],
        style: {
          fill: { type: "pattern", pattern: "solid", bgColor: { argb: "FFFFE4E4" } },
          font: { color: { argb: "FFCF1322" } },
        },
      },
    ],
  });
}

function addInstructions(workbook: ExcelJS.Workbook) {
  const sheet = workbook.addWorksheet(INSTRUCTIONS_SHEET);
  sheet.columns = [{ width: 120 }];
  const lines: [string, boolean][] = [
    ["D2B product import", true],
    ["", false],
    ["1. Fill the Products sheet. Delete the grey sample row.", false],
    [
      "2. Required columns: Product title, Category, Description, Price per unit.",
      false,
    ],
    [
      "3. Optional columns: YouTube URL (watch, youtu.be, embed or shorts link), SEO title, SEO description and Negotiable price (Yes/No).",
      false,
    ],
    [
      "4. Leave SEO title and SEO description blank to generate them from the product title and description.",
      false,
    ],
    [
      "5. Category, Unit, GST rate and Negotiable price have dropdowns. Use them.",
      false,
    ],
    [
      "6. Photos: create a folder named images. Inside it, create one subfolder for each Seller SKU, named exactly like the SKU.",
      false,
    ],
    [
      "7. Put photos in that SKU folder as 1.jpg, 2.jpg, 3.jpg ... up to 8 photos. JPG, PNG and WEBP are accepted; each photo must be under 2 MB.",
      false,
    ],
    [
      "8. Example: images / SKU-001 / 1.jpg   •   images / SKU-001 / 2.jpg   •   images / SKU-002 / 1.jpg",
      false,
    ],
    [
      "9. On the Import products page, choose this workbook and the images folder together. The review step lists any photo that needs fixing before anything is saved.",
      false,
    ],
    [
      "10. Rows with fewer than 3 photos import as drafts. You can publish them after adding photos.",
      false,
    ],
    ["11. Save as .xlsx before uploading.", false],
    ["", false],
    [
      "Excel checks are a guide only. The importer validates every row and every photo again, and the review step shows exactly which rows are ready.",
      false,
    ],
  ];
  lines.forEach(([text, bold]) => {
    const row = sheet.addRow([text]);
    row.getCell(1).alignment = { wrapText: true, vertical: "top" };
    if (bold) row.getCell(1).font = { bold: true, size: 14 };
  });
}
