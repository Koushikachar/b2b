import Link from "next/link"
import type { Metadata } from "next"
import { HugeiconsIcon } from "@hugeicons/react"
import { Search01Icon, Store01Icon } from "@hugeicons/core-free-icons"
import { getCachedSupplierDirectory, type DirectorySupplier } from "@/lib/storefront-cache"
import { Breadcrumbs } from "@/components/layout/breadcrumbs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SupplierCard } from "@/components/suppliers/supplier-card"

export const metadata: Metadata = {
  title: "Verified Suppliers — Direct2Hub",
  description:
    "Browse verified Indian manufacturers, wholesalers and suppliers. Filter by state and see how many products each one lists.",
  alternates: { canonical: "/suppliers" },
}

const PER_PAGE = 24

const SORTS = {
  products: "Most products",
  newest: "Newest",
  name: "Name (A–Z)",
} as const
type Sort = keyof typeof SORTS

type SearchParams = { q?: string; state?: string; sort?: string; page?: string }

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? ""
}

function applyFilters(all: DirectorySupplier[], q: string, state: string, sort: Sort) {
  const needle = q.trim().toLowerCase()
  const rows = all.filter((s) => {
    if (state && s.state !== state) return false
    if (!needle) return true
    return (
      s.business_name.toLowerCase().includes(needle) ||
      (s.city ?? "").toLowerCase().includes(needle) ||
      (s.state ?? "").toLowerCase().includes(needle) ||
      s.category_names.some((c) => c.toLowerCase().includes(needle))
    )
  })
  rows.sort((a, b) => {
    if (sort === "name") return a.business_name.localeCompare(b.business_name)
    if (sort === "newest") return Date.parse(b.created_at) - Date.parse(a.created_at)
    return (b.product_count ?? 0) - (a.product_count ?? 0) || a.business_name.localeCompare(b.business_name)
  })
  return rows
}

function pageHref(sp: { q: string; state: string; sort: Sort }, page: number) {
  const params = new URLSearchParams()
  if (sp.q) params.set("q", sp.q)
  if (sp.state) params.set("state", sp.state)
  if (sp.sort !== "products") params.set("sort", sp.sort)
  if (page > 1) params.set("page", String(page))
  const qs = params.toString()
  return qs ? `/suppliers?${qs}` : "/suppliers"
}

const SELECT_CLASS =
  "h-10 w-full min-w-0 rounded-lg border border-input bg-card px-3 text-sm text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const q = first(sp.q).slice(0, 80)
  const state = first(sp.state)
  const sortRaw = first(sp.sort)
  const sort: Sort = sortRaw in SORTS ? (sortRaw as Sort) : "products"

  const all = await getCachedSupplierDirectory()
  const states = [...new Set(all.map((s) => s.state).filter(Boolean) as string[])].sort()
  const filtered = applyFilters(all, q, state, sort)
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const page = Math.min(Math.max(1, Number(first(sp.page)) || 1), totalPages)
  const visible = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  const filtering = Boolean(q || state)

  return (
    <div className="min-h-full bg-white">
      <div className="mx-auto w-full max-w-7xl px-4 py-5">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Suppliers" }]} />

        <header className="mb-4">
          <h1 className="text-2xl font-bold tracking-tight">Verified suppliers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {all.length.toLocaleString("en-IN")} verified{" "}
            {all.length === 1 ? "supplier" : "suppliers"} across{" "}
            {states.length.toLocaleString("en-IN")} {states.length === 1 ? "state" : "states"}.
          </p>
        </header>

        <form
          action="/suppliers"
          role="search"
          className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-card p-3 sm:grid-cols-[minmax(0,1fr)_180px_160px_auto]"
        >
          <label className="relative col-span-2 sm:col-span-1">
            <span className="sr-only">Search suppliers</span>
            <HugeiconsIcon
              icon={Search01Icon}
              strokeWidth={2}
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Name, city or category"
              className="h-10 pl-9"
            />
          </label>
          <label>
            <span className="sr-only">State</span>
            <select name="state" defaultValue={state} className={SELECT_CLASS}>
              <option value="">All states</option>
              {states.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Sort</span>
            <select name="sort" defaultValue={sort} className={SELECT_CLASS}>
              {Object.entries(SORTS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <Button type="submit" className="col-span-2 h-10 sm:col-span-1">
            Search
          </Button>
        </form>

        <div className="mt-4 mb-3 flex flex-wrap items-center justify-between gap-2 text-sm">
          <p className="text-muted-foreground">
            {filtered.length.toLocaleString("en-IN")} {filtered.length === 1 ? "supplier" : "suppliers"}
            {q ? <> for &ldquo;{q}&rdquo;</> : null}
            {state ? <> in {state}</> : null}
          </p>
          {filtering ? (
            <Link href="/suppliers" className="font-semibold text-primary hover:underline">
              Clear filters
            </Link>
          ) : null}
        </div>

        {visible.length === 0 ? (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-border bg-card px-6 py-8 text-center">
            <HugeiconsIcon icon={Store01Icon} strokeWidth={1.6} className="size-10 text-muted-foreground" />
            <p className="mt-3 font-semibold">
              {filtering ? "No suppliers match your search" : "No verified suppliers yet"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {filtering ? "Try another name, city or state." : "Check back soon as new suppliers are verified."}
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visible.map((supplier, index) => (
              <li key={supplier.id} className="flex">
                <div className="flex w-full flex-col [&>article]:flex-1">
                  <SupplierCard supplier={supplier} priority={index < 4} />
                </div>
              </li>
            ))}
          </ul>
        )}

        {totalPages > 1 ? (
          <nav aria-label="Supplier pages" className="mt-6 flex items-center justify-center gap-2">
            {page > 1 ? (
              <Button variant="outline" nativeButton={false} render={<Link href={pageHref({ q, state, sort }, page - 1)} />}>
                Previous
              </Button>
            ) : null}
            <span className="px-2 text-sm text-muted-foreground tabular-nums">
              Page {page} of {totalPages}
            </span>
            {page < totalPages ? (
              <Button variant="outline" nativeButton={false} render={<Link href={pageHref({ q, state, sort }, page + 1)} />}>
                Next
              </Button>
            ) : null}
          </nav>
        ) : null}

        <section className="mt-5 flex flex-col items-start gap-3 rounded-xl border border-brand-100 bg-brand-50 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <h2 className="font-bold tracking-tight">Are you a manufacturer or wholesaler?</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">List your products and reach buyers across India.</p>
          </div>
          <Button nativeButton={false} render={<Link href="/supplier/onboarding" />}>
            Become a supplier
          </Button>
        </section>
      </div>
    </div>
  )
}
