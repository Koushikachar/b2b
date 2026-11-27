import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import {
  buildInvoiceModel,
  formatInr,
  invoiceFileName,
  billToLines,
  renderInvoicePdf,
  sellerLines,
  type InvoiceOrder,
} from "../lib/orders/invoice";
import { INVOICE_LOGO_PNG_BASE64 } from "../lib/orders/invoice-logo";

const order: InvoiceOrder = {
  reference: "D2H-100118",
  createdAt: "2026-11-21T11:02:00Z",
  subtotal: 10856,
  discount: 0,
  gstAmount: 1187.08,
  delivery: {
    fullName: "Koushik",
    phone: "9019490821",
    line1: "Hangluru",
    line2: null,
    city: "Vadera Hobli",
    state: "Karnataka",
    pincode: "576200",
    instructions: null,
  },
  items: [
    { id: "i1", title: "Cotton towel", variantLabel: "Blue", unit: "pc", quantity: 100, unitPrice: 54.28 },
    { id: "i2", title: "Steel bottle", variantLabel: null, unit: "pc", quantity: 50, unitPrice: 108.56 },
  ],
};

describe("formatInr", () => {
  it("uses Indian grouping, two decimals and an ASCII prefix the PDF font can draw", () => {
    expect(formatInr(12043.08)).toBe("Rs. 12,043.08");
    expect(formatInr(1234567)).toBe("Rs. 12,34,567.00");
  });
});

describe("invoiceFileName", () => {
  it("names the file after the order reference", () => {
    expect(invoiceFileName("D2H-100118")).toBe("invoice-D2H-100118.pdf");
  });

  it("drops characters that could break the Content-Disposition header", () => {
    expect(invoiceFileName('D2H-1"\r\n;x')).toBe("invoice-D2H-1x.pdf");
  });
});

describe("buildInvoiceModel", () => {
  it("lists every item with its line total", () => {
    const model = buildInvoiceModel(order, null);
    expect(model.rows).toEqual([
      { description: "Cotton towel — Blue", quantity: "100 pc", unitPrice: 54.28, amount: 5428 },
      { description: "Steel bottle", quantity: "50 pc", unitPrice: 108.56, amount: 5428 },
    ]);
  });

  it("shows subtotal, GST and the total the buyer owes", () => {
    const model = buildInvoiceModel(order, null);
    expect(model.summary).toEqual([
      { label: "Subtotal", amount: 10856 },
      { label: "GST", amount: 1187.08 },
    ]);
    expect(model.total).toBe(12043.08);
  });

  it("shows the coupon as its own line and never subtracts it twice", () => {
    const model = buildInvoiceModel({ ...order, subtotal: 9856, discount: 1000, gstAmount: 0 }, null);
    expect(model.summary).toEqual([
      { label: "Subtotal", amount: 10856 },
      { label: "Coupon discount", amount: -1000 },
    ]);
    expect(model.total).toBe(9856);
  });

  it("takes the wallet credit used at checkout off the total", () => {
    const model = buildInvoiceModel({ ...order, walletAmount: 100 }, null);
    expect(model.summary.at(-1)).toEqual({ label: "Paid from Direct2Hub wallet", amount: -100 });
    expect(model.total).toBe(11943.08);
  });

  it("uses the accepted quotation's lines and totals when there is one", () => {
    const model = buildInvoiceModel(order, {
      subtotal: 10000,
      deliveryCharge: 500,
      taxAmount: 1800,
      total: 12300,
      items: [{ id: "q1", title: "Cotton towel", variantLabel: null, unit: "pc", quantity: 100, unitPrice: 100 }],
    });
    expect(model.rows).toHaveLength(1);
    expect(model.summary).toEqual([
      { label: "Subtotal", amount: 10000 },
      { label: "Delivery", amount: 500 },
      { label: "GST", amount: 1800 },
    ]);
    expect(model.total).toBe(12300);
  });
});

describe("billToLines", () => {
  it("adds the buyer's GSTIN and registered name under the delivery address", () => {
    expect(billToLines(order.delivery, { gstin: "29ABCDE1234F1Z5", businessName: "Koushik Traders" })).toEqual([
      "Koushik",
      "9019490821",
      "Hangluru, Vadera Hobli, Karnataka, 576200",
      "Koushik Traders",
      "GSTIN: 29ABCDE1234F1Z5",
    ]);
  });

  it("leaves GST lines out for buyers without a GSTIN", () => {
    expect(billToLines(order.delivery, null)).toEqual(["Koushik", "9019490821", "Hangluru, Vadera Hobli, Karnataka, 576200"]);
  });
});

describe("sellerLines", () => {
  it("shows the seller's business name, GSTIN and address", () => {
    expect(
      sellerLines({
        name: "Shree Traders",
        gstin: "29ABCDE1234F1Z5",
        address: "12 MG Road",
        city: "Bengaluru",
        state: "Karnataka",
        pincode: "560001",
      }),
    ).toEqual(["Shree Traders", "GSTIN: 29ABCDE1234F1Z5", "12 MG Road, Bengaluru, Karnataka, 560001"]);
  });

  it("prints the CIN when the seller has one", () => {
    expect(
      sellerLines({
        name: "DIRECT2HUB PRIVATE LIMITED",
        gstin: null,
        cin: "U46901KA2026PTC231623",
        address: "Shop No. 39-07 & 30-B, P.V.S. Complex, Kundapura, Udupi – 576201, Karnataka, India",
        city: null,
        state: null,
        pincode: null,
      }),
    ).toEqual([
      "DIRECT2HUB PRIVATE LIMITED",
      "CIN: U46901KA2026PTC231623",
      "Shop No. 39-07 & 30-B, P.V.S. Complex, Kundapura, Udupi – 576201, Karnataka, India",
    ]);
  });

  it("leaves out the details a seller has not filled in", () => {
    expect(
      sellerLines({ name: "Shree Traders", gstin: null, address: null, city: "Bengaluru", state: null, pincode: null }),
    ).toEqual(["Shree Traders", "Bengaluru"]);
  });
});

describe("renderInvoicePdf", () => {
  it("produces a valid one-page PDF titled with the order reference", async () => {
    const bytes = await renderInvoicePdf(buildInvoiceModel(order, null), {
      reference: order.reference,
      createdAt: order.createdAt,
      storeName: "Direct2Hub Core",
      delivery: order.delivery,
    });
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
    expect(doc.getTitle()).toBe("Invoice D2H-100118");
  });

  it("embeds the bundled D2H logo", async () => {
    const bytes = await renderInvoicePdf(
      buildInvoiceModel(order, null),
      { reference: order.reference, createdAt: order.createdAt, storeName: "Direct2Hub Core", delivery: order.delivery },
      { bytes: Buffer.from(INVOICE_LOGO_PNG_BASE64, "base64"), type: "png" },
    );
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
  });

  it("continues long orders on further pages", async () => {
    const items = Array.from({ length: 80 }, (_, i) => ({
      id: `i${i}`,
      title: `Item ${i}`,
      variantLabel: null,
      unit: "pc",
      quantity: 1,
      unitPrice: 10,
    }));
    const bytes = await renderInvoicePdf(buildInvoiceModel({ ...order, items }, null), {
      reference: order.reference,
      createdAt: order.createdAt,
      storeName: "Direct2Hub Core",
      delivery: order.delivery,
    });
    expect((await PDFDocument.load(bytes)).getPageCount()).toBeGreaterThan(1);
  });

  it("draws names the standard PDF font cannot encode instead of crashing", async () => {
    const bytes = await renderInvoicePdf(buildInvoiceModel(order, null), {
      reference: order.reference,
      createdAt: order.createdAt,
      storeName: "Direct2Hub Core",
      delivery: { ...order.delivery!, fullName: "कौशिक ₹ Koushik" },
    });
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
  });
});
