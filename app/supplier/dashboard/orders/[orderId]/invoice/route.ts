import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth/session";
import { getSupplierContext } from "@/lib/auth/guard";
import { canAccess } from "@/lib/supplier/permissions";
import { orderInvoiceResponse } from "@/lib/orders/invoice-response";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Invoice PDF for one of the signed-in supplier's own orders. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await params;
  if (!UUID_RE.test(orderId)) {
    return new Response("Not found", { status: 404 });
  }

  const supabase = await createClient();
  const user = await getAuthUser(supabase);
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }
  const ctx = await getSupplierContext(supabase, user.id);
  // Route handlers skip orders/layout.tsx, so its area guard is repeated here.
  if (!ctx || !canAccess(ctx.role, "orders")) {
    return new Response("Not found", { status: 404 });
  }

  return orderInvoiceResponse(supabase, orderId, { supplierId: ctx.companyId });
}
