// Supplier order invoice: a pure model (what the invoice says) and a PDF
// renderer (how it looks). The route handler at
// app/supplier/dashboard/orders/[orderId]/invoice/route.ts loads the order
// under the supplier's own session (RLS) and streams the result.

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { formatDeliveryLine, type DeliverySnapshot } from "@/lib/orders/delivery";
import { grossItemsTotal, orderAmount, roundRupees } from "@/lib/orders/quotation";

export type InvoiceItem = {
  id: string;
  title: string;
  variantLabel: string | null;
  unit: string;
  quantity: number;
  unitPrice: number;
};

export type InvoiceOrder = {
  reference: string;
  createdAt: string;
  /** orders.subtotal: already net of the coupon. */
  subtotal: number;
  discount: number;
  gstAmount: number;
  /** Direct2Hub wallet credit used at checkout (orders.wallet_amount). */
  walletAmount?: number;
  delivery: DeliverySnapshot | null;
  items: InvoiceItem[];
};

/** The accepted quotation, when the order was re-priced by one. */
export type InvoiceQuote = {
  subtotal: number;
  deliveryCharge: number;
  taxAmount: number;
  total: number;
  items: InvoiceItem[];
};

export type InvoiceRow = {
  description: string;
  quantity: string;
  unitPrice: number;
  amount: number;
};

export type InvoiceModel = {
  rows: InvoiceRow[];
  summary: { label: string; amount: number }[];
  total: number;
};

/** The selling company (public.companies). */
export type InvoiceSeller = {
  name: string;
  gstin: string | null;
  /** Company Identification Number, for a registered company. */
  cin?: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
};

export type InvoiceHeader = {
  reference: string;
  createdAt: string;
  storeName: string;
  delivery: DeliverySnapshot | null;
  seller?: InvoiceSeller | null;
};

/** "Sold by" block: only the details the seller has filled in. */
export function sellerLines(seller: InvoiceSeller): string[] {
  const address = [seller.address, seller.city, seller.state, seller.pincode]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(", ");
  return [
    seller.name,
    ...(seller.gstin ? [`GSTIN: ${seller.gstin}`] : []),
    ...(seller.cin ? [`CIN: ${seller.cin}`] : []),
    ...(address ? [address] : []),
  ];
}

const toRow = (item: InvoiceItem): InvoiceRow => ({
  description: item.variantLabel ? `${item.title} — ${item.variantLabel}` : item.title,
  quantity: `${item.quantity} ${item.unit}`,
  unitPrice: Number(item.unitPrice),
  amount: roundRupees(Number(item.unitPrice) * item.quantity),
});

/** What the invoice shows. Same money rules as the order detail page. */
export function buildInvoiceModel(order: InvoiceOrder, quote: InvoiceQuote | null): InvoiceModel {
  const wallet = Number(order.walletAmount ?? 0);
  const summary: InvoiceModel["summary"] = [];
  if (quote) {
    summary.push({ label: "Subtotal", amount: Number(quote.subtotal) });
    if (Number(quote.deliveryCharge) > 0) summary.push({ label: "Delivery", amount: Number(quote.deliveryCharge) });
    if (Number(quote.taxAmount) > 0) summary.push({ label: "GST", amount: Number(quote.taxAmount) });
  } else {
    summary.push({ label: "Subtotal", amount: grossItemsTotal(order.subtotal, order.discount) });
    if (Number(order.discount) > 0) summary.push({ label: "Coupon discount", amount: -Number(order.discount) });
    if (Number(order.gstAmount) > 0) summary.push({ label: "GST", amount: Number(order.gstAmount) });
  }
  if (wallet > 0) summary.push({ label: "Paid from Direct2Hub wallet", amount: -wallet });
  return {
    rows: (quote ? quote.items : order.items).map(toRow),
    summary,
    total: quote
      ? orderAmount(0, { status: "accepted", version: 1, total: quote.total }, 0, wallet)
      : orderAmount(order.subtotal, null, order.gstAmount, wallet),
  };
}

/** "Rs. 12,043.08": the built-in PDF fonts have no ₹ glyph. */
export function formatInr(amount: number): string {
  const sign = amount < 0 ? "-" : "";
  const digits = Math.abs(amount).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${sign}Rs. ${digits}`;
}

/** Download name; only header-safe characters survive. */
export function invoiceFileName(reference: string): string {
  return `invoice-${reference.replace(/[^A-Za-z0-9-]/g, "")}.pdf`;
}

/**
 * Helvetica only encodes WinAnsi. Anything else (Devanagari names, emoji)
 * is dropped rather than crashing the download.
 */
function pdfSafe(text: string): string {
  const cleaned = text
    .replace(/₹/g, "Rs.")
    .replace(/[—–]/g, "-")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || "-";
}

function fit(text: string, font: PDFFont, size: number, width: number): string {
  let out = pdfSafe(text);
  if (font.widthOfTextAtSize(out, size) <= width) return out;
  while (out.length > 1 && font.widthOfTextAtSize(`${out}...`, size) > width) out = out.slice(0, -1);
  return `${out}...`;
}

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of pdfSafe(text).split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (line && font.widthOfTextAtSize(next, size) > width) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.map((l) => fit(l, font, size, width));
}

const PAGE: [number, number] = [595.28, 841.89]; // A4
const M = 40;
const INK = rgb(0.1, 0.1, 0.1);
const MUTED = rgb(0.42, 0.42, 0.42);
const LINE = rgb(0.86, 0.86, 0.86);
const BRAND = rgb(0.96, 0.4, 0.05);

export async function renderInvoicePdf(
  model: InvoiceModel,
  header: InvoiceHeader,
  logo?: { bytes: Uint8Array; type: "png" | "jpg" },
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Invoice ${pdfSafe(header.reference)}`);
  doc.setAuthor("Direct2Hub");
  doc.setCreator("Direct2Hub");
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const image = logo
    ? logo.type === "png"
      ? await doc.embedPng(logo.bytes)
      : await doc.embedJpg(logo.bytes)
    : null;

  const [W, H] = PAGE;
  const right = W - M;
  let page: PDFPage = doc.addPage(PAGE);
  let y = H - M;

  const text = (s: string, x: number, size = 10, f = font, color = INK) =>
    page.drawText(pdfSafe(s), { x, y, size, font: f, color });
  const textRight = (s: string, xRight: number, size = 10, f = font, color = INK) => {
    const safe = pdfSafe(s);
    page.drawText(safe, { x: xRight - f.widthOfTextAtSize(safe, size), y, size, font: f, color });
  };
  const rule = (color = LINE) =>
    page.drawLine({ start: { x: M, y }, end: { x: right, y }, thickness: 0.8, color });

  // Header: brand on the left, invoice number and date on the right.
  const logoSize = 48;
  if (image) {
    page.drawImage(image, { x: M, y: y - logoSize, width: logoSize, height: logoSize });
  }
  const brandX = image ? M + logoSize + 12 : M;
  y -= 18;
  text("Direct2Hub", brandX, 18, bold, BRAND);
  textRight("INVOICE", right, 20, bold);
  y -= 16;
  text(header.storeName, brandX, 10, font, MUTED);
  textRight(`Order no: ${header.reference}`, right, 10);
  y -= 14;
  const date = new Date(header.createdAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
  textRight(`Date: ${date}`, right, 10);
  y = Math.min(y, H - M - logoSize) - 16;
  rule(INK);

  // Bill to (left) and Sold by (right), side by side.
  const half = (right - M) / 2;
  const sellerX = M + half + 10;
  const colWidth = half - 10;
  const d = header.delivery;
  const billTo = d
    ? [d.fullName, d.phone, ...wrap(formatDeliveryLine(d), font, 10, colWidth)]
    : ["No delivery address recorded."];
  const [sellerName, ...sellerRest] = header.seller ? sellerLines(header.seller) : [];
  const soldBy = sellerName
    ? [sellerName, ...sellerRest.flatMap((line) => wrap(line, font, 10, colWidth))]
    : [];
  y -= 18;
  text("BILL TO", M, 9, bold, MUTED);
  if (soldBy.length > 0) text("SOLD BY", sellerX, 9, bold, MUTED);
  for (let i = 0; i < Math.max(billTo.length, soldBy.length); i++) {
    y -= 14;
    if (billTo[i]) text(fit(billTo[i], font, 10, colWidth), M, 10, i === 0 && d ? bold : font);
    if (soldBy[i]) text(fit(soldBy[i], font, 10, colWidth), sellerX, 10, i === 0 ? bold : font);
  }

  // Items table.
  // Right edges for the two money columns, each wide enough for "Rs. 12,34,567.00".
  const col = { qty: M + 250, price: M + 400, amount: right };
  const descWidth = col.qty - M - 12;
  const tableHeader = () => {
    y -= 26;
    text("Item", M, 9, bold, MUTED);
    text("Qty", col.qty, 9, bold, MUTED);
    textRight("Unit price", col.price, 9, bold, MUTED);
    textRight("Amount", col.amount, 9, bold, MUTED);
    y -= 7;
    rule();
  };
  tableHeader();
  for (const row of model.rows) {
    if (y < M + 40) {
      page = doc.addPage(PAGE);
      y = H - M;
      tableHeader();
    }
    y -= 16;
    text(fit(row.description, font, 10, descWidth), M);
    text(fit(row.quantity, font, 10, col.price - col.qty - 90), col.qty);
    textRight(formatInr(row.unitPrice), col.price);
    textRight(formatInr(row.amount), col.amount);
    y -= 6;
    rule();
  }

  // Totals, right-aligned under the amount column.
  if (y < M + 40 + (model.summary.length + 2) * 16) {
    page = doc.addPage(PAGE);
    y = H - M;
  }
  const labelX = col.price - 80;
  for (const line of model.summary) {
    y -= 16;
    text(line.label, labelX, 10, font, MUTED);
    textRight(formatInr(line.amount), right);
  }
  y -= 10;
  page.drawLine({ start: { x: labelX, y }, end: { x: right, y }, thickness: 0.8, color: INK });
  y -= 16;
  text("Total", labelX, 11, bold);
  textRight(formatInr(model.total), right, 11, bold);

  y = M;
  text("Thank you for ordering on Direct2Hub.", M, 9, font, MUTED);

  return doc.save();
}
