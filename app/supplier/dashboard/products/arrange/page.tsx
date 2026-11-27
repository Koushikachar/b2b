import { redirect } from "next/navigation"
import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { getAuthUser } from "@/lib/auth/session"
import { getSupplierContext } from "@/lib/auth/guard"
import { LOGIN_PATH } from "@/lib/auth/paths"
import { publicTransformedImageUrl } from "@/lib/storage"
import { saveCategoryOrder, saveShowcaseOrder } from "@/lib/supplier/arrange-actions"
import { ArrangeList, type ArrangeItem } from "./arrange-list"

export const metadata: Metadata = { title: "Arrange home page" }

type ProductRow = { id: string; title: string; images: { path: string; sort: number }[] | null }

function toItems(rows: ProductRow[]): ArrangeItem[] {
  return rows.map((row) => {
    const cover = [...(row.images ?? [])].sort((a, b) => a.sort - b.sort)[0]
    return {
      id: row.id,
      label: row.title,
      imageUrl: cover ? publicTransformedImageUrl("product_images", cover.path, { width: 80, height: 80 }) : null,
    }
  })
}

/**
 * Products → Arrange: the order of this supplier's Winning and Hot Selling
 * products on the home page, and (Core store only) the category order.
 */
export default async function ArrangePage() {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)
  if (!user) redirect(LOGIN_PATH)
  const ctx = await getSupplierContext(supabase, user.id)
  if (!ctx) redirect("/supplier/onboarding")

  const flagged = (flag: "is_winning" | "is_hot_selling", rank: "winning_rank" | "hot_rank") =>
    supabase
      .from("products")
      .select("id, title, images:product_images(path, sort)")
      .eq("supplier_id", ctx.companyId)
      .eq("status", "approved")
      .eq("is_hidden", false)
      .eq(flag, true)
      .order(rank, { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(200)

  const [winning, hot, categories, coreStore] = await Promise.all([
    flagged("is_winning", "winning_rank"),
    flagged("is_hot_selling", "hot_rank"),
    supabase.from("categories").select("id, name").eq("is_active", true).order("sort_order").order("name"),
    supabase.from("stores").select("id").eq("slug", "d2h-core").maybeSingle(),
  ])

  // Categories are site-wide: only the Core store's company may arrange them.
  const { count: coreProducts } = coreStore.data
    ? await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("supplier_id", ctx.companyId)
        .eq("store_id", coreStore.data.id as string)
    : { count: 0 }
  const canArrangeCategories = (coreProducts ?? 0) > 0

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Arrange home page</h1>
        <p className="text-sm text-muted-foreground">
          Choose which products and categories buyers see first. Use the arrows, then save.
        </p>
      </div>
      <ArrangeList
        title="Winning products"
        description="Top of the list shows first in the home page Winning tab."
        items={toItems((winning.data ?? []) as ProductRow[])}
        emptyText="No live Winning products yet. Switch on “Winning product” in a product’s Promotions."
        save={saveShowcaseOrder.bind(null, "winning")}
      />
      <ArrangeList
        title="Hot selling products"
        description="Top of the list shows first in the home page Hot Selling tab."
        items={toItems((hot.data ?? []) as ProductRow[])}
        emptyText="No live Hot selling products yet. Switch on “Hot selling product” in a product’s Promotions."
        save={saveShowcaseOrder.bind(null, "hot_selling")}
      />
      {canArrangeCategories ? (
        <ArrangeList
          title="Categories"
          description="Order of Top categories on the home page and the category menus, for the whole site."
          items={((categories.data ?? []) as { id: string; name: string }[]).map((c) => ({ id: c.id, label: c.name }))}
          emptyText="No categories yet."
          save={saveCategoryOrder}
        />
      ) : null}
    </div>
  )
}
