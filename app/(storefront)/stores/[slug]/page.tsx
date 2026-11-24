import { Suspense } from "react"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import {
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
  DeliveryBox01Icon,
  FlashIcon,
  Layers01Icon,
  Location01Icon,
  Package01Icon,
  Rocket01Icon,
  Settings02Icon,
  ShieldCheckIcon,
  ShoppingCart01Icon,
  TruckDeliveryIcon,
  UserGroupIcon,
  WarehouseIcon,
  WhatsappIcon,
  CustomerSupportIcon,
} from "@hugeicons/core-free-icons"
import { STORE_PROGRAMMES, getStoreProgramme } from "@/lib/stores"
import { getCachedHomeCategories, getCachedProducts, getCachedStoreId } from "@/lib/storefront-cache"
import { publicTransformedImageUrl } from "@/lib/storage"
import { formatRupees } from "@/lib/format"
import { SUPPORT_WHATSAPP } from "@/lib/site"
import { normalizeUserPhone } from "@/lib/user-phone"
import { Breadcrumbs } from "@/components/layout/breadcrumbs"
import { ProductCard, type ProductCardData } from "@/components/storefront/product-card"
import { ProductImage } from "@/components/storefront/product-image"
import { ProductGridSkeleton } from "@/components/storefront/skeletons"

type Props = { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return STORE_PROGRAMMES.map((store) => ({ slug: store.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const store = getStoreProgramme((await params).slug)
  if (!store) return {}
  return {
    title: `${store.name} — ${store.heroSubtitle}`,
    description: store.summary,
    alternates: { canonical: `/stores/${store.slug}` },
    openGraph: { title: store.name, description: store.summary, url: `/stores/${store.slug}` },
  }
}

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "products", label: "Products" },
  { id: "ordering", label: "Ordering Information" },
  { id: "policies", label: "Policies" },
  { id: "progress", label: "Order Progress" },
  { id: "contact", label: "Contact & Support" },
] as const

const WHY_ICONS: IconSvgElement[] = [Rocket01Icon, Layers01Icon, TruckDeliveryIcon, ShieldCheckIcon]

function Panel({ id, title, children, action }: { id?: string; title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-32 rounded-xl border border-border bg-card p-4 sm:p-5 lg:scroll-mt-40">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h2 className="text-lg font-bold tracking-tight">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

export default async function StoreProgrammePage({ params }: Props) {
  const store = getStoreProgramme((await params).slug)
  if (!store) notFound()

  // Products are scoped per store (stores table); same lookup as the homepage.
  const storeId = (await getCachedStoreId(store.slug)) ?? undefined

  const catalogue = await getCachedProducts({ perPage: 1, sort: "newest", storeId })
  const whatsapp = SUPPORT_WHATSAPP
    ? `https://wa.me/91${normalizeUserPhone(SUPPORT_WHATSAPP)}?text=${encodeURIComponent(`Hi, I have a question about ${store.name}.`)}`
    : null

  const stats: { icon: IconSvgElement; value: string; label: string }[] = [
    { icon: Package01Icon, value: catalogue.total > 0 ? catalogue.total.toLocaleString("en-IN") : "—", label: "Products" },
    { icon: ShoppingCart01Icon, value: formatRupees(store.minOrderValue), label: "Minimum Order Value" },
    { icon: UserGroupIcon, value: store.audience.split(" ")[0], label: store.audience.split(" ").slice(1).join(" ") },
    { icon: Settings02Icon, value: "Direct2Hub", label: store.managedLabel },
  ]

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-5">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Stores", href: "/stores" }, { label: store.name }]} />

      {/* Hero */}
      <header className="overflow-hidden rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 via-card to-brand-100">
        <div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-center">
          <div>
            <div className="flex items-start gap-3 sm:gap-4">
              <Image src={store.logo} alt="" width={112} height={112} priority className="size-16 shrink-0 rounded-2xl min-[380px]:size-20 border border-border bg-card object-contain p-2.5 shadow-sm sm:size-28 sm:p-4" />
              <div className="min-w-0">
                <h1 className="flex flex-wrap items-center gap-x-2 gap-y-1 text-2xl font-extrabold tracking-tight sm:text-3xl">
                  {store.name}
                  <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2.2} className="size-6 text-primary" aria-label="Verified" />
                </h1>
                <p className="mt-1.5 inline-flex items-center gap-1 rounded-md border border-brand-200 bg-card px-2 py-0.5 text-xs font-semibold text-brand-700">
                  <HugeiconsIcon icon={DeliveryBox01Icon} strokeWidth={2} className="size-3.5" />
                  {store.badge}
                </p>
                <p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
                  <HugeiconsIcon icon={Location01Icon} strokeWidth={2} className="size-4" />
                  {store.location}
                </p>
              </div>
            </div>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-foreground/80">{store.summary}</p>
            <dl className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {stats.map((stat) => (
                <div key={stat.label} className="flex flex-col items-start gap-1.5 rounded-xl border border-border bg-card px-3 py-2.5 shadow-xs min-[420px]:flex-row min-[420px]:items-center min-[420px]:gap-2.5">
                  <HugeiconsIcon icon={stat.icon} strokeWidth={1.8} className="size-6 shrink-0 text-primary" aria-hidden />
                  <div className="min-w-0">
                    <dd className="text-sm leading-tight font-extrabold break-words tabular-nums">{stat.value}</dd>
                    <dt className="text-[11px] leading-tight text-muted-foreground">{stat.label}</dt>
                  </div>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative hidden overflow-hidden rounded-xl bg-card/70 p-5 text-center sm:block">
            <HugeiconsIcon icon={WarehouseIcon} strokeWidth={1.2} aria-hidden className="absolute -bottom-6 -left-6 size-32 text-primary/10" />
            <HugeiconsIcon icon={DeliveryBox01Icon} strokeWidth={1.2} aria-hidden className="absolute -top-4 -right-4 size-28 text-primary/10" />
            <p className="relative text-2xl font-extrabold tracking-tight text-primary">{store.heroTitle}</p>
            <p className="relative mt-1 text-sm font-medium">{store.heroSubtitle}</p>
            <ul className="relative mt-4 grid grid-cols-3 gap-2">
              {[
                { icon: Package01Icon, label: "Curated Products" },
                { icon: FlashIcon, label: "Fast Fulfilment" },
                { icon: ShieldCheckIcon, label: "Buyer Protection" },
              ].map((f) => (
                <li key={f.label} className="flex flex-col items-center gap-1.5">
                  <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <HugeiconsIcon icon={f.icon} strokeWidth={2} className="size-5" />
                  </span>
                  <span className="text-[11px] font-semibold">{f.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </header>

      {/* Section tabs (in-page anchors: no JS, instant). */}
      <nav aria-label={`${store.name} sections`} className="sticky top-0 z-20 -mx-4 mt-3 border-b border-border bg-card/95 backdrop-blur lg:top-(--storefront-header-offset)">
        <ul className="no-scrollbar flex gap-1 overflow-x-auto px-4">
          {TABS.map((tab, index) => (
            <li key={tab.id}>
              <a
                href={`#${tab.id}`}
                className={`inline-flex h-11 items-center border-b-2 px-3 text-sm font-medium whitespace-nowrap hover:text-primary ${index === 0 ? "border-primary text-primary" : "border-transparent text-foreground/80"}`}
              >
                {tab.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-4">
          <Panel id="overview" title={`About ${store.name}`}>
            <p className="text-sm leading-relaxed text-foreground/80">{store.about}</p>
          </Panel>

          <Panel title={`Why Choose ${store.name}?`}>
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {store.whyChoose.map((item, i) => (
                <li key={item.title}>
                  <HugeiconsIcon icon={WHY_ICONS[i % WHY_ICONS.length]} strokeWidth={1.8} className="size-7 text-primary" />
                  <p className="mt-2 text-sm font-bold">{item.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{item.body}</p>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel
            id="products"
            title="Product Catalogue"
            action={
              <Link href="/products" className="inline-flex items-center gap-1 text-sm font-semibold whitespace-nowrap text-primary hover:underline">
                View All Products
                <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-4" />
              </Link>
            }
          >
            <Suspense fallback={<ProductGridSkeleton count={8} className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" />}>
              <StoreCatalogue storeId={storeId} />
            </Suspense>
          </Panel>

          <Panel id="ordering" title="Ordering Information">
            <FeatureList items={store.ordering} />
          </Panel>

          <Panel id="policies" title="Policies">
            <FeatureList items={store.policies} />
          </Panel>

          <Panel id="progress" title="Order Progress">
            <ol className="relative ml-3 border-l-2 border-brand-200">
              {store.orderProgress.map((step, i) => (
                <li key={step.title} className="relative pb-5 pl-6 last:pb-0">
                  <span className="absolute top-0 -left-[13px] flex size-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                  <p className="text-sm font-bold">{step.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{step.body}</p>
                </li>
              ))}
            </ol>
            <Link href="/orders" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
              Track your orders
              <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-4" />
            </Link>
          </Panel>
        </div>

        {/* Sidebar */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-[calc(var(--storefront-header-offset)+3.5rem)] lg:self-start">
          <section id="contact" className="scroll-mt-32 rounded-xl border border-border bg-card p-4">
            <h2 className="text-base font-bold tracking-tight">Store Details</h2>
            <dl className="mt-3 space-y-3 text-sm">
              {[
                { icon: Location01Icon, label: "Warehouse", value: store.warehouse },
                { icon: DeliveryBox01Icon, label: "Fulfilment", value: "Managed and fulfilled by Direct2Hub" },
                { icon: Layers01Icon, label: "Product Range", value: `${catalogue.total > 0 ? `${catalogue.total.toLocaleString("en-IN")} products` : "Products"} across multiple categories` },
                { icon: ShoppingCart01Icon, label: "Minimum Order Value", value: formatRupees(store.minOrderValue) },
              ].map((row) => (
                <div key={row.label} className="flex gap-3">
                  <HugeiconsIcon icon={row.icon} strokeWidth={1.8} className="mt-0.5 size-5 shrink-0 text-foreground/70" />
                  <div>
                    <dt className="font-semibold">{row.label}</dt>
                    <dd className="text-xs text-muted-foreground">{row.value}</dd>
                  </div>
                </div>
              ))}
            </dl>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {whatsapp ? (
                <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="press inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-primary text-sm font-semibold text-primary hover:bg-primary/5">
                  <HugeiconsIcon icon={WhatsappIcon} strokeWidth={2} className="size-4" />
                  WhatsApp
                </a>
              ) : null}
              <Link href="/contact" className={`press inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-primary text-sm font-semibold text-primary-foreground hover:bg-brand-dark ${whatsapp ? "" : "col-span-2"}`}>
                <HugeiconsIcon icon={CustomerSupportIcon} strokeWidth={2} className="size-4" />
                Contact Store
              </Link>
            </div>
          </section>

          <section className="rounded-xl border border-brand-100 bg-brand-50 p-4">
            <h2 className="flex items-center gap-2 text-base font-bold tracking-tight">
              <HugeiconsIcon icon={ShieldCheckIcon} strokeWidth={2} className="size-6 text-primary" />
              Buyer Protection
            </h2>
            <ul className="mt-3 space-y-2">
              {store.protection.map((p) => (
                <li key={p} className="flex items-center gap-2 text-sm">
                  <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} className="size-4 shrink-0 text-primary" />
                  {p}
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  )
}

function FeatureList({ items }: { items: { title: string; body: string }[] }) {
  return (
    <dl className="divide-y divide-border">
      {items.map((item) => (
        <div key={item.title} className="py-3 first:pt-0 last:pb-0">
          <dt className="text-sm font-bold">{item.title}</dt>
          <dd className="mt-0.5 text-sm text-muted-foreground">{item.body}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Category tiles + newest listings; streamed so the store header paints first. */
async function StoreCatalogue({ storeId }: { storeId?: string }) {
  const [categories, page] = await Promise.all([
    getCachedHomeCategories(),
    getCachedProducts({ perPage: 8, sort: "newest", storeId }),
  ])
  const tiles = categories.slice(0, 7)

  return (
    <>
      {tiles.length > 0 ? (
        <ul className="no-scrollbar -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-4 sm:px-0 md:grid-cols-7">
          {tiles.map((category) => (
            <li key={category.id} className="w-[84px] shrink-0 sm:w-auto">
              {/* h-full + a two-line label box: every tile is the same height. */}
              <Link href={`/category/${category.slug}`} className="press flex h-full flex-col rounded-lg border border-border p-1.5 text-center hover:border-brand-300">
                <span className="relative block aspect-square overflow-hidden rounded-md bg-muted">
                  {category.image_path ? (
                    <ProductImage fit="cover" src={publicTransformedImageUrl("category_images", category.image_path, { width: 160 })} alt="" sizes="84px" />
                  ) : (
                    <span aria-hidden className="flex h-full items-center justify-center bg-brand-50 text-lg font-bold text-brand-700">
                      {category.name.charAt(0)}
                    </span>
                  )}
                </span>
                <span className="mt-1 flex min-h-[2lh] items-center justify-center text-micro leading-snug font-semibold">
                  <span className="line-clamp-2">{category.name}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {page.products.length > 0 ? (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {page.products.map((product) => (
            <ProductCard
              key={product.id}
              product={product as unknown as ProductCardData}
              sizes="(min-width: 1024px) 18vw, (min-width: 640px) 30vw, 50vw"
            />
          ))}
        </div>
      ) : (
        <p className="mt-4 rounded-lg bg-muted p-6 text-center text-sm text-muted-foreground">New products are being added.</p>
      )}
    </>
  )
}
