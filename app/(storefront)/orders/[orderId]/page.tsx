import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  Download01Icon,
  File01Icon,
  TruckDeliveryIcon,
  ViewIcon,
  WhatsappIcon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { OrderItems } from "@/components/orders/order-items";
import { CopyButton } from "@/components/orders/copy-button";
import { OrderLiveRefresh } from "@/components/orders/order-live-refresh";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";
import { formatRupees } from "@/lib/format";
import { COMPANY } from "@/lib/company";
import { parseOrderStatus } from "@/lib/orders/lifecycle";
import { getOrderItemImages } from "@/lib/orders/item-images";
import {
  grossItemsTotal,
  latestAcceptedQuotation,
  orderAmount,
} from "@/lib/orders/quotation";
import type { DeliverySnapshot } from "@/lib/orders/delivery";
import { d2hWhatsappLink } from "@/lib/orders/whatsapp-link";
import { BuyerOrderFlow } from "./buyer-order-flow";

export const metadata: Metadata = { title: "Order details" };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const dateTime = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Kolkata",
});

const formatDateTime = (value: string | null) => (value ? dateTime.format(new Date(value)) : "");

/** Buyer-facing phrasing for the immutable event trail. */
function eventLabel(event: { event: string; data: Record<string, unknown> }): string {
  switch (event.event) {
    case "order_created":
      return "You placed this order";
    case "status_changed": {
      const to = String(event.data.to);
      switch (to) {
        case "confirmed":
          return "Order reviewed and accepted";
        case "processing":
          return "Order is being packed";
        case "shipped":
          return "Order shipped";
        case "delivered":
          return "Order delivered";
        case "cancelled":
          return "Order cancelled";
        case "new":
          return "Order under review";
        case "quoted":
          return "Quotation sent";
        default:
          return `Status: ${to}`;
      }
    }
    case "payment_status_changed": {
      const to = String(event.data.to);
      if (to === "paid") return "Payment received";
      if (to === "pending") return "Payment awaiting";
      return "Payment status updated";
    }
    case "order_cancelled":
      return event.data.reason ? `Order cancelled — ${String(event.data.reason)}` : "Order cancelled";
    case "step_undone":
    case "step_redone":
      return "Order update corrected";
    case "quotation_created":
      return `Quotation v${String(event.data.version)} sent`;
    case "quotation_accepted":
      return `You accepted quotation v${String(event.data.version)}`;
    case "quotation_rejected":
      return `You rejected quotation v${String(event.data.version)}`;
    default:
      return event.event;
  }
}

type OrderRow = {
  id: string;
  reference: string;
  status: string;
  payment_status: string;
  subtotal: number;
  discount: number;
  /** GST saved at checkout (0 on orders placed before GST was stored). */
  gst_amount: number;
  /** Direct2Hub wallet credit used at checkout. */
  wallet_amount: number;
  delivery: DeliverySnapshot | null;
  buyer_note: string | null;
  rejection_reason: string | null;
  carrier: string | null;
  tracking_ref: string | null;
  shipment_notes: string | null;
  shipped_at: string | null;
  created_at: string;
};

type ItemRow = {
  id: string;
  product_id: string | null;
  title: string;
  variant_label: string | null;
  unit: string;
  quantity: number;
  unit_price: number;
};

/** Only accepted quotations on older orders still matter (they set the total). */
type QuotationRow = {
  version: number;
  status: string;
  tax_amount: number;
  total: number;
};

export default async function BuyerOrderPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  if (!UUID_RE.test(orderId)) {
    notFound();
  }

  const supabase = await createClient();
  const user = await getSessionUser(supabase);
  if (!user) {
    redirect(`/auth/login?next=/orders/${orderId}`);
  }

  // RLS scopes orders to their buyer; the explicit filter keeps intent clear.
  const [{ data: order }, { data: items }, { data: quotations }, { data: events }] =
    await Promise.all([
      supabase
        .from("orders")
        .select(
          "id, reference, status, payment_status, subtotal, discount, gst_amount, wallet_amount, delivery, buyer_note, rejection_reason, carrier, tracking_ref, shipment_notes, shipped_at, created_at",
        )
        .eq("id", orderId)
        .eq("buyer_id", user.id)
        .maybeSingle(),
      supabase
        .from("order_items")
        .select("id, product_id, title, variant_label, unit, quantity, unit_price")
        .eq("order_id", orderId)
        .order("created_at", { ascending: true }),
      supabase
        .from("quotations")
        .select("version, status, tax_amount, total")
        .eq("order_id", orderId)
        .eq("status", "accepted"),
      supabase
        .from("order_events")
        .select("id, event, data, created_at")
        .eq("order_id", orderId)
        .order("created_at", { ascending: true }),
    ]);
  if (!order) {
    notFound();
  }
  const orderRow = order as unknown as OrderRow;
  const status = parseOrderStatus(orderRow.status) ?? "new";
  const paid = orderRow.payment_status === "paid";
  const delivery = orderRow.delivery;

  const orderItems = (items ?? []) as unknown as ItemRow[];
  const itemImages = await getOrderItemImages(
    supabase,
    orderItems.map((item) => item.product_id),
  );

  const acceptedQuote = latestAcceptedQuotation((quotations ?? []) as unknown as QuotationRow[]);
  const itemsTotal = grossItemsTotal(orderRow.subtotal, orderRow.discount);
  const walletUsed = Number(orderRow.wallet_amount ?? 0);
  const totalAmount = orderAmount(orderRow.subtotal, acceptedQuote, orderRow.gst_amount, walletUsed);
  const gst = acceptedQuote ? Number(acceptedQuote.tax_amount) : Number(orderRow.gst_amount);
  // Only while the order is actually shipped: an undone shipment keeps its
  // carrier/tracking columns, which must not reappear as a live shipment.
  const hasShipment =
    (orderRow.status === "shipped" || orderRow.status === "delivered") &&
    Boolean(orderRow.carrier || orderRow.tracking_ref || orderRow.shipment_notes || orderRow.shipped_at);
  const invoiceHref = `/orders/${orderRow.id}/invoice`;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-5">
      {/* Header ----------------------------------------------------------------- */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button render={<Link href="/orders" />} nativeButton={false} variant="outline" size="sm">
            <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
            My Orders
          </Button>
          <h1 className="font-mono text-lg font-bold tracking-tight md:text-xl">
            {orderRow.reference}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status="order" value={orderRow.status} />
          {paid ? <StatusBadge status="payment" value={orderRow.payment_status} /> : null}
        </div>
      </div>

      <OrderLiveRefresh orderId={orderRow.id} />
      <BuyerOrderFlow status={status} paid={paid} cancelledReason={orderRow.rejection_reason} />

      {/* Shipment ----------------------------------------------------------------- */}
      {hasShipment ? (
        <Card className="rounded-lg p-4">
          <div className="flex items-center gap-2">
            <HugeiconsIcon icon={TruckDeliveryIcon} strokeWidth={2} className="size-4" />
            <p className="text-sm font-semibold">Shipment</p>
          </div>
          <div className="mt-2 space-y-1 text-sm text-muted-foreground">
            {orderRow.shipped_at ? <p>Shipped on {formatDateTime(orderRow.shipped_at)}</p> : null}
            {orderRow.carrier ? <p>Carrier: {orderRow.carrier}</p> : null}
            {orderRow.tracking_ref ? (
              <p className="flex items-center gap-1">
                Tracking number:{" "}
                <span className="font-mono text-foreground">{orderRow.tracking_ref}</span>
                <CopyButton value={orderRow.tracking_ref} label="tracking number" />
              </p>
            ) : null}
            {orderRow.shipment_notes ? <p>{orderRow.shipment_notes}</p> : null}
          </div>
        </Card>
      ) : null}

      {/* Supplier + invoice -------------------------------------------------------- */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="rounded-lg p-4">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Supplier</p>
          <p className="mt-1 text-sm font-semibold">{COMPANY.legalName}</p>
          <Button
            render={
              <a
                href={d2hWhatsappLink({ orderReference: orderRow.reference })}
                target="_blank"
                rel="noopener noreferrer"
              />
            }
            nativeButton={false}
            variant="outline"
            size="sm"
            className="mt-3"
          >
            <HugeiconsIcon icon={WhatsappIcon} strokeWidth={2} />
            Message on WhatsApp
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            Opens WhatsApp with your order number {orderRow.reference} — no address or prices are shared.
          </p>
        </Card>

        <Card className="rounded-lg p-4">
          <div className="flex items-center gap-2">
            <HugeiconsIcon icon={File01Icon} strokeWidth={2} className="size-4 text-primary" />
            <p className="text-sm font-semibold">Invoice {orderRow.reference}</p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Sold by {COMPANY.legalName}. View it here or save a PDF copy.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              render={<a href={invoiceHref} target="_blank" rel="noopener noreferrer" />}
              nativeButton={false}
              variant="outline"
              size="sm"
            >
              <HugeiconsIcon icon={ViewIcon} strokeWidth={2} />
              View invoice
            </Button>
            <Button render={<a href={`${invoiceHref}?download=1`} download />} nativeButton={false} size="sm">
              <HugeiconsIcon icon={Download01Icon} strokeWidth={2} />
              Download
            </Button>
          </div>
        </Card>
      </div>

      {/* Items --------------------------------------------------------------------- */}
      <Card className="gap-0! pb-0!">
        <CardHeader className="border-b border-border">
          <CardTitle>Items</CardTitle>
          <CardDescription>Prices as placed — they never change on this order.</CardDescription>
        </CardHeader>
        <CardContent className="px-0!">
          <OrderItems
            items={orderItems.map((item) => ({
              id: item.id,
              title: item.title,
              variantLabel: item.variant_label,
              unit: item.unit,
              quantity: item.quantity,
              unitPrice: Number(item.unit_price),
              imageUrl: item.product_id ? itemImages.get(item.product_id) ?? null : null,
            }))}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Amounts ------------------------------------------------------------- */}
        <Card className="h-fit rounded-lg p-4">
          <p className="text-sm font-semibold">Amounts</p>
          <div className="mt-3 space-y-1.5 text-sm">
            <Row label="Items subtotal" value={formatRupees(acceptedQuote ? Number(acceptedQuote.total) - gst : itemsTotal)} />
            {!acceptedQuote && Number(orderRow.discount) > 0 ? (
              <Row label="Coupon discount" value={`− ${formatRupees(Number(orderRow.discount))}`} />
            ) : null}
            {gst > 0 ? <Row label="GST" value={formatRupees(gst)} /> : null}
            {walletUsed > 0 ? (
              <Row label="Paid from D2H wallet" value={`− ${formatRupees(walletUsed)}`} />
            ) : null}
            <div className="flex items-center justify-between border-t border-border pt-2">
              <span className="font-medium">Total to pay</span>
              <span className="font-bold tabular-nums">{formatRupees(totalAmount)}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {paid
                ? "Payment received — thank you."
                : "We contact you to arrange payment. This website never collects money."}
            </p>
          </div>
        </Card>

        {/* Delivery address ----------------------------------------------------- */}
        <Card className="h-fit rounded-lg p-4">
          <p className="text-sm font-semibold">Delivery address</p>
          {delivery ? (
            <div className="mt-2 text-sm">
              <p className="font-medium">{delivery.fullName}</p>
              <p className="mt-1 text-muted-foreground">{delivery.line1}</p>
              {delivery.line2 ? <p className="text-muted-foreground">{delivery.line2}</p> : null}
              <p className="text-muted-foreground">
                {[delivery.city, delivery.state, delivery.pincode].filter(Boolean).join(", ")}
              </p>
              <p className="mt-1 text-muted-foreground">Phone: {delivery.phone}</p>
              {delivery.instructions ? (
                <p className="mt-1 text-xs text-muted-foreground">Instructions: {delivery.instructions}</p>
              ) : null}
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">No address snapshot stored.</p>
          )}
          {orderRow.buyer_note ? (
            <p className="mt-3 border-t border-border pt-2 text-sm text-muted-foreground">
              Your note: {orderRow.buyer_note}
            </p>
          ) : null}
        </Card>
      </div>

      {/* History ---------------------------------------------------------------- */}
      <Card className="gap-0! pb-0!">
        <CardHeader className="border-b border-border">
          <CardTitle>Order history</CardTitle>
          <CardDescription>Every step of this order, as recorded.</CardDescription>
        </CardHeader>
        <CardContent className="px-0!">
          <ul className="divide-y divide-border">
            {((events ?? []) as { id: string; event: string; data: Record<string, unknown>; created_at: string }[]).map(
              (event) => (
                <li key={event.id} className="flex items-baseline justify-between gap-3 px-4 py-2.5">
                  <span className="text-sm">{eventLabel(event)}</span>
                  <span className="whitespace-nowrap text-xs text-muted-foreground tabular-nums">
                    {formatDateTime(event.created_at)}
                  </span>
                </li>
              ),
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
