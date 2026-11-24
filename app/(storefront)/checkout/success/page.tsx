import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";
import { getCheckoutOrders } from "@/lib/buyer/checkout-queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatRupees } from "@/lib/format";
import { ORDER_STATUS_LABELS, parseOrderStatus } from "@/lib/orders/lifecycle";
import { orderAmount } from "@/lib/orders/quotation";
import { d2hWhatsappLink } from "@/lib/orders/whatsapp-link";
import { COMPANY } from "@/lib/company";
import { OrderPlacedDialog } from "./order-placed-dialog";

export const metadata: Metadata = {
  title: "Order placed",
  description: "Your order was submitted to the suppliers.",
  robots: { index: false, follow: false },
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ orders?: string }>;
}) {
  const supabase = await createClient();
  const user = await getSessionUser(supabase);
  if (!user) {
    redirect("/auth/login?next=/checkout");
  }

  const { orders } = await searchParams;
  const orderIds = (orders ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter((id) => UUID_RE.test(id))
    .slice(0, 10);

  const results = await getCheckoutOrders(supabase, user.id, orderIds);
  const references = results.map(({ order }) => order.reference);
  const whatsappHref =
    references.length > 0 ? d2hWhatsappLink({ orderReference: references.join(", ") }) : null;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-5">
      {results.length > 0 ? (
        <OrderPlacedDialog references={references} whatsappHref={whatsappHref} />
      ) : null}
      <h1 className="text-xl font-bold tracking-tight md:text-2xl">
        Order{results.length === 1 ? "" : "s"} placed
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {results.length === 0
          ? "We could not find those orders on your account."
          : "Submitted to Direct2Hub for review. Nothing has been paid yet."}
      </p>

      <div className="mt-5 flex flex-col gap-4">
        {results.map(({ order, items }) => (
          <Card key={order.id} className="rounded-lg p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold tabular-nums">
                  {order.reference}
                </span>
                <Badge variant="secondary">
                  {ORDER_STATUS_LABELS[parseOrderStatus(order.status) ?? "new"]}
                </Badge>
              </div>
              <span className="text-sm font-semibold tabular-nums">
                {formatRupees(orderAmount(order.subtotal, null, order.gst_amount, order.wallet_amount))}
                {Number(order.gst_amount) > 0 ? (
                  <span className="ml-1 text-xs font-normal text-muted-foreground">incl. GST</span>
                ) : null}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{COMPANY.legalName}</p>
            <ul className="mt-3 flex flex-col gap-1 text-sm">
              {items.map((item) => (
                <li key={item.id} className="flex justify-between gap-3">
                  <span className="min-w-0 truncate">
                    {item.title}
                    {item.variant_label ? ` — ${item.variant_label}` : ""} ×{" "}
                    {item.quantity} {item.unit}
                  </span>
                  <span className="shrink-0 tabular-nums">
                    {formatRupees(Number(item.unit_price) * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      <AlertNote />

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/orders">
          <Button>Track my orders</Button>
        </Link>
        <Link href="/products">
          <Button variant="outline">Continue shopping</Button>
        </Link>
      </div>
    </div>
  );
}

function AlertNote() {
  return (
    <div className="mt-5 rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
      <p className="font-semibold text-foreground">What happens next</p>
      <ul className="mt-2 flex list-disc flex-col gap-1 pl-5">
        <li>Direct2Hub reviews your order and accepts or cancels it.</li>
        <li>Once accepted, we contact you to arrange payment (outside this website).</li>
        <li>After payment is received, your order is packed and shipped.</li>
        <li>Track status, tracking number and invoice any time from your orders page.</li>
      </ul>
    </div>
  );
}
