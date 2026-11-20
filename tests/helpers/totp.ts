import { createHmac } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

/** RFC 4648 base32 → bytes (the TOTP secret format Supabase returns). */
function base32Decode(input: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const clean = input.replace(/=+$/, "").replace(/\s+/g, "").toUpperCase();
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = alphabet.indexOf(ch);
    if (idx < 0) throw new Error(`invalid base32 character: ${ch}`);
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** RFC 6238 TOTP: HMAC-SHA1, 30-second steps, 6 digits (authenticator-app default). */
export function totpCode(secret: string, nowMs = Date.now()): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(nowMs / 1000 / 30)));
  const hmac = createHmac("sha1", base32Decode(secret)).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary = hmac.readUInt32BE(offset) & 0x7fffffff;
  return String(binary % 1_000_000).padStart(6, "0");
}

/**
 * Enroll a TOTP factor on a signed-in test client and verify it, so the
 * client's session becomes aal2 (what internal.is_admin() requires).
 */
export async function upgradeToAal2(client: SupabaseClient): Promise<void> {
  const { data, error } = await client.auth.mfa.enroll({ factorType: "totp", friendlyName: `test-${Date.now()}` });
  if (error || !data) throw error ?? new Error("MFA enroll failed");
  const { error: verifyError } = await client.auth.mfa.challengeAndVerify({
    factorId: data.id,
    code: totpCode(data.totp.secret),
  });
  if (verifyError) throw verifyError;
}
