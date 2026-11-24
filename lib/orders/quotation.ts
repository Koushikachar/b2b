// Order money helpers. New orders have no quotation step; quotations that
// were accepted on older orders still set the amount owed for those orders.

/** Round to 2 decimals (paise) — mirrors SQL round(numeric, 2). */
export function roundRupees(value: number): number {
  return Math.round(value * 100) / 100;
}

type QuotationRef = {
  status: string;
  version: number;
  total: number | string;
};

function quotationList<T extends QuotationRef>(
  rows: T | readonly T[] | null | undefined,
): readonly T[] {
  if (!rows) return [];
  return Array.isArray(rows) ? rows : [rows as T];
}

/** Latest accepted quotation, or null. Relations arrive as arrays from Supabase. */
export function latestAcceptedQuotation<T extends QuotationRef>(
  rows: T | readonly T[] | null | undefined,
): T | null {
  let latest: T | null = null;
  for (const quote of quotationList(rows)) {
    if (quote.status !== "accepted") continue;
    if (!latest || quote.version > latest.version) latest = quote;
  }
  return latest;
}

/**
 * Amount the buyer actually pays for an order: the accepted quotation wins
 * (it carries its own tax), otherwise the order's stored subtotal plus the GST
 * saved at checkout (`orders.gst_amount`); then minus any Direct2Hub wallet
 * credit used at checkout (`orders.wallet_amount`). `subtotal` is already net
 * of any coupon, so the discount is never subtracted again.
 */
export function orderAmount(
  subtotal: number | string,
  quotations?: QuotationRef | readonly QuotationRef[] | null,
  gstAmount: number | string | null = 0,
  walletAmount: number | string | null = 0,
): number {
  const accepted = latestAcceptedQuotation(quotations);
  const gross = accepted
    ? Number(accepted.total)
    : Number(subtotal) + Number(gstAmount ?? 0);
  return roundRupees(Math.max(0, gross - Number(walletAmount ?? 0)));
}

/** Pre-discount item value, for a readable subtotal → discount → total block. */
export function grossItemsTotal(
  netSubtotal: number | string,
  discount: number | string | null | undefined,
): number {
  return Number(netSubtotal) + Number(discount ?? 0);
}
