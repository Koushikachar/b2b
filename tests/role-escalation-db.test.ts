import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// AUTH.md A-2 and the "member cannot grant themselves admin" acceptance test.
// Local dev stack only (the standard local demo keys), never the remote project.
const URL = "http://127.0.0.1:54421";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
const PASSWORD = "RoleEscalationPass123!";

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

async function makeSignedInUser(email: string): Promise<{ id: string; client: SupabaseClient }> {
  const { data, error } = await service.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
  if (error) throw error;
  const client = createClient(URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (signInError) throw signInError;
  return { id: data.user.id, client };
}

async function userType(id: string): Promise<string | null> {
  const { data } = await service.from("profiles").select("user_type").eq("id", id).maybeSingle();
  return (data?.user_type as string | undefined) ?? null;
}

describe.skipIf(!available)("profile role escalation", () => {
  const created: string[] = [];
  let user: { id: string; client: SupabaseClient };

  beforeAll(async () => {
    user = await makeSignedInUser(`escalate-${Date.now()}@role.test`);
    created.push(user.id);
  });

  afterAll(async () => {
    for (const id of created) await service.auth.admin.deleteUser(id);
  });

  it("a member cannot update their own user_type to admin", async () => {
    const { error } = await user.client.from("profiles").update({ user_type: "admin" }).eq("id", user.id);
    expect(error).not.toBeNull();
    expect(await userType(user.id)).toBe("buyer");
  });

  it("a member whose profile row is missing cannot insert it as admin or supplier", async () => {
    await service.from("profiles").delete().eq("id", user.id);
    for (const role of ["admin", "supplier"]) {
      const { error } = await user.client.from("profiles").insert({ id: user.id, email: "x@role.test", user_type: role });
      expect(error, role).not.toBeNull();
    }
    expect(await userType(user.id)).toBeNull();
  });

  it("the same member can still recreate the row as a buyer (ensureProfile backstop)", async () => {
    const { error } = await user.client.from("profiles").upsert({ id: user.id, email: "x@role.test" }, { onConflict: "id" });
    expect(error).toBeNull();
    expect(await userType(user.id)).toBe("buyer");
  });
});
