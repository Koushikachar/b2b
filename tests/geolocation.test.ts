import { describe, expect, it } from "vitest";
import { buildDetectedAddress } from "../lib/buyer/geolocation";

describe("buildDetectedAddress", () => {
  it("keeps the road even without a house number", () => {
    const address = buildDetectedAddress({
      road: "MG Road",
      suburb: "Ashok Nagar",
      city: "Bengaluru",
      state: "Karnataka",
      postcode: "560001",
    });
    expect(address).toEqual({
      line1: "MG Road, Ashok Nagar",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560001",
    });
  });

  it("uses the taluk town as the city for a village, not the hobli", () => {
    const address = buildDetectedAddress({
      village: "Hangluru",
      municipality: "Vadera Hobli",
      county: "Kundapura taluk",
      state_district: "Udupi",
      state: "Karnataka",
      postcode: "576201",
    });
    expect(address.city).toBe("Kundapura");
    expect(address.line1).toBe("Hangluru, Vadera Hobli");
  });

  it("puts the house number before the road", () => {
    expect(buildDetectedAddress({ house_number: "12", road: "Main Road", town: "Kundapura" }).line1).toBe(
      "12 Main Road",
    );
  });

  it("drops a postcode that is not a valid Indian PIN", () => {
    expect(buildDetectedAddress({ city: "Udupi", postcode: "5762" }).pincode).toBe("");
  });
});
