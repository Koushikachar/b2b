import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth/session";
import { LOGIN_PATH } from "@/lib/auth/paths";
import { getSupplierContext } from "@/lib/auth/guard";
import { getDashboardStore } from "@/lib/supplier/dashboard-store";
import { getCachedActiveCategories } from "@/lib/storefront-cache";
import { ProductForm } from "../product-form";

export default async function NewSupplierProductPage() {
  const supabase = await createClient();
  const user = await getAuthUser(supabase);
  if (!user) redirect(LOGIN_PATH);

  const ctx = await getSupplierContext(supabase, user.id);
  if (!ctx) redirect("/supplier/onboarding");
  if (!ctx.verified) redirect("/supplier/dashboard");

  // Cached category list; new products belong to the store the dashboard is switched to.
  const [categories, { store }] = await Promise.all([getCachedActiveCategories(), getDashboardStore()]);
  const options = categories.map(({ id, name }) => ({ id, name }));

  return (
    <ProductForm
      mode="create"
      categories={options}
      title="Add new product"
      description={`Save as draft, or publish directly to ${store?.name ?? "your storefront"}.`}
      storeId={store?.id}
    />
  );
}
