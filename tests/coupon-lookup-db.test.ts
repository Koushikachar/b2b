import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// RLS-POLICIES.md R-2: buyers check one exact code; they can't list coupons.
// Local dev stack only (standard local demo keys).
const URL = "http://127.0.0.1:54421";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
const PASSWORD = "CouponLookupPass123!";

const service = createClient(URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

async function probeLocal(): Promise<boolean> {
  try {
    const { error } = await service.from("profiles").select("id").limit(1);
    return !error;
  } catch {
    return false;
  }
}

const available = await probeLocal();

describe.skipIf(!available)("coupon lookup (DB)", () => {
  const created: string[] = [];
  let buyer: SupabaseClient;
  let anon: SupabaseClient;
  let supplierId: string;
  const code = `SECRET${Date.now()}`;

  beforeAll(async () => {
    const suffix = Date.now();
    const owner = await service.auth.admin.createUser({ email: `cl-owner-${suffix}@coupon.test`, password: PASSWORD, email_confirm: true });
    const buyerUser = await service.auth.admin.createUser({ email: `cl-buyer-${suffix}@coupon.test`, password: PASSWORD, email_confirm: true });
    if (owner.error || buyerUser.error) throw owner.error ?? buyerUser.error;
    created.push(owner.data.user.id, buyerUser.data.user.id);

    const { data: company, error } = await service
      .from("companies")
      .insert({
        owner_id: owner.data.user.id,
        business_name: "Coupon Lookup Co",
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
    if (error) throw error;
    supplierId = company.id as string;

    const { error: couponError } = await service
      .from("coupons")
      .insert({ supplier_id: supplierId, code, type: "flat", flat_value: 50, is_active: true });
    if (couponError) throw couponError;

    buyer = createClient(URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
    const { error: signInError } = await buyer.auth.signInWithPassword({ email: `cl-buyer-${suffix}@coupon.test`, password: PASSWORD });
    if (signInError) throw signInError;
    anon = createClient(URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  });

  afterAll(async () => {
    for (const id of created) await service.auth.admin.deleteUser(id).catch(() => {});
  });

  it("a buyer cannot list coupons", async () => {
    const { data } = await buyer.from("coupons").select("code").eq("supplier_id", supplierId);
    expect(data ?? []).toHaveLength(0);
  });

  it("a buyer gets the coupon for the exact store and code", async () => {
    const { data, error } = await buyer.rpc("lookup_active_coupons", { p_supplier_ids: [supplierId], p_codes: [code] });
    expect(error).toBeNull();
    expect((data ?? []).map((c: { code: string }) => c.code)).toEqual([code]);
  });

  it("a wrong code, or the same code at another store, returns nothing", async () => {
    const wrong = await buyer.rpc("lookup_active_coupons", { p_supplier_ids: [supplierId], p_codes: [`${code}X`] });
    expect(wrong.data ?? []).toHaveLength(0);
    const otherStore = await buyer.rpc("lookup_active_coupons", {
      p_supplier_ids: ["00000000-0000-0000-0000-000000000000"],
      p_codes: [code],
    });
    expect(otherStore.data ?? []).toHaveLength(0);
  });

  it("signed-out visitors cannot call the lookup", async () => {
    const { error } = await anon.rpc("lookup_active_coupons", { p_supplier_ids: [supplierId], p_codes: [code] });
    expect(error).not.toBeNull();
  });
});
