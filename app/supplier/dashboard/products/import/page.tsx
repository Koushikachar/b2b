import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth/session";
import { LOGIN_PATH } from "@/lib/auth/paths";
import { getSupplierContext } from "@/lib/auth/guard";
import { getDashboardStore } from "@/lib/supplier/dashboard-store";
import { ProductImportForm } from "./product-import-form";

export default async function ImportSupplierProductsPage() {
  const supabase = await createClient();
  const user = await getAuthUser(supabase);
  if (!user) redirect(LOGIN_PATH);

  const ctx = await getSupplierContext(supabase, user.id);
  if (!ctx) redirect("/supplier/onboarding");
  if (!ctx.verified) redirect("/supplier/dashboard");

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, slug")
    .eq("is_active", true)
    .order("sort_order");

  // Imports land in the store the dashboard is switched to, like new products.
  const { store } = await getDashboardStore();

  return (
    <ProductImportForm
      categories={(categories ?? []).map((c) => ({
        id: c.id as string,
        name: c.name as string,
        slug: c.slug as string,
      }))}
      storeId={store?.id}
      storeName={store?.name}
    />
  );
}
