import Link from "next/link";
import { redirect } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth/session";
import { LOGIN_PATH } from "@/lib/auth/paths";
import { getSupplierContext } from "@/lib/auth/guard";
import { getDashboardStore } from "@/lib/supplier/dashboard-store";
import { ProductImport } from "./product-import";

export default async function ImportProductsPage() {
  const supabase = await createClient();
  const user = await getAuthUser(supabase);
  if (!user) redirect(LOGIN_PATH);

  const ctx = await getSupplierContext(supabase, user.id);
  if (!ctx) redirect("/supplier/onboarding");
  if (!ctx.verified) redirect("/supplier/dashboard");

  const [{ data: categories }, { store }] = await Promise.all([
    supabase.from("categories").select("id, name").eq("is_active", true).order("sort_order"),
    getDashboardStore(),
  ]);

  return (
    <div className="flex w-full flex-col gap-4">
      <div>
        <Link
          href="/supplier/dashboard/products"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-4" />
          All products
        </Link>
        <h1 className="text-xl font-bold tracking-tight">Import products</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Add many products at once from a spreadsheet. They are saved as drafts in{" "}
          {store?.name ?? "your store"} for you to review and submit.
        </p>
      </div>
      <ProductImport
        categories={(categories ?? []).map((c) => ({ id: c.id as string, name: c.name as string }))}
      />
    </div>
  );
}
