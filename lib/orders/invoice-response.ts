import type { SupabaseClient } from "@supabase/supabase-js";
import type { DeliverySnapshot } from "@/lib/orders/delivery";
import { latestAcceptedQuotation } from "@/lib/orders/quotation";
import {
  buildInvoiceModel,
  invoiceFileName,
  renderInvoicePdf,
  type InvoiceItem,
  type InvoiceSeller,
} from "@/lib/orders/invoice";
import { INVOICE_LOGO_PNG_BASE64 } from "@/lib/orders/invoice-logo";
import { COMPANY } from "@/lib/company";

// Only D2H Core is open for orders today (lib/store-context-types.ts).
const STORE_NAME = "Direct2Hub Core";

const LOGO = { bytes: Buffer.from(INVOICE_LOGO_PNG_BASE64, "base64"), type: "png" as const };

/** Whose invoice: the selling company's, or the buyer's own order. */
export type InvoiceScope = { supplierId: string } | { buyerId: string };

type ItemRow = {
  id: string;
  title: string;
  variant_label: string | null;
  unit: string;
  quantity: number;
  unit_price: number;
};

type SellerRow = { gstin: string | null };

const toItem = (row: ItemRow): InvoiceItem => ({
  id: row.id,
  title: row.title,
  variantLabel: row.variant_label,
  unit: row.unit,
  quantity: Number(row.quantity),
  unitPrice: Number(row.unit_price),
});

const failed = (what: string, code: string | undefined) => {
  console.error(`Invoice ${what} query failed:`, code);
  return new Response("Could not create the invoice", { status: 500 });
};

/**
 * Invoice PDF for one order, read under the caller's own session (RLS) with an
 * explicit owner filter on top. Callers authenticate first; an order outside
 * the scope 404s without confirming it exists.
 */
export async function orderInvoiceResponse(
  supabase: SupabaseClient,
  orderId: string,
  scope: InvoiceScope,
  /** true: save as a file; false: open in the browser's PDF viewer. */
  download = true,
): Promise<Response> {
  const [ownerColumn, ownerId] =
    "supplierId" in scope ? ["supplier_id", scope.supplierId] : ["buyer_id", scope.buyerId];
  const [
    { data: order, error: orderError },
    { data: items, error: itemsError },
    { data: quotations, error: quoteError },
    { data: seller, error: sellerError },
  ] = await Promise.all([
    supabase
      .from("orders")
      .select("id, reference, subtotal, discount, gst_amount, wallet_amount, delivery, created_at")
      .eq("id", orderId)
      .eq(ownerColumn, ownerId)
      .maybeSingle(),
    supabase
      .from("order_items")
      .select("id, title, variant_label, unit, quantity, unit_price")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true }),
    supabase
      .from("quotations")
      .select("id, version, status, subtotal, delivery_charge, tax_amount, total")
      .eq("order_id", orderId),
    // GSTIN only: suppliers read their own company row; buyers read it through
    // the per-order view (no PAN, bank or documents).
    "supplierId" in scope
      ? supabase.from("companies").select("gstin").eq("id", scope.supplierId).maybeSingle()
      : supabase.from("order_supplier_contact").select("gstin").eq("order_id", orderId).maybeSingle(),
  ]);
  const queryError = orderError ?? itemsError ?? quoteError;
  if (queryError) return failed("order", queryError.code);
  // A missing GSTIN never blocks the invoice; it is printed when available.
  if (sellerError) console.error("Invoice seller query failed:", sellerError.code);
  if (!order) return new Response("Not found", { status: 404 });

  const accepted = latestAcceptedQuotation(
    (quotations ?? []) as {
      id: string;
      status: string;
      version: number;
      total: number;
      subtotal: number;
      delivery_charge: number;
      tax_amount: number;
    }[],
  );
  let quote = null;
  if (accepted) {
    const { data: quoteItems, error } = await supabase
      .from("quotation_items")
      .select("id, title, variant_label, unit, quantity, unit_price")
      .eq("quotation_id", accepted.id)
      .order("id", { ascending: true });
    if (error) return failed("quotation items", error.code);
    quote = {
      subtotal: Number(accepted.subtotal),
      deliveryCharge: Number(accepted.delivery_charge),
      taxAmount: Number(accepted.tax_amount),
      total: Number(accepted.total),
      items: ((quoteItems ?? []) as ItemRow[]).map(toItem),
    };
  }

  // Every order is sold by DIRECT2HUB PRIVATE LIMITED (only D2H Core is open):
  // legal name, registered office and CIN come from lib/company.ts; the GSTIN
  // is the one saved on the business profile.
  const sellerRow = sellerError ? null : (seller as SellerRow | null);
  const sellerInfo: InvoiceSeller = {
    name: COMPANY.legalName,
    gstin: sellerRow?.gstin ?? null,
    cin: COMPANY.cin,
    address: COMPANY.office,
    city: null,
    state: null,
    pincode: null,
  };
  const delivery = order.delivery as DeliverySnapshot | null;
  const model = buildInvoiceModel(
    {
      reference: order.reference as string,
      createdAt: order.created_at as string,
      subtotal: Number(order.subtotal),
      discount: Number(order.discount ?? 0),
      gstAmount: Number(order.gst_amount ?? 0),
      walletAmount: Number(order.wallet_amount ?? 0),
      delivery,
      items: ((items ?? []) as ItemRow[]).map(toItem),
    },
    quote,
  );
  const pdf = await renderInvoicePdf(
    model,
    {
      reference: order.reference as string,
      createdAt: order.created_at as string,
      storeName: STORE_NAME,
      delivery,
      seller: sellerInfo,
    },
    LOGO,
  );

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${invoiceFileName(order.reference as string)}"`,
      // Buyer name, phone and address: never cache in shared caches.
      "Cache-Control": "private, no-store",
    },
  });
}
