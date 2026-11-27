import { describe, expect, it } from "vitest";
import { canReceiveEmail } from "../lib/auth/email-deliverable";

const fail = (code: string) => () => Promise.reject(Object.assign(new Error(code), { code }));
const ok = <T,>(value: T) => () => Promise.resolve(value);

describe("canReceiveEmail", () => {
  it("accepts a domain with mail servers", async () => {
    expect(await canReceiveEmail("a@gmail.com", { resolveMx: ok([{ exchange: "mx.google.com", priority: 5 }]), resolve4: fail("ENODATA") })).toBe(true);
  });

  it("rejects reserved and test domains without a lookup", async () => {
    for (const email of ["a@example.com", "a@mail.example.org", "a@shop.test", "a@foo.invalid", "a@localhost"]) {
      expect(await canReceiveEmail(email, { resolveMx: fail("never"), resolve4: fail("never") })).toBe(false);
    }
  });

  it("rejects a domain that does not exist (typo like gmial.con)", async () => {
    expect(await canReceiveEmail("a@gmial.con", { resolveMx: fail("ENOTFOUND"), resolve4: fail("ENOTFOUND") })).toBe(false);
  });

  it("rejects a domain with a null MX (says it takes no mail)", async () => {
    expect(await canReceiveEmail("a@nomail.in", { resolveMx: ok([{ exchange: "", priority: 0 }]), resolve4: ok(["1.2.3.4"]) })).toBe(false);
  });

  it("accepts a domain with no MX but an address record (mail falls back to it)", async () => {
    expect(await canReceiveEmail("a@small.in", { resolveMx: fail("ENODATA"), resolve4: ok(["1.2.3.4"]) })).toBe(true);
  });

  it("lets the user through when DNS itself is down (never blocks real users)", async () => {
    expect(await canReceiveEmail("a@company.in", { resolveMx: fail("ETIMEOUT"), resolve4: fail("ETIMEOUT") })).toBe(true);
  });
});
