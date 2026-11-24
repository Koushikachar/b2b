import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth/session";
import { orderInvoiceResponse } from "@/lib/orders/invoice-response";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Invoice PDF for one of the signed-in buyer's own orders. */
export async function GET(
  request: Request,
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

  // ?download=1 saves the file; otherwise it opens in the browser to view.
  const download = new URL(request.url).searchParams.get("download") === "1";
  return orderInvoiceResponse(supabase, orderId, { buyerId: user.id }, download);
}
