import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { upgradeToAal2 } from "./helpers/totp";

// AUTH.md A-3 / A-6: admin powers need MFA at the database, and admin changes
// are logged. Local dev stack only (standard local demo keys).
// Local stack from `supabase start` only (supabase/config.toml api.port = 54321).
// Deliberately not configurable: these tests write and delete data with the
// service role, so they must never be pointed at the live project.
const URL = "http://127.0.0.1:54321";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
const PASSWORD = "AdminMfaPass123!";

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

async function signedInAdmin(email: string): Promise<{ id: string; client: SupabaseClient }> {
  const { data, error } = await service.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
  if (error) throw error;
  await service.from("profiles").update({ user_type: "admin" }).eq("id", data.user.id);
  const client = createClient(URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (signInError) throw signInError;
  return { id: data.user.id, client };
}

describe.skipIf(!available)("admin MFA and action log (DB)", () => {
  const created: string[] = [];
  let noMfa: { id: string; client: SupabaseClient };
  let withMfa: { id: string; client: SupabaseClient };
  let categoryId: string;

  beforeAll(async () => {
    const suffix = Date.now();
    noMfa = await signedInAdmin(`admin-nomfa-${suffix}@mfa.test`);
    withMfa = await signedInAdmin(`admin-mfa-${suffix}@mfa.test`);
    created.push(noMfa.id, withMfa.id);
    await upgradeToAal2(withMfa.client);

    const { data, error } = await service
      .from("categories")
      .insert({ name: `MFA ${suffix}`, slug: `mfa-${suffix}`, sort_order: 0, is_active: true, image_path: "seed/mfa.jpg" })
      .select("id")
      .single();
    if (error) throw error;
    categoryId = data.id as string;
  });

  afterAll(async () => {
    await service.from("categories").delete().eq("id", categoryId);
    await service.from("audit_logs").delete().eq("entity_id", categoryId);
    for (const id of created) await service.auth.admin.deleteUser(id).catch(() => {});
  });

  it("an admin without MFA has no admin powers (cannot change a category)", async () => {
    await noMfa.client.from("categories").update({ is_active: false }).eq("id", categoryId);
    const { data } = await service.from("categories").select("is_active").eq("id", categoryId).single();
    expect(data?.is_active).toBe(true);
  });

  it("an admin with MFA can, and the change is logged with column names only", async () => {
    const { error } = await withMfa.client.from("categories").update({ is_active: false }).eq("id", categoryId);
    expect(error).toBeNull();
    const { data: row } = await service.from("categories").select("is_active").eq("id", categoryId).single();
    expect(row?.is_active).toBe(false);

    const { data: logs } = await service
      .from("audit_logs")
      .select("actor_id, entity_type, action, old_status, new_status, meta")
      .eq("entity_id", categoryId);
    expect(logs).toHaveLength(1);
    expect(logs?.[0]).toMatchObject({
      actor_id: withMfa.id,
      entity_type: "categories",
      action: "admin_update",
      old_status: "true",
      new_status: "false",
      meta: { changed: ["is_active"] },
    });
  });

  it("non-admin and service-role changes are not logged as admin actions", async () => {
    await service.from("categories").update({ sort_order: 5 }).eq("id", categoryId);
    const { data: logs } = await service.from("audit_logs").select("id").eq("entity_id", categoryId);
    expect(logs).toHaveLength(1);
  });
});
