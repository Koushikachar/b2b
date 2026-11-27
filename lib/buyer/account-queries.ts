import type { SupabaseClient } from "@supabase/supabase-js";
import type { PromoEvent } from "@/lib/promotions";
import { getBuyerOrders } from "@/lib/buyer/order-history";
import {
  PAYMENT_STATUS_LABELS,
  parsePaymentStatus,
  type OrderStatus,
  type PaymentStatus,
} from "@/lib/orders/lifecycle";

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export type BuyerProfile = {
  email: string;
  fullName: string | null;
  phone: string | null;
  phoneVerified: boolean;
  /** Answer to "What describes you best"; null until answered. */
  businessType: string | null;
  /** Said "I don't have a GST number". */
  noGstin: boolean;
  avatarPath: string | null;
  gstin: string | null;
  gstBusinessName: string | null;
  gstAddress: string | null;
  marketingOptIn: boolean;
};

type ProfileRow = {
  email: string | null;
  full_name: string | null;
  phone: string | null;
  phone_verified: boolean | null;
  business_type: string | null;
  no_gstin: boolean | null;
  avatar_path: string | null;
  gstin: string | null;
  gst_business_name: string | null;
  gst_address: string | null;
  marketing_opt_in: boolean | null;
};

/** The signed-in user's profile. RLS limits the read to their own row. */
export async function getBuyerProfile(
  supabase: SupabaseClient,
  userId: string,
  fallbackEmail: string,
): Promise<BuyerProfile> {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "email, full_name, phone, phone_verified, business_type, no_gstin, avatar_path, gstin, gst_business_name, gst_address, marketing_opt_in",
    )
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("getBuyerProfile failed:", error.code, error.message);
  }
  const row = (data ?? null) as ProfileRow | null;
  return {
    email: row?.email || fallbackEmail,
    fullName: row?.full_name ?? null,
    phone: row?.phone ?? null,
    phoneVerified: row?.phone_verified ?? false,
    businessType: row?.business_type ?? null,
    noGstin: row?.no_gstin ?? false,
    avatarPath: row?.avatar_path ?? null,
    gstin: row?.gstin ?? null,
    gstBusinessName: row?.gst_business_name ?? null,
    gstAddress: row?.gst_address ?? null,
    marketingOptIn: row?.marketing_opt_in ?? true,
  };
}

/** Name to greet the buyer with: profile name, else the email local part. */
export function displayName(profile: Pick<BuyerProfile, "fullName" | "email">): string {
  if (profile.fullName?.trim()) return profile.fullName.trim();
  const local = profile.email.split("@")[0] ?? "";
  return local
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim() || "My account";
}

/** New-address prefill: the account name and phone, both editable in the form. */
export function addressDefaults(
  profile: Pick<BuyerProfile, "fullName" | "email" | "phone">,
): { fullName: string; phone: string } {
  return { fullName: displayName(profile).replace(/^My account$/, ""), phone: profile.phone ?? "" };
}

// ---------------------------------------------------------------------------
// Wallet
// ---------------------------------------------------------------------------

export type WalletTransaction = {
  id: string;
  direction: "credit" | "debit";
  amount: number;
  reason: string;
  description: string;
  reference: string | null;
  createdAt: string;
};

type WalletRow = {
  id: string;
  direction: "credit" | "debit";
  amount: number | string;
  reason: string;
  description: string;
  reference: string | null;
  created_at: string;
};

/**
 * Wallet balance + ledger. The ledger is append-only, so the balance is the
 * signed sum of every row; `limit` only trims the history that is returned.
 */
export async function getWallet(
  supabase: SupabaseClient,
  userId: string,
  limit = 50,
): Promise<{ balance: number; transactions: WalletTransaction[] }> {
  const { data, error } = await supabase
    .from("wallet_transactions")
    .select("id, direction, amount, reason, description, reference, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1000);

  if (error) {
    console.error("getWallet failed:", error.code, error.message);
    return { balance: 0, transactions: [] };
  }

  const rows = (data ?? []) as WalletRow[];
  let balance = 0;
  for (const row of rows) {
    const amount = Number(row.amount);
    balance += row.direction === "credit" ? amount : -amount;
  }

  return {
    balance: Math.round(balance * 100) / 100,
    transactions: rows.slice(0, limit).map((row) => ({
      id: row.id,
      direction: row.direction,
      amount: Number(row.amount),
      reason: row.reason,
      description: row.description,
      reference: row.reference,
      createdAt: row.created_at,
    })),
  };
}

// ---------------------------------------------------------------------------
// Promo events
// ---------------------------------------------------------------------------

export async function getPromoEventByKey(
  supabase: SupabaseClient,
  key: string,
): Promise<PromoEvent | null> {
  const { data, error } = await supabase
    .from("promo_events")
    .select("key, theme, title, starts_at, ends_at, max_reward")
    .eq("key", key)
    .maybeSingle();
  if (error) {
    console.error("getPromoEventByKey failed:", error.code, error.message);
  }
  if (!data) return null;
  return {
    key: data.key as string,
    theme: data.theme as PromoEvent["theme"],
    title: data.title as string,
    startsAt: data.starts_at as string,
    endsAt: data.ends_at as string,
    maxReward: Number(data.max_reward),
  };
}

export async function getPromoClaim(
  supabase: SupabaseClient,
  userId: string,
  eventKey: string,
): Promise<number | null> {
  const { data } = await supabase
    .from("promo_event_claims")
    .select("reward")
    .eq("event_key", eventKey)
    .eq("user_id", userId)
    .maybeSingle();
  return data ? Number(data.reward) : null;
}

// ---------------------------------------------------------------------------
// Payments + statement (built on the buyer's real orders)
// ---------------------------------------------------------------------------

export type BuyerPaymentRow = {
  orderId: string;
  reference: string;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  total: number;
  claimReference: string | null;
  claimedAt: string | null;
  createdAt: string;
};

/** Every order with its payment state, newest first (RLS: own orders only). */
export async function getBuyerPayments(
  supabase: SupabaseClient,
  userId: string,
): Promise<BuyerPaymentRow[]> {
  const orders = await getBuyerOrders(supabase, userId);
  if (orders.length === 0) return [];

  const { data, error } = await supabase
    .from("orders")
    .select("id, payment_status, payment_claim_reference, payment_claimed_at")
    .in("id", orders.map((o) => o.id));
  if (error) console.error("getBuyerPayments failed:", error.code, error.message);

  const byId = new Map(
    ((data ?? []) as {
      id: string;
      payment_status: string;
      payment_claim_reference: string | null;
      payment_claimed_at: string | null;
    }[]).map((row) => [row.id, row]),
  );

  return orders.map((order) => {
    const row = byId.get(order.id);
    return {
      orderId: order.id,
      reference: order.reference,
      orderStatus: order.status,
      paymentStatus: parsePaymentStatus(row?.payment_status) ?? "not_requested",
      total: order.total,
      claimReference: row?.payment_claim_reference ?? null,
      claimedAt: row?.payment_claimed_at ?? null,
      createdAt: order.createdAt,
    };
  });
}

export type StatementEntry = {
  id: string;
  date: string;
  kind: "order" | "wallet";
  description: string;
  reference: string;
  debit: number;
  credit: number;
  status: string;
  href: string | null;
};

/** Orders (purchases) and wallet movements in a date range, oldest first. */
export async function getAccountStatement(
  supabase: SupabaseClient,
  userId: string,
  from: Date,
  to: Date,
): Promise<StatementEntry[]> {
  const [payments, wallet] = await Promise.all([
    getBuyerPayments(supabase, userId),
    getWallet(supabase, userId, 1000),
  ]);
  const inRange = (iso: string) => {
    const t = Date.parse(iso);
    return t >= from.getTime() && t <= to.getTime();
  };

  const entries: StatementEntry[] = [
    ...payments
      .filter((p) => inRange(p.createdAt) && p.orderStatus !== "cancelled")
      .map((p) => ({
        id: p.orderId,
        date: p.createdAt,
        kind: "order" as const,
        description: "Purchase order",
        reference: p.reference,
        debit: p.total,
        credit: 0,
        status: PAYMENT_STATUS_LABELS[p.paymentStatus],
        href: `/orders/${p.orderId}`,
      })),
    ...wallet.transactions
      .filter((t) => inRange(t.createdAt))
      .map((t) => ({
        id: t.id,
        date: t.createdAt,
        kind: "wallet" as const,
        description: t.description,
        reference: t.reference ?? "Wallet",
        debit: t.direction === "debit" ? t.amount : 0,
        credit: t.direction === "credit" ? t.amount : 0,
        status: t.direction === "credit" ? "Credited" : "Debited",
        href: null,
      })),
  ];
  return entries.sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
}

/** Parse `?from=YYYY-MM-DD&to=YYYY-MM-DD`; defaults to the last 90 days (IST days). */
export function parseStatementRange(fromRaw?: string, toRaw?: string) {
  const DAY = /^\d{4}-\d{2}-\d{2}$/;
  const today = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const defaultFrom = new Date(today.getTime() - 89 * 86_400_000);
  const fromDay = fromRaw && DAY.test(fromRaw) ? fromRaw : iso(defaultFrom);
  const toDay = toRaw && DAY.test(toRaw) ? toRaw : iso(today);
  const [a, b] = fromDay <= toDay ? [fromDay, toDay] : [toDay, fromDay];
  return {
    fromDay: a,
    toDay: b,
    from: new Date(`${a}T00:00:00+05:30`),
    to: new Date(`${b}T23:59:59.999+05:30`),
  };
}
