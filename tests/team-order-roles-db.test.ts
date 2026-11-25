import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// RLS-POLICIES.md R-1: order data follows team roles at the database level.
// Local dev stack only (the standard local demo keys), never the remote project.
// Local stack from `supabase start` only (supabase/config.toml api.port = 54321).
// Deliberately not configurable: these tests write and delete data with the
// service role, so they must never be pointed at the live project.
const URL = "http://127.0.0.1:54321";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
const PASSWORD = "TeamOrderRolesPass123!";

const service = createClient(URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function probeLocal(): Promise<boolean> {
  try {
    const { error } = await service.from("profiles").select("id").limit(1);
    return !error;
  } catch {
    return false;
  }
}

const available = await probeLocal();

async function makeUser(email: string): Promise<{ id: string; client: SupabaseClient }> {
  const { data, error } = await service.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
  if (error) throw error;
  const client = createClient(URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (signInError) throw signInError;
  return { id: data.user.id, client };
}

type Role = "supplier" | "staff" | "product_manager" | "order_manager";

describe.skipIf(!available)("team roles on order data (DB)", () => {
  const created: string[] = [];
  const members = {} as Record<Role, SupabaseClient>;
  let owner: SupabaseClient;
  let companyId: string;
  let orderId: string;
  let productId: string;

  beforeAll(async () => {
    const suffix = Date.now();
    const ownerUser = await makeUser(`tor-owner-${suffix}@roles.test`);
    const buyer = await makeUser(`tor-buyer-${suffix}@roles.test`);
    owner = ownerUser.client;
    created.push(ownerUser.id, buyer.id);
    await service.from("profiles").update({ user_type: "supplier" }).eq("id", ownerUser.id);

    const { data: company, error: companyError } = await service
      .from("companies")
      .insert({
        owner_id: ownerUser.id,
        business_name: "Team Order Roles Co",
        contact_person: "Test",
        phone: "+91 9000000000",
        address: "Test Address, Test City",
        city: "Test City",
        state: "Test State",
        pincode: "123456",
        gstin: "24AAAAA0000A1Z5",
        pan: "AAAAA0000A",
        bank_account: "00000000000",
        bank_ifsc: "SBIN0000000",
        kyb_status: "verified",
        verified_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (companyError) throw companyError;
    companyId = company.id as string;

    for (const role of ["supplier", "staff", "product_manager", "order_manager"] as Role[]) {
      const email = `tor-${role}-${suffix}@roles.test`;
      const member = await makeUser(email);
      created.push(member.id);
      const { error } = await service
        .from("company_members")
        .insert({ company_id: companyId, user_id: member.id, email, role });
      if (error) throw error;
      members[role] = member.client;
    }

    const { data: order, error: orderError } = await service
      .from("orders")
      .insert({ supplier_id: companyId, buyer_id: buyer.id, status: "new", subtotal: 100, item_count: 1 })
      .select("id")
      .single();
    if (orderError) throw orderError;
    orderId = order.id as string;

    const { data: product, error: productError } = await service
      .from("products")
      .insert({
        supplier_id: companyId,
        title: "Team Order Roles Product",
        description: "A product for team role testing, with enough words.",
        seller_sku: `TOR-${suffix}`,
        hsn_code: "7208",
        unit: "kg",
        price_per_unit: 100,
        moq: 1,
        stock_qty: 10,
        lead_time_days: 5,
        gst_rate: 18,
        status: "approved",
      })
      .select("id")
      .single();
    if (productError) throw productError;
    productId = product.id as string;
    const { error: itemError } = await service
      .from("order_items")
      .insert({ order_id: orderId, product_id: productId, variant_id: null, quantity: 1, unit_price: 100 });
    if (itemError) throw itemError;
  });

  afterAll(async () => {
    for (const id of created) await service.auth.admin.deleteUser(id).catch(() => {});
  });

  const canSeeOrder = async (client: SupabaseClient) =>
    ((await client.from("orders").select("id").eq("id", orderId)).data ?? []).length === 1;

  it("the owner and members with an orders role can read the order", async () => {
    expect(await canSeeOrder(owner)).toBe(true);
    for (const role of ["supplier", "staff", "order_manager"] as Role[]) {
      expect(await canSeeOrder(members[role]), role).toBe(true);
    }
  });

  it("a product manager cannot read the order or its history", async () => {
    const pm = members.product_manager;
    expect(await canSeeOrder(pm)).toBe(false);
    const { data: events } = await pm.from("order_events").select("id").eq("order_id", orderId);
    expect(events ?? []).toHaveLength(0);
    const { data: quotes } = await pm.from("quotations").select("id").eq("order_id", orderId);
    expect(quotes ?? []).toHaveLength(0);
  });

  it("a product manager is still told an ordered product has orders (delete guard)", async () => {
    const pm = members.product_manager;
    const { data: items } = await pm.from("order_items").select("id").eq("product_id", productId);
    expect(items ?? []).toHaveLength(0); // hidden by RLS…
    const { data, error } = await pm.rpc("ordered_product_ids", { p_product_ids: [productId] });
    expect(error).toBeNull();
    expect(data).toEqual([productId]); // …but the guard still sees the order
  });

  it("ordered_product_ids reveals nothing about another company's products", async () => {
    const stranger = await makeUser(`tor-stranger-${Date.now()}@roles.test`);
    created.push(stranger.id);
    const { data } = await stranger.client.rpc("ordered_product_ids", { p_product_ids: [productId] });
    expect(data ?? []).toEqual([]);
  });

  it("a product manager cannot update the order", async () => {
    await members.product_manager.from("orders").update({ status: "cancelled" }).eq("id", orderId);
    const { data } = await service.from("orders").select("status").eq("id", orderId).single();
    expect(data?.status).toBe("new");
  });
});
