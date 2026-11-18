/**
 * Bulk product import (CSV / Excel): template, column mapping, parsing and
 * validation — the same fields as the Add-product form.
 *
 * Shared by the browser (preview before anything is saved) and the server
 * action (which validates every product again — never trust the client).
 * Rows are checked with the same productSchema as the Add-product form.
 *
 * Variants: rows sharing a `variant_group` become ONE product (its SKU is the
 * group) with one variant per row (size / color / sku / price / stock).
 *
 * Images: `images` / `search_image` cells hold web links (https://…) or local
 * files (C:\photos\a.jpg, photos/a.jpg or a.jpg). Browsers can't read a path
 * from a spreadsheet, so the supplier selects the folder once and local
 * references are matched to those files by file name.
 */
import { parseCustomerCsv } from "@/lib/supplier/customers";
import {
  MAX_PRODUCT_IMAGES,
  MAX_VARIANTS,
  generateSku,
  productSchema,
  productVariantSchema,
  type ProductValues,
} from "@/lib/supplier/products";

/** Template columns, in the Add-product form's order. */
export const IMPORT_COLUMNS = [
  "title",
  "category",
  "sku",
  "hsn_code",
  "gst_rate",
  "carton_units",
  "carton_weight_kg",
  "carton_dimensions",
  "description",
  "mrp",
  "price",
  "unit",
  "negotiable",
  "images",
  "youtube_url",
  "packaging_details",
  "warranty_return",
  "variant_group",
  "size",
  "color",
  "stock",
  "winning_product",
  "hot_selling",
  "seo_title",
  "seo_description",
  "search_image",
  "publish",
] as const;
export type ImportColumn = (typeof IMPORT_COLUMNS)[number];
export type ImportRow = Record<ImportColumn, string>;
export const REQUIRED_COLUMNS = ["title", "category", "description", "price"] as const;

/** Labels as the Add-product form names them (column-mapping screen). */
export const COLUMN_LABELS: Record<ImportColumn, string> = {
  title: "Product title",
  category: "Category",
  sku: "SKU",
  hsn_code: "HSN code",
  gst_rate: "GST rate",
  carton_units: "Units per carton",
  carton_weight_kg: "Carton weight (kg)",
  carton_dimensions: "Carton dimensions",
  description: "Description",
  mrp: "MRP",
  price: "Selling price",
  unit: "Selling unit",
  negotiable: "Price negotiable",
  images: "Product images",
  youtube_url: "YouTube video",
  packaging_details: "Packaging details",
  warranty_return: "Warranty / return",
  variant_group: "Variant group",
  size: "Variant size",
  color: "Variant color",
  stock: "Stock",
  winning_product: "Winning product",
  hot_selling: "Hot selling product",
  seo_title: "SEO title",
  seo_description: "SEO description",
  search_image: "Social preview image",
  publish: "Publish (yes = Save & publish)",
};

/** Rows per file, and products per server request (each may fetch up to 8 images). */
export const MAX_IMPORT_ROWS = 5000;
export const IMPORT_CHUNK_SIZE = 10;

// Common spreadsheet header spellings → our column.
const HEADER_ALIASES: Record<string, ImportColumn> = {
  title: "title", name: "title", "product name": "title", "product title": "title", "item name": "title",
  category: "category", "category name": "category",
  sku: "sku", "seller sku": "sku", "product code": "sku", "item code": "sku",
  hsn: "hsn_code", "hsn code": "hsn_code", hsn_code: "hsn_code",
  gst: "gst_rate", "gst rate": "gst_rate", gst_rate: "gst_rate", "gst %": "gst_rate", "tax rate": "gst_rate",
  "carton units": "carton_units", carton_units: "carton_units", "units per carton": "carton_units",
  "carton weight": "carton_weight_kg", carton_weight_kg: "carton_weight_kg", "carton weight (kg)": "carton_weight_kg", "carton weight kg": "carton_weight_kg",
  "carton dimensions": "carton_dimensions", carton_dimensions: "carton_dimensions", "carton size": "carton_dimensions",
  description: "description", details: "description", "product description": "description",
  mrp: "mrp", "mrp (₹)": "mrp", "mrp (rs)": "mrp", "mrp rs": "mrp",
  price: "price", "selling price": "price", "price per unit": "price", "sale price": "price", rate: "price",
  unit: "unit", "selling unit": "unit", uom: "unit",
  negotiable: "negotiable", "price negotiable": "negotiable",
  images: "images", image: "images", image_urls: "images", "image urls": "images", "image url": "images",
  "product images": "images", photos: "images", "image path": "images", "image paths": "images",
  youtube: "youtube_url", youtube_url: "youtube_url", "youtube url": "youtube_url", "youtube video": "youtube_url", video: "youtube_url",
  packaging: "packaging_details", packaging_details: "packaging_details", "packaging details": "packaging_details",
  warranty: "warranty_return", warranty_return: "warranty_return", "warranty / return": "warranty_return", "warranty/return": "warranty_return",
  variant_group: "variant_group", "variant group": "variant_group", "parent sku": "variant_group", group: "variant_group",
  size: "size", "variant size": "size", color: "color", colour: "color", "variant color": "color",
  stock: "stock", qty: "stock", quantity: "stock", inventory: "stock", "stock qty": "stock",
  winning: "winning_product", winning_product: "winning_product", "winning product": "winning_product",
  hot_selling: "hot_selling", "hot selling": "hot_selling", "hot selling product": "hot_selling",
  seo_title: "seo_title", "seo title": "seo_title", "meta title": "seo_title",
  seo_description: "seo_description", "seo description": "seo_description", "meta description": "seo_description",
  search_image: "search_image", "search image": "search_image", "seo image": "search_image", "social preview image": "search_image",
  publish: "publish", "save & publish": "publish", status: "publish",
};

const EXAMPLE_ROWS: Partial<ImportRow>[] = [
  {
    title: "Self Adhesive Cable Organizer Clip (Pack of 6)",
    category: "Electronics & Accessories",
    sku: "CABLE-ORG-01",
    hsn_code: "3926",
    gst_rate: "18",
    carton_units: "200",
    carton_weight_kg: "6.5",
    carton_dimensions: "40 x 30 x 25 cm",
    description:
      "Keeps charging cables tidy on desks and walls. Strong adhesive, no drilling, fits cables up to 6 mm.",
    mrp: "19",
    price: "7.85",
    unit: "pcs",
    negotiable: "no",
    // Web links and files from your computer can be mixed; separate with |
    images: "https://example.com/clip-1.jpg | C:\\Photos\\clip-2.jpg | clip-3.jpg",
    packaging_details: "Poly bag, 6 clips per pack",
    warranty_return: "7-day return for damaged items",
    stock: "500",
    winning_product: "no",
    hot_selling: "yes",
    publish: "no",
  },
  // Two rows, one product: same variant_group, different size.
  {
    title: "Cotton Round Neck T-Shirt",
    category: "Fashion & Accessories",
    sku: "TSHIRT-01-M",
    description: "Soft 180 GSM combed cotton t-shirt with a regular fit. Pre-shrunk, colour-fast print.",
    mrp: "299",
    price: "149",
    images: "tshirt-front.jpg | tshirt-back.jpg | tshirt-detail.jpg",
    variant_group: "TSHIRT-01",
    size: "M",
    color: "Black",
    stock: "120",
    publish: "yes",
  },
  {
    title: "Cotton Round Neck T-Shirt",
    category: "Fashion & Accessories",
    sku: "TSHIRT-01-L",
    description: "Soft 180 GSM combed cotton t-shirt with a regular fit. Pre-shrunk, colour-fast print.",
    mrp: "299",
    price: "159",
    variant_group: "TSHIRT-01",
    size: "L",
    color: "Black",
    stock: "80",
  },
];

const csvCell = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** Rows of cells → CSV text (Excel-friendly). */
export function toCsv(rows: string[][]): string {
  return rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
}

/** The downloadable template: header row + example rows. */
export function templateCsv(): string {
  return toCsv([[...IMPORT_COLUMNS], ...EXAMPLE_ROWS.map((r) => IMPORT_COLUMNS.map((c) => r[c] ?? ""))]);
}

/** CSV text → table of cells (strips the BOM Excel adds). */
export function csvToTable(text: string): string[][] {
  return parseCustomerCsv(text.replace(/^\uFEFF/, ""));
}

/** Excel cell → text the validators understand. */
export function cellToText(v: unknown): string {
  if (v == null) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "boolean") return v ? "yes" : "no";
  return String(v).trim();
}

/** Best-guess column for each header ("" = ignore). The supplier can change it. */
export function suggestMapping(headers: string[]): (ImportColumn | "")[] {
  const used = new Set<ImportColumn>();
  return headers.map((h) => {
    const col = HEADER_ALIASES[h.trim().toLowerCase()];
    if (!col || used.has(col)) return "";
    used.add(col);
    return col;
  });
}

export function missingRequired(mapping: (ImportColumn | "")[]): ImportColumn[] {
  return REQUIRED_COLUMNS.filter((c) => !mapping.includes(c));
}

/** Table (header + rows) + mapping → rows keyed by our columns. */
export function rowsFromTable(table: string[][], mapping: (ImportColumn | "")[]): ImportRow[] {
  return table.slice(1).map((cells) => {
    const row = Object.fromEntries(IMPORT_COLUMNS.map((c) => [c, ""])) as ImportRow;
    mapping.forEach((col, i) => {
      if (col) row[col] = (cells[i] ?? "").trim();
    });
    return row;
  });
}

/** CSV text → rows using the automatic mapping (template files). */
export function parseImportCsv(text: string): { rows: ImportRow[]; error?: string } {
  const table = csvToTable(text);
  if (table.length < 2) return { rows: [], error: "The file has no product rows under the header." };
  const mapping = suggestMapping(table[0]);
  const missing = missingRequired(mapping);
  if (missing.length) {
    return { rows: [], error: `Missing column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}. Download the template to see the headers.` };
  }
  if (table.length - 1 > MAX_IMPORT_ROWS) {
    return { rows: [], error: `Up to ${MAX_IMPORT_ROWS} rows per file. Split it into smaller files.` };
  }
  return { rows: rowsFromTable(table, mapping) };
}

export type Category = { id: string; name: string };

/** One product to import: a single row, or every row of a variant group. */
export type ImportUnit = { lines: number[]; rows: ImportRow[] };

export type VariantPayload = {
  label: string;
  attrs: Record<string, string>;
  seller_sku: string;
  price: number;
  moq: number | null;
  stock_qty: number;
};

/** A web link the server downloads, or a local file the browser uploads. */
export type ImageRef = { kind: "url"; url: string } | { kind: "file"; name: string };

export type ValidatedUnit =
  | {
      ok: true;
      values: ProductValues;
      images: ImageRef[];
      searchImage: ImageRef | null;
      stock: number;
      variants: VariantPayload[];
      publish: boolean;
    }
  | { ok: false; line: number; message: string };

const norm = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const money = (s: string) => s.replace(/[₹,\s]/g, "");

/** yes/no cell → boolean (blank = no). Anything else is an error. */
export function parseYesNo(raw: string): boolean | null {
  const v = raw.trim().toLowerCase();
  if (["", "no", "n", "false", "0", "draft"].includes(v)) return false;
  if (["yes", "y", "true", "1", "publish", "published"].includes(v)) return true;
  return null;
}

/** "C:\Photos\a.JPG" / "photos/a.jpg" / "a.jpg" → "a.jpg" (lower-case, for matching selected files). */
export function localFileKey(pathOrName: string): string {
  return pathOrName.trim().replace(/^file:\/+/i, "").split(/[\\/]/).pop()!.toLowerCase();
}

/** One image cell → links / local files, or the first bad entry. */
function imageRefs(raw: string): { refs: ImageRef[]; bad?: string } {
  const refs: ImageRef[] = [];
  for (const entry of raw.split(/[|\n]+/).map((u) => u.trim()).filter(Boolean)) {
    if (/^https?:\/\//i.test(entry)) {
      try {
        new URL(entry);
        refs.push({ kind: "url", url: entry });
      } catch {
        return { refs, bad: entry };
      }
    } else if (/^[a-z][a-z0-9+.-]+:\/\//i.test(entry) && !/^file:\/\//i.test(entry)) {
      // ftp://, data://… — only web links and local files are supported.
      return { refs, bad: entry };
    } else if (/\.(jpe?g|png|webp)$/i.test(entry)) {
      refs.push({ kind: "file", name: localFileKey(entry) });
    } else {
      return { refs, bad: entry };
    }
  }
  return { refs };
}

const refKey = (r: ImageRef) => (r.kind === "url" ? r.url : `file:${r.name}`);

/** Rows → products: rows with the same variant_group merge, keeping file order. */
export function groupIntoUnits(rows: { line: number; row: ImportRow }[]): ImportUnit[] {
  const units: ImportUnit[] = [];
  const byGroup = new Map<string, ImportUnit>();
  for (const { line, row } of rows) {
    const key = row.variant_group.trim().toUpperCase();
    const existing = key ? byGroup.get(key) : undefined;
    if (existing) {
      existing.lines.push(line);
      existing.rows.push(row);
      continue;
    }
    const unit = { lines: [line], rows: [row] };
    units.push(unit);
    if (key) byGroup.set(key, unit);
  }
  return units;
}

/** One product (row or variant group) → the values the Add-product form would submit, or the first problem. */
export function validateImportUnit(unit: ImportUnit, categories: Category[]): ValidatedUnit {
  const first = unit.rows[0];
  const fail = (i: number, message: string) => ({ ok: false as const, line: unit.lines[i], message });

  const category = categories.find((c) => norm(c.name) === norm(first.category));
  if (!category) {
    return fail(0, first.category ? `Category "${first.category}" not found.` : "Category is required.");
  }

  const flags: Record<"negotiable" | "winning_product" | "hot_selling" | "publish", boolean> = {
    negotiable: false, winning_product: false, hot_selling: false, publish: false,
  };
  for (const key of Object.keys(flags) as (keyof typeof flags)[]) {
    const value = parseYesNo(first[key]);
    if (value === null) return fail(0, `${key.replace("_", " ")} must be yes or no.`);
    flags[key] = value;
  }

  // Product images: every row of a group may add some (duplicates dropped).
  const images: ImageRef[] = [];
  for (const [i, row] of unit.rows.entries()) {
    const { refs, bad } = imageRefs(row.images);
    if (bad) return fail(i, `Image "${bad}" isn't a web link (https://…) or a .jpg/.png/.webp file.`);
    for (const r of refs) if (!images.some((x) => refKey(x) === refKey(r))) images.push(r);
  }
  if (images.length > MAX_PRODUCT_IMAGES) return fail(0, `Up to ${MAX_PRODUCT_IMAGES} images per product.`);

  const search = imageRefs(first.search_image);
  if (search.bad) return fail(0, `Social preview image "${search.bad}" isn't a web link or an image file.`);
  if (search.refs.length > 1) return fail(0, "Social preview image takes one image.");

  const group = first.variant_group.trim();
  const isGroup = group !== "";

  // Variants: one per row of a group.
  const variants: VariantPayload[] = [];
  if (isGroup) {
    if (unit.rows.length > MAX_VARIANTS) return fail(0, `Up to ${MAX_VARIANTS} variants per product.`);
    const labels = new Set<string>();
    for (const [i, row] of unit.rows.entries()) {
      const attrs: Record<string, string> = {};
      if (row.size) attrs.Size = row.size;
      if (row.color) attrs.Color = row.color;
      const label = [row.size, row.color].filter(Boolean).join(" / ") || row.sku;
      const parsed = productVariantSchema.safeParse({
        label,
        attrs,
        seller_sku: row.sku,
        price: money(row.price),
        stock_qty: row.stock || 0,
      });
      if (!parsed.success) {
        const msg = parsed.error.issues[0]?.message ?? "Check this variant.";
        return fail(i, msg === "Variant label is required." ? "Add a size or color for each variant." : msg);
      }
      if (labels.has(parsed.data.label.toLowerCase())) return fail(i, `Duplicate variant "${parsed.data.label}".`);
      labels.add(parsed.data.label.toLowerCase());
      variants.push({
        label: parsed.data.label,
        attrs: parsed.data.attrs ?? {},
        // The column is required; generated like the Add-product form does when blank.
        seller_sku: parsed.data.seller_sku ? parsed.data.seller_sku.toUpperCase() : generateSku("V"),
        price: parsed.data.price,
        moq: null,
        stock_qty: parsed.data.stock_qty,
      });
    }
  }

  const parsed = productSchema.safeParse({
    title: first.title,
    category_id: category.id,
    // A variant group's SKU is the group; each row's sku belongs to its variant.
    seller_sku: isGroup ? group : first.sku,
    hsn_code: first.hsn_code,
    gst_rate: first.gst_rate.replace(/%$/, ""),
    carton_units: first.carton_units,
    carton_weight_kg: first.carton_weight_kg.replace(/\s*kg$/i, ""),
    carton_dimensions: first.carton_dimensions,
    description: first.description,
    unit: first.unit.toLowerCase(),
    // From-price for a group: its cheapest variant.
    price_per_unit: isGroup ? Math.min(...variants.map((v) => v.price)) : money(first.price),
    mrp: money(first.mrp),
    negotiable: flags.negotiable,
    is_winning: flags.winning_product,
    is_hot_selling: flags.hot_selling,
    packaging_details: first.packaging_details,
    warranty_return: first.warranty_return,
    youtube_url: first.youtube_url,
    seo_title: first.seo_title,
    seo_description: first.seo_description,
  });
  if (!parsed.success) return fail(0, parsed.error.issues[0]?.message ?? "Check this row.");

  const stock = isGroup
    ? variants.reduce((sum, v) => sum + v.stock_qty, 0)
    : Number.parseInt(first.stock || "0", 10);
  if (!Number.isFinite(stock) || stock < 0) return fail(0, "Stock must be a whole number, 0 or more.");

  return {
    ok: true,
    values: parsed.data,
    images,
    searchImage: search.refs[0] ?? null,
    stock,
    variants,
    publish: flags.publish,
  };
}

/** Local file names a validated product needs from the selected folder. */
export function localFilesOf(v: Extract<ValidatedUnit, { ok: true }>): string[] {
  return [...v.images, ...(v.searchImage ? [v.searchImage] : [])].flatMap((r) => (r.kind === "file" ? [r.name] : []));
}

/** Image file name → SKU it belongs to: "SKU123_1.jpg", "SKU123-2.png", "SKU123.webp". */
export function skuFromImageName(fileName: string): string | null {
  const base = fileName.replace(/^.*[\\/]/, "").replace(/\.(jpe?g|png|webp)$/i, "");
  if (base === fileName.replace(/^.*[\\/]/, "")) return null; // not an image extension
  const sku = base.replace(/[_-]\d{1,2}$/, "").trim().toUpperCase();
  return /^[A-Z0-9-_]{3,30}$/.test(sku) ? sku : null;
}

/** Image files → { SKU → files in name order }; unmatched names listed separately. */
export function groupImagesBySku(files: File[]): { bySku: Map<string, File[]>; unmatched: string[] } {
  const bySku = new Map<string, File[]>();
  const unmatched: string[] = [];
  for (const f of [...files].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))) {
    const sku = skuFromImageName(f.name);
    if (!sku) {
      unmatched.push(f.name);
      continue;
    }
    bySku.set(sku, [...(bySku.get(sku) ?? []), f]);
  }
  return { bySku, unmatched };
}
