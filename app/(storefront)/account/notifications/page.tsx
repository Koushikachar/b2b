import Link from "next/link"
import type { Metadata } from "next"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import {
  CreditCardIcon,
  Megaphone01Icon,
  NewReleasesIcon,
  Notification01Icon,
  Package01Icon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons"
import { requireAccount } from "@/lib/buyer/account-session"
import { getWallet } from "@/lib/buyer/account-queries"
import { formatRupees } from "@/lib/format"
import { AccountPage, AccountPageHeader } from "@/components/account/account-page-header"

export const metadata: Metadata = { title: "Notifications", robots: { index: false } }

const TEMPLATE_COPY: Record<string, { title: string; icon: IconSvgElement }> = {
  order_confirmed_buyer: { title: "Your order was reviewed and accepted", icon: Package01Icon },
  order_rejected_buyer: { title: "Your order was declined by the supplier", icon: Package01Icon },
  order_shipped_buyer: { title: "Your order has shipped", icon: Package01Icon },
  order_delivered_buyer: { title: "Your order was delivered", icon: Package01Icon },
  payment_confirmed_buyer: { title: "Your payment was confirmed", icon: CreditCardIcon },
}

type Item = { id: string; title: string; detail: string; at: string; href: string; icon: IconSvgElement }

const dateTime = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Kolkata",
})

/** New listings stay in the feed for two weeks. Module-level keeps render pure. */
function newProductsSince(): string {
  return new Date(Date.now() - 14 * 86_400_000).toISOString()
}

export default async function NotificationsPage() {
  const { supabase, user } = await requireAccount("/account/notifications")
  const newSince = newProductsSince()
  const [{ data: outbox, error }, wallet, { data: notices }, { data: newProducts }] = await Promise.all([
    supabase
      .from("notification_outbox")
      .select("id, order_id, template, created_at, order:order_id(reference)")
      .eq("recipient_user_id", user.id)
      .in("template", Object.keys(TEMPLATE_COPY))
      .order("created_at", { ascending: false })
      .limit(50),
    getWallet(supabase, user.id, 20),
    supabase
      .from("announcements")
      .select("id, title, message, product_id, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("products")
      .select("id, title, created_at")
      .eq("status", "approved")
      .eq("is_hidden", false)
      .gte("created_at", newSince)
      .order("created_at", { ascending: false })
      .limit(10),
  ])
  if (error) console.error("notifications read failed:", error.code, error.message)

  const items: Item[] = [
    ...((outbox ?? []) as unknown as {
      id: string
      order_id: string
      template: string
      created_at: string
      order: { reference: string } | null
    }[]).map((row) => ({
      id: row.id,
      title: TEMPLATE_COPY[row.template]?.title ?? "Order update",
      detail: row.order?.reference ? `Order ${row.order.reference}` : "Order update",
      at: row.created_at,
      href: `/orders/${row.order_id}`,
      icon: TEMPLATE_COPY[row.template]?.icon ?? Package01Icon,
    })),
    ...wallet.transactions.map((t) => ({
      id: t.id,
      title: t.direction === "credit" ? `${formatRupees(t.amount)} added to your wallet` : `${formatRupees(t.amount)} used from your wallet`,
      detail: t.description,
      at: t.createdAt,
      href: "/account/wallet",
      icon: Wallet01Icon,
    })),
    ...((notices ?? []) as { id: string; title: string; message: string; product_id: string | null; created_at: string }[]).map(
      (n) => ({
        id: `notice-${n.id}`,
        title: n.title,
        detail: n.message,
        at: n.created_at,
        href: n.product_id ? `/products/${n.product_id}` : "/products",
        icon: Megaphone01Icon,
      }),
    ),
    ...((newProducts ?? []) as { id: string; title: string; created_at: string }[]).map((p) => ({
      id: `product-${p.id}`,
      title: "New product added",
      detail: p.title,
      at: p.created_at,
      href: `/products/${p.id}`,
      icon: NewReleasesIcon,
    })),
  ].sort((a, b) => Date.parse(b.at) - Date.parse(a.at))

  return (
    <AccountPage>
      <AccountPageHeader title="Notifications" description="Orders, wallet, new products and news from Direct2Hub." />
      {items.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <HugeiconsIcon icon={Notification01Icon} strokeWidth={1.6} className="size-10 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">You&apos;re all caught up</p>
          <p className="mt-1 text-sm text-muted-foreground">Updates about your orders and wallet will appear here.</p>
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {items.map((item) => (
            <li key={item.id}>
              <Link href={item.href} className="press flex items-start gap-3 px-4 py-3 hover:bg-muted/60">
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <HugeiconsIcon icon={item.icon} strokeWidth={1.8} className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{item.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">{item.detail}</span>
                </span>
                <time dateTime={item.at} className="shrink-0 text-[11px] text-muted-foreground">
                  {dateTime.format(new Date(item.at))}
                </time>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AccountPage>
  )
}
