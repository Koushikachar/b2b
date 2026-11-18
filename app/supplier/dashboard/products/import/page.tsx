import Link from "next/link";
import { redirect } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth/session";
import { LOGIN_PATH } from "@/lib/auth/paths";
import { getSupplierContext } from "@/lib/auth/guard";
import { getDashboardStore } from "@/lib/supplier/dashboard-store";
import type { ImportCategory } from "@/lib/supplier/product-import-sheet";
import { ProductImport } from "./product-import";
import { ProductImportForm } from "./product-import-form";

const BASE = "/supplier/dashboard/products/import";

export default async function ImportProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const params = await searchParams;
  // "folders" = Excel template + one photo folder per SKU (default).
  // "links" = spreadsheet with image links or file names.
  const mode = params.mode === "links" ? "links" : "folders";

  const supabase = await createClient();
  const user = await getAuthUser(supabase);
  if (!user) redirect(LOGIN_PATH);

  const ctx = await getSupplierContext(supabase, user.id);
  if (!ctx) redirect("/supplier/onboarding");
  if (!ctx.verified) redirect("/supplier/dashboard");

  const [{ data: categories }, { store }] = await Promise.all([
    supabase.from("categories").select("id, name, slug").eq("is_active", true).order("sort_order"),
    getDashboardStore(),
  ]);

  const categoryOptions: ImportCategory[] = (categories ?? []).map((c) => ({
    id: c.id as string,
    name: c.name as string,
    slug: c.slug as string,
  }));

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
          {mode === "links"
            ? `Upload a spreadsheet where image cells hold links or file names. Products are saved as drafts in ${store?.name ?? "your store"} for you to review and submit.`
            : `Fill the Excel template, put each product's photos in a folder named after its SKU, then upload both. Products are saved as drafts in ${store?.name ?? "your store"} for you to review and submit.`}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          render={<Link href={`${BASE}?mode=folders`} />}
          nativeButton={false}
          variant={mode === "folders" ? "default" : "outline"}
          size="sm"
        >
          Excel + SKU photo folders
        </Button>
        <Button
          render={<Link href={`${BASE}?mode=links`} />}
          nativeButton={false}
          variant={mode === "links" ? "default" : "outline"}
          size="sm"
        >
          Spreadsheet + image links
        </Button>
      </div>

      {mode === "links" ? (
        <ProductImport categories={categoryOptions} />
      ) : (
        <ProductImportForm
          categories={categoryOptions}
          storeId={store?.id}
        />
      )}
    </div>
  );
}
