/**
 * Product bulk import: spreadsheet shape, row mapping and validation.
 *
 * Pure and dependency-light so the import page (client), the preview/import
 * server actions and unit tests all share one implementation. It uses the same
 * `productSchema` as the single-product form, so a spreadsheet row is accepted
 * or rejected on exactly the same rules as a hand-filled form.
 */
import { z } from "zod";
import { parseCsv } from "@/lib/csv";
import {
  MAX_PRODUCT_IMAGE_BYTES,
  MAX_PRODUCT_IMAGES,
  MIN_PRODUCT_IMAGES,
  PRODUCT_UNITS,
  productSchema,
  type ProductValues,
} from "@/lib/supplier/products";

export const PRODUCT_IMPORT_MAX_ROWS = 500;
/** CSV stays small; an .xlsx holds the same rows with formatting. */
export const PRODUCT_IMPORT_MAX_BYTES = 2 * 1024 * 1024;
export const PRODUCT_IMPORT_XLSX_MAX_BYTES = 5 * 1024 * 1024;
/** Rows written per server action; photos are uploaded per product after. */
export const PRODUCT_IMPORT_WRITE_BATCH_SIZE = 5;
/** Photos accepted in one product's folder, matching the product form. */
export const PRODUCT_IMPORT_MAX_PHOTOS = MAX_PRODUCT_IMAGES;
/** Same per-photo cap as the single-product form. */
export const PRODUCT_IMPORT_IMAGE_MAX_BYTES = MAX_PRODUCT_IMAGE_BYTES;

export const PRODUCT_IMPORT_FIELDS = [
  "title",
  "category",
  "seller_sku",
  "description",
  "hsn_code",
  "gst_rate",
  "unit",
  "price_per_unit",
  "mrp",
  "moq",
  "stock_qty",
  "carton_units",
  "carton_dimensions",
  "carton_weight_kg",
  "packaging_details",
  "warranty_return",
  "youtube_url",
  "seo_title",
  "seo_description",
  "negotiable",
] as const;

export type ProductImportField = (typeof PRODUCT_IMPORT_FIELDS)[number];

export type ProductImportColumn = {
  field: ProductImportField;
  header: string;
  required: boolean;
};

/** Template columns, in the order they are written to the CSV. */
export const PRODUCT_IMPORT_COLUMNS: ProductImportColumn[] = [
  { field: "title", header: "Product title", required: true },
  { field: "category", header: "Category", required: true },
  { field: "seller_sku", header: "Seller SKU", required: false },
  { field: "description", header: "Description", required: true },
  { field: "hsn_code", header: "HSN code", required: false },
  { field: "gst_rate", header: "GST rate", required: false },
  { field: "unit", header: "Unit", required: false },
  { field: "price_per_unit", header: "Price per unit", required: true },
  { field: "mrp", header: "MRP", required: false },
  { field: "moq", header: "MOQ", required: false },
  { field: "stock_qty", header: "Stock qty", required: false },
  { field: "carton_units", header: "Units per carton", required: false },
  { field: "carton_dimensions", header: "Carton dimensions", required: false },
  { field: "carton_weight_kg", header: "Carton weight kg", required: false },
  { field: "packaging_details", header: "Packaging details", required: false },
  { field: "warranty_return", header: "Warranty or return", required: false },
  { field: "youtube_url", header: "YouTube URL", required: false },
  { field: "seo_title", header: "SEO title", required: false },
  { field: "seo_description", header: "SEO description", required: false },
  { field: "negotiable", header: "Negotiable price", required: false },
];

const HEADER_ALIASES: Record<string, ProductImportField> = {
  title: "title",
  "product title": "title",
  "product name": "title",
  name: "title",
  category: "category",
  "category name": "category",
  "category slug": "category",
  sku: "seller_sku",
  "seller sku": "seller_sku",
  "seller sku code": "seller_sku",
  "product sku": "seller_sku",
  description: "description",
  "product description": "description",
  hsn: "hsn_code",
  "hsn code": "hsn_code",
  gst: "gst_rate",
  "gst rate": "gst_rate",
  "gst percent": "gst_rate",
  unit: "unit",
  uom: "unit",
  "selling unit": "unit",
  price: "price_per_unit",
  "price per unit": "price_per_unit",
  "selling price": "price_per_unit",
  "unit price": "price_per_unit",
  mrp: "mrp",
  "maximum retail price": "mrp",
  moq: "moq",
  "min order qty": "moq",
  "minimum order quantity": "moq",
  stock: "stock_qty",
  "stock qty": "stock_qty",
  "stock quantity": "stock_qty",
  quantity: "stock_qty",
  "carton units": "carton_units",
  "units per carton": "carton_units",
  "carton dimensions": "carton_dimensions",
  "carton size": "carton_dimensions",
  "carton weight": "carton_weight_kg",
  "carton weight kg": "carton_weight_kg",
  packaging: "packaging_details",
  "packaging details": "packaging_details",
  warranty: "warranty_return",
  "warranty return": "warranty_return",
  "warranty or return": "warranty_return",
  youtube: "youtube_url",
  "youtube url": "youtube_url",
  "youtube link": "youtube_url",
  "video url": "youtube_url",
  "video link": "youtube_url",
  "seo title": "seo_title",
  "meta title": "seo_title",
  "seo description": "seo_description",
  "meta description": "seo_description",
  negotiable: "negotiable",
  "negotiable price": "negotiable",
  "price negotiable": "negotiable",
};

/** Header text normalized for alias matching: case, punctuation and spacing. */
function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export type ProductImportRawRow = {
  /**
   * 1-based row position among non-empty rows, counting the header as row 1.
   * Fully blank CSV rows are skipped, so this can be smaller than the physical
   * spreadsheet line when blank rows sit inside the data.
   */
  line: number;
  cells: Partial<Record<ProductImportField, string>>;
};

export type ParseProductImportResult =
  | { ok: true; rows: ProductImportRawRow[] }
  | { ok: false; message: string };

/** Parse a product CSV into rows keyed by known field names. */
export function parseProductImportCsv(text: string): ParseProductImportResult {
  const clean = text.replace(/^\uFEFF/, "");
  let table: string[][];
  try {
    table = parseCsv(clean);
  } catch {
    return { ok: false, message: "Could not read that file as CSV." };
  }
  return mapProductImportTable(table);
}

/**
 * Map an already-parsed table (CSV or Excel) into import rows. CSV and XLSX
 * share this so both formats accept exactly the same headers and limits.
 */
export function mapProductImportTable(table: string[][]): ParseProductImportResult {
  if (table.length === 0) {
    return { ok: false, message: "The file is empty." };
  }

  const [headerRow, ...dataRows] = table;
  const fieldIndex = new Map<ProductImportField, number>();
  headerRow.forEach((cell, index) => {
    const field = HEADER_ALIASES[normalizeHeader(cell)];
    if (field && !fieldIndex.has(field)) fieldIndex.set(field, index);
  });

  if (fieldIndex.size === 0) {
    return {
      ok: false,
      message:
        "No recognizable columns found. Download the template and keep its header row.",
    };
  }

  const missing = PRODUCT_IMPORT_COLUMNS.filter(
    (column) => column.required && !fieldIndex.has(column.field),
  );
  if (missing.length > 0) {
    return {
      ok: false,
      message: `Missing required column${missing.length === 1 ? "" : "s"}: ${missing
        .map((column) => column.header)
        .join(", ")}. Download the template to get the exact headers.`,
    };
  }

  const rows: ProductImportRawRow[] = [];
  dataRows.forEach((cells, index) => {
    const row: Partial<Record<ProductImportField, string>> = {};
    for (const [field, column] of fieldIndex) {
      row[field] = (cells[column] ?? "").trim();
    }
    if (Object.values(row).every((value) => !value)) return;
    rows.push({ line: index + 2, cells: row });
  });

  if (rows.length === 0) {
    return { ok: false, message: "The file has a header row but no products." };
  }
  if (rows.length > PRODUCT_IMPORT_MAX_ROWS) {
    return {
      ok: false,
      message: `This file has ${rows.length} rows. Import up to ${PRODUCT_IMPORT_MAX_ROWS} at a time and split the rest into another file.`,
    };
  }
  return { ok: true, rows };
}

export type ImportCategory = { id: string; name: string; slug: string };

export type CategoryLookup = {
  idFor(raw: string): string | null;
  nameFor(id: string): string | null;
};

export function createCategoryLookup(
  categories: ImportCategory[],
): CategoryLookup {
  const byKey = new Map<string, string>();
  const names = new Map<string, string>();
  for (const category of categories) {
    names.set(category.id, category.name);
    byKey.set(category.id.toLowerCase(), category.id);
    if (category.name) byKey.set(category.name.trim().toLowerCase(), category.id);
    if (category.slug) byKey.set(category.slug.trim().toLowerCase(), category.id);
  }
  return {
    idFor: (raw) => byKey.get(raw.trim().toLowerCase()) ?? null,
    nameFor: (id) => names.get(id) ?? null,
  };
}

export type ProductImportValues = {
  title: string;
  category_id: string;
  category_name: string;
  seller_sku: string;
  description: string;
  hsn_code: string | null;
  gst_rate: ProductValues["gst_rate"];
  unit: ProductValues["unit"];
  price_per_unit: number;
  mrp: number | null;
  moq: number;
  stock_qty: number;
  carton_units: number | null;
  carton_dimensions: string | null;
  carton_weight_kg: number | null;
  packaging_details: string | null;
  warranty_return: string | null;
  youtube_url: string;
  seo_title: string;
  seo_description: string;
  negotiable: boolean;
};

export type ProductImportRowResult =
  | {
      ok: true;
      line: number;
      title: string;
      sku: string;
      values: ProductImportValues;
      warnings: string[];
    }
  | {
      ok: false;
      line: number;
      title: string;
      sku: string;
      errors: string[];
    };

export type ProductImportReadyRow = Extract<ProductImportRowResult, { ok: true }>;

export type ProductImportFailedRow = {
  line: number;
  title: string;
  message: string;
  kind: "error" | "duplicate";
};

const integerField = (
  raw: string | undefined,
  fallback: number,
  min: number,
  label: string,
): { ok: true; value: number } | { ok: false; message: string } => {
  const value = (raw ?? "").trim();
  if (value === "") return { ok: true, value: fallback };
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min) {
    return { ok: false, message: `${label} must be a whole number of at least ${min}.` };
  }
  return { ok: true, value: parsed };
};

/**
 * Yes/No column. Parsed here instead of through `z.coerce.boolean()` because
 * that turns the string "No"/"false" into true.
 */
const booleanField = (
  raw: string | undefined,
): { ok: true; value: boolean } | { ok: false; message: string } => {
  const value = (raw ?? "").trim().toLowerCase();
  if (value === "" || value === "no" || value === "false" || value === "0" || value === "n") {
    return { ok: true, value: false };
  }
  if (value === "yes" || value === "true" || value === "1" || value === "y") {
    return { ok: true, value: true };
  }
  return {
    ok: false,
    message: 'Negotiable price must be "Yes" or "No".',
  };
};

function firstIssues(error: z.ZodError): string[] {
  const messages: string[] = [];
  for (const issue of error.issues) {
    const field = issue.path[0];
    const label =
      typeof field === "string"
        ? PRODUCT_IMPORT_COLUMNS.find((column) => column.field === field)?.header ??
          field
        : "";
    const message = label ? `${label}: ${issue.message}` : issue.message;
    if (!messages.includes(message)) messages.push(message);
    if (messages.length >= 4) break;
  }
  return messages;
}

/** Validate one parsed row against the same schema the product form uses. */
export function validateProductImportRow(
  row: ProductImportRawRow,
  categories: CategoryLookup,
): ProductImportRowResult {
  const cells = row.cells;
  const title = (cells.title ?? "").trim();
  const rawCategory = (cells.category ?? "").trim();
  const categoryId = rawCategory ? categories.idFor(rawCategory) : null;
  const sku = (cells.seller_sku ?? "").trim().toUpperCase();
  const errors: string[] = [];

  if (!rawCategory) {
    errors.push("Category is required.");
  } else if (!categoryId) {
    errors.push(
      `Category "${rawCategory}" was not found. Use a name from the template's category list.`,
    );
  }

  const moq = integerField(cells.moq, 1, 1, "MOQ");
  if (!moq.ok) errors.push(moq.message);
  const stock = integerField(cells.stock_qty, 0, 0, "Stock qty");
  if (!stock.ok) errors.push(stock.message);
  const negotiable = booleanField(cells.negotiable);
  if (!negotiable.ok) errors.push(negotiable.message);

  const parsed = productSchema.safeParse({
    title,
    category_id: categoryId ?? "",
    seller_sku: sku,
    hsn_code: cells.hsn_code ?? "",
    gst_rate: cells.gst_rate ?? "",
    carton_units: cells.carton_units ?? "",
    carton_dimensions: cells.carton_dimensions ?? "",
    carton_weight_kg: cells.carton_weight_kg ?? "",
    description: cells.description ?? "",
    unit: cells.unit ?? "",
    price_per_unit: cells.price_per_unit ?? "",
    mrp: cells.mrp ?? "",
    negotiable: negotiable.ok ? negotiable.value : false,
    is_winning: false,
    is_hot_selling: false,
    packaging_details: cells.packaging_details ?? "",
    warranty_return: cells.warranty_return ?? "",
    youtube_url: cells.youtube_url ?? "",
    seo_title: cells.seo_title ?? "",
    seo_description: cells.seo_description ?? "",
  });

  if (!parsed.success) {
    errors.push(...firstIssues(parsed.error));
  }

  const displayTitle = title || "(untitled row)";
  if (
    errors.length > 0 ||
    !parsed.success ||
    !categoryId ||
    !moq.ok ||
    !stock.ok ||
    !negotiable.ok
  ) {
    return {
      ok: false,
      line: row.line,
      title: displayTitle,
      sku,
      errors: Array.from(new Set(errors)),
    };
  }

  const data = parsed.data;
  // Image warnings depend on the photos folder, so the preview adds them once
  // it knows how many photos each SKU folder holds.
  const warnings: string[] = [];

  return {
    ok: true,
    line: row.line,
    title: displayTitle,
    sku,
    warnings,
    values: {
      title: data.title,
      category_id: categoryId,
      category_name: categories.nameFor(categoryId) ?? rawCategory,
      seller_sku: data.seller_sku ? data.seller_sku.toUpperCase() : "",
      description: data.description,
      hsn_code: data.hsn_code ? data.hsn_code : null,
      gst_rate: data.gst_rate,
      unit: data.unit,
      price_per_unit: data.price_per_unit,
      mrp: data.mrp,
      moq: moq.value,
      stock_qty: stock.value,
      carton_units: data.carton_units,
      carton_dimensions: data.carton_dimensions?.trim() ? data.carton_dimensions.trim() : null,
      carton_weight_kg: data.carton_weight_kg,
      packaging_details: data.packaging_details?.trim() ? data.packaging_details.trim() : null,
      warranty_return: data.warranty_return?.trim() ? data.warranty_return.trim() : null,
      youtube_url: data.youtube_url.trim(),
      seo_title: data.seo_title.trim(),
      seo_description: data.seo_description.trim(),
      negotiable: data.negotiable,
    },
  };
}

/**
 * Validate every parsed row and mark SKUs that already exist or repeat in the
 * file. Shared by the preview and the import so both agree on what is ready.
 */
export function validateProductImportRows(
  rows: ProductImportRawRow[],
  categories: CategoryLookup,
  existing: Set<string>,
): { ready: ProductImportReadyRow[]; failed: ProductImportFailedRow[] } {
  const ready: ProductImportReadyRow[] = [];
  const failed: ProductImportFailedRow[] = [];
  const usedSkus = new Set(existing);

  for (const row of rows) {
    const validated = validateProductImportRow(row, categories);
    if (!validated.ok) {
      failed.push({
        line: validated.line,
        title: validated.title,
        message: validated.errors.join(" "),
        kind: "error",
      });
      continue;
    }
    const sku = validated.sku;
    if (sku && usedSkus.has(sku)) {
      failed.push({
        line: validated.line,
        title: validated.title,
        message: existing.has(sku)
          ? `SKU ${sku} already exists in your catalogue.`
          : `SKU ${sku} appears more than once in this file.`,
        kind: "duplicate",
      });
      continue;
    }
    if (sku) usedSkus.add(sku);
    ready.push(validated);
  }

  return { ready, failed };
}

/** Quote one CSV cell when it contains a comma, quote or line break. */
export function csvCell(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** One clearly-labelled example row shared by the CSV and Excel templates. */
export function productImportSampleRow(
  categories: ImportCategory[],
): Record<ProductImportField, string> {
  return {
    title: "SAMPLE — delete this row — Steel water bottle 1 L",
    category: categories[0]?.name ?? "Drinkware",
    seller_sku: "SKU-001",
    description:
      "Single-wall stainless steel water bottle with a leak-proof cap. Delete this sample row before importing.",
    hsn_code: "73239390",
    gst_rate: "18",
    unit: "pcs",
    price_per_unit: "245",
    mrp: "399",
    moq: "12",
    stock_qty: "100",
    carton_units: "24",
    carton_dimensions: "50 x 40 x 30 cm",
    carton_weight_kg: "12.5",
    packaging_details: "Each bottle in a poly bag; 24 per carton.",
    warranty_return: "7-day replacement for manufacturing defects.",
    youtube_url: "",
    seo_title: "",
    seo_description: "",
    negotiable: "No",
  };
}

/** Template CSV: exact headers plus one clearly-labelled sample row. */
export function buildProductImportTemplate(categories: ImportCategory[]): string {
  const sample = productImportSampleRow(categories);
  const header = PRODUCT_IMPORT_COLUMNS.map((column) =>
    csvCell(column.header),
  ).join(",");
  const row = PRODUCT_IMPORT_COLUMNS.map((column) =>
    csvCell(sample[column.field]),
  ).join(",");
  return `${header}\r\n${row}\r\n`;
}

/** Units accepted in the Unit column, for the import help text. */
export const PRODUCT_IMPORT_UNITS_LABEL = PRODUCT_UNITS.join(", ");

/* ------------------------------------------------------------------ */
/* Photos folder                                                       */
/* ------------------------------------------------------------------ */

/** One photo selected from the supplier's `images` folder. */
export type ProductImportImageEntry = {
  /** Path inside the chosen folder, e.g. `SKU-001/1.jpg`. */
  relativePath: string;
  /** Bytes, as reported by the browser. Final upload re-checks the file. */
  size: number;
  /** Browser-reported MIME type (untrusted; upload sniffs the bytes). */
  type?: string;
};

export type ImportImageGroup<T> = { sku: string; files: T[] };

export type GroupImportImagesResult<T> = {
  /** Photos grouped by uppercase SKU folder name. */
  folders: ImportImageGroup<T>[];
  /** Photos that sit outside every SKU folder. */
  loose: string[];
  /** Non-photo files that will be skipped. */
  ignored: string[];
};

const IMAGE_EXTENSION_RE = /\.(jpe?g|png|webp)$/i;
const IGNORED_BASENAMES = new Set(["thumbs.db", "desktop.ini", ".ds_store"]);

function fileNameOf(path: string): string {
  const parts = path.split("/");
  return parts[parts.length - 1] ?? "";
}

/** True when a path is a photo the importer can compress and upload. */
export function isImportableImagePath(path: string): boolean {
  const name = fileNameOf(path).trim();
  if (!name || name.startsWith(".") || IGNORED_BASENAMES.has(name.toLowerCase())) {
    return false;
  }
  return IMAGE_EXTENSION_RE.test(name);
}

/**
 * The SKU folder a photo belongs to: the immediate parent folder name.
 * `images/SKU-001/1.jpg` and `SKU-001/1.jpg` both give `SKU-001`; a photo at
 * the top of the chosen folder gives null.
 */
export function importImageFolderName(path: string): string | null {
  const parts = path.replace(/\\/g, "/").split("/").filter(Boolean);
  if (parts.length < 2) return null;
  const folder = (parts[parts.length - 2] ?? "").trim();
  return folder ? folder : null;
}

/**
 * Drop the main `images` folder from the path before looking for the SKU
 * folder, so `images/1.jpg` is treated as a loose photo rather than a folder
 * named "images". Selecting a SKU folder directly still works.
 */
function withoutRootFolder(path: string): string {
  const parts = path.split("/").filter(Boolean);
  if (parts.length > 1 && parts[0].toLowerCase() === "images") {
    return parts.slice(1).join("/");
  }
  return path;
}

/** `1.jpg`, `2.jpg`, `10.jpg` order; names without numbers sort by name. */
export function compareImportImagePaths(a: string, b: string): number {
  const numberIn = (path: string): number => {
    const stem = fileNameOf(path).replace(/\.[^.]+$/, "");
    const match = stem.match(/\d+/);
    return match ? Number(match[0]) : Number.POSITIVE_INFINITY;
  };
  const left = numberIn(a);
  const right = numberIn(b);
  if (left !== right) return left < right ? -1 : 1;
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

/**
 * Group selected files by their SKU folder. Shared by the browser (to send a
 * manifest and later upload the matching files) and the server (to validate
 * folder names, counts and sizes before anything is written).
 */
export function groupImportImages<T extends { relativePath: string }>(
  entries: T[],
): GroupImportImagesResult<T> {
  const seen = new Set<string>();
  const folders = new Map<string, T[]>();
  const loose: string[] = [];
  const ignored: string[] = [];

  for (const entry of entries) {
    const path = (entry.relativePath ?? "")
      .replace(/\\/g, "/")
      .replace(/^(\.\/)+/, "")
      .trim();
    if (!path || seen.has(path)) continue;
    seen.add(path);

    if (!isImportableImagePath(path)) {
      ignored.push(path);
      continue;
    }

    const folder = importImageFolderName(withoutRootFolder(path));
    if (!folder) {
      loose.push(path);
      continue;
    }

    const sku = folder.toUpperCase();
    const list = folders.get(sku) ?? [];
    list.push(entry);
    folders.set(sku, list);
  }

  return {
    folders: [...folders.entries()]
      .map(([sku, files]) => ({
        sku,
        files: [...files].sort((a, b) =>
          compareImportImagePaths(a.relativePath, b.relativePath),
        ),
      }))
      .sort((a, b) => a.sku.localeCompare(b.sku)),
    loose: loose.sort(compareImportImagePaths),
    ignored: ignored.sort(),
  };
}

export type ImportImageCheck = {
  folders: ImportImageGroup<ProductImportImageEntry>[];
  /** Blocking problems, keyed by uppercase SKU. */
  errorsBySku: Map<string, string[]>;
  /** Advisory notes about skipped files or folders that match no row. */
  notes: string[];
};

const MAX_LISTED = 4;

function listPaths(paths: string[]): string {
  if (paths.length <= MAX_LISTED) return paths.join(", ");
  return `${paths.slice(0, MAX_LISTED).join(", ")} and ${paths.length - MAX_LISTED} more`;
}

function megabytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Check the selected photos against the SKUs declared in the sheet. Anything
 * that would silently lose a photo is reported here so the supplier can fix it
 * before the import is allowed.
 */
export function checkImportImages(
  entries: ProductImportImageEntry[],
  declaredSkus: Set<string>,
): ImportImageCheck {
  const grouped = groupImportImages(
    entries.filter(
      (entry) =>
        typeof entry?.relativePath === "string" &&
        Number.isFinite(entry.size) &&
        entry.size >= 0,
    ),
  );
  const notes: string[] = [];
  const errorsBySku = new Map<string, string[]>();

  if (grouped.ignored.length > 0) {
    notes.push(
      `Skipped ${grouped.ignored.length} file${grouped.ignored.length === 1 ? "" : "s"} that ${
        grouped.ignored.length === 1 ? "is" : "are"
      } not JPG, PNG or WEBP photos: ${listPaths(grouped.ignored)}.`,
    );
  }

  if (grouped.loose.length > 0) {
    notes.push(
      `${grouped.loose.length} photo${grouped.loose.length === 1 ? "" : "s"} sit outside a SKU folder: ${listPaths(grouped.loose)}. Move each one into a folder named after its SKU, like SKU-001/1.jpg.`,
    );
  }

  for (const folder of grouped.folders) {
    if (!declaredSkus.has(folder.sku)) {
      notes.push(
        `Folder "${folder.sku}" matches no Seller SKU in the sheet, so its ${folder.files.length} photo${folder.files.length === 1 ? "" : "s"} will be skipped. Rename it to a SKU from the Excel file or remove it.`,
      );
      continue;
    }

    const errors: string[] = [];
    const oversized = folder.files.filter(
      (file) => file.size > PRODUCT_IMPORT_IMAGE_MAX_BYTES,
    );
    if (oversized.length > 0) {
      errors.push(
        ...oversized.map(
          (file) =>
            `${file.relativePath} is ${megabytes(file.size)}. Each photo must be under 2 MB — resize or re-save it, then select the folder again.`,
        ),
      );
    }

    if (folder.files.length > PRODUCT_IMPORT_MAX_PHOTOS) {
      const extras = folder.files
        .slice(PRODUCT_IMPORT_MAX_PHOTOS)
        .map((file) => file.relativePath);
      errors.push(
        `Folder "${folder.sku}" has ${folder.files.length} photos, but a product can have ${PRODUCT_IMPORT_MAX_PHOTOS}. Remove ${listPaths(extras)}.`,
      );
    }

    if (errors.length > 0) errorsBySku.set(folder.sku, errors);
  }

  return { folders: grouped.folders, errorsBySku, notes };
}

/**
 * Image warnings for a final image count. The product form needs three images
 * before publishing, so the preview and importer say so once they know how many
 * photos a row actually has.
 */
export function imageWarnings(count: number): string[] {
  if (count <= 0) {
    return ["No photos yet — imports as a draft you can finish later."];
  }
  if (count < MIN_PRODUCT_IMAGES) {
    const missing = MIN_PRODUCT_IMAGES - count;
    return [
      `Needs ${missing} more photo${missing === 1 ? "" : "s"} before it can be published.`,
    ];
  }
  return [];
}

export type ProductImportPreviewRow = {
  line: number;
  title: string;
  sku: string;
  status: "ready" | "error" | "duplicate";
  message: string;
  warnings: string[];
  /** Photos that will be attached from the SKU folder. */
  images: number;
};

export type ProductImportPreview =
  | {
      ok: true;
      rows: ProductImportPreviewRow[];
      summary: {
        ready: number;
        errors: number;
        duplicates: number;
        images: number;
      };
      /** Advisory notes about skipped files or folders that matched no row. */
      imageNotes: string[];
    }
  | { ok: false; message: string };

/**
 * Build the review table: validate rows, match photos by SKU, and attach
 * blocking photo problems to the row they affect. Skipped files and unmatched
 * folders become non-blocking notes.
 */
export function buildProductImportPreview({
  rows,
  categories,
  existing,
  images,
}: {
  rows: ProductImportRawRow[];
  categories: ImportCategory[];
  existing: Set<string>;
  images: ProductImportImageEntry[];
}): Extract<ProductImportPreview, { ok: true }> {
  const declaredSkus = new Set(
    rows
      .map((row) => (row.cells.seller_sku ?? "").trim().toUpperCase())
      .filter(Boolean),
  );
  const imageCheck = checkImportImages(images, declaredSkus);
  const folderBySku = new Map(imageCheck.folders.map((folder) => [folder.sku, folder]));

  const { ready, failed } = validateProductImportRows(
    rows,
    createCategoryLookup(categories),
    existing,
  );
  const readyByLine = new Map(ready.map((row) => [row.line, row]));
  const failedByLine = new Map(failed.map((row) => [row.line, row]));

  const previewRows: ProductImportPreviewRow[] = rows.map((row) => {
    const ok = readyByLine.get(row.line);
    if (ok) {
      const folderErrors = ok.sku ? imageCheck.errorsBySku.get(ok.sku) : undefined;
      if (folderErrors && folderErrors.length > 0) {
        return {
          line: row.line,
          title: ok.title,
          sku: ok.sku,
          status: "error" as const,
          message: folderErrors.join("\n"),
          warnings: ok.warnings,
          images: 0,
        };
      }

      const images = ok.sku ? (folderBySku.get(ok.sku)?.files.length ?? 0) : 0;
      return {
        line: row.line,
        title: ok.title,
        sku: ok.sku,
        status: "ready" as const,
        message: "",
        warnings: [
          ...ok.warnings,
          ...(ok.sku
            ? []
            : [
                "Add a Seller SKU so photos in the images folder can be matched to this row.",
              ]),
          ...imageWarnings(images),
        ],
        images,
      };
    }
    const bad = failedByLine.get(row.line);
    return {
      line: row.line,
      title: bad?.title ?? "(untitled row)",
      sku: (row.cells.seller_sku ?? "").trim().toUpperCase(),
      status: bad?.kind ?? ("error" as const),
      message: bad?.message ?? "This row could not be checked.",
      warnings: [],
      images: 0,
    };
  });

  return {
    ok: true,
    rows: previewRows,
    summary: {
      ready: previewRows.filter((row) => row.status === "ready").length,
      errors: previewRows.filter((row) => row.status === "error").length,
      duplicates: previewRows.filter((row) => row.status === "duplicate").length,
      images: previewRows
        .filter((row) => row.status === "ready")
        .reduce((total, row) => total + row.images, 0),
    },
    imageNotes: imageCheck.notes,
  };
}

/** Result of reading an uploaded .xlsx/.csv on the server. */
export type ProductImportFilePreview =
  | {
      ok: true;
      rows: ProductImportRawRow[];
      preview: Extract<ProductImportPreview, { ok: true }>;
    }
  | { ok: false; message: string };

export type ProductImportBatchResult =
  | {
      ok: true;
      created: {
        line: number;
        title: string;
        sku: string;
        productId: string;
        warnings: string[];
      }[];
      failed: { line: number; title: string; message: string }[];
    }
  | { ok: false; message: string };

/** Result of attaching one product's photos after its row was created. */
export type ProductImportImagesResult =
  | {
      ok: true;
      productId: string;
      attached: number;
      published: boolean;
      warnings: string[];
    }
  | { ok: false; message: string };
