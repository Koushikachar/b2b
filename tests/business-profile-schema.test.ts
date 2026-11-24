import { describe, expect, it } from "vitest";
import { businessProfileSchema } from "../lib/supplier/kyb";

const valid = {
  business_name: "Direct2Hub Private Limited",
  contact_person: "D2H",
  phone: "7483274168",
  address: "Shop No. 39-07 & 30-B, P.V.S. Complex",
  city: "Kundapura",
  state: "Karnataka",
  pincode: "576201",
  gstin: "",
};

describe("businessProfileSchema", () => {
  it("accepts the editable contact and address details", () => {
    const parsed = businessProfileSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it("treats a blank GSTIN as not provided", () => {
    const parsed = businessProfileSchema.safeParse(valid);
    expect(parsed.success && parsed.data.gstin).toBeNull();
  });

  it("upper-cases and checks a GSTIN when one is given", () => {
    const parsed = businessProfileSchema.safeParse({ ...valid, gstin: "29abcde1234f1z5" });
    expect(parsed.success && parsed.data.gstin).toBe("29ABCDE1234F1Z5");
    expect(businessProfileSchema.safeParse({ ...valid, gstin: "29ABC" }).success).toBe(false);
  });

  it("rejects an invalid PIN code or mobile", () => {
    expect(businessProfileSchema.safeParse({ ...valid, pincode: "5762" }).success).toBe(false);
    expect(businessProfileSchema.safeParse({ ...valid, phone: "12345" }).success).toBe(false);
  });
});
