import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BUSINESS_TYPES, isBusinessType } from "../lib/buyer/business-type";

describe("business type question", () => {
  it("offers exactly the values the database accepts", () => {
    const sql = readFileSync("supabase/migrations/20261127020000_profile_business_type.sql", "utf8");
    const allowed = [...sql.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
    expect(BUSINESS_TYPES.map((t) => t.value).sort()).toEqual([...allowed].sort());
  });

  it("accepts only listed answers", () => {
    expect(isBusinessType("dropshipper")).toBe(true);
    expect(isBusinessType("admin")).toBe(false);
    expect(isBusinessType(null)).toBe(false);
  });
});
