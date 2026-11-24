import { describe, expect, it } from "vitest";
import { d2hWhatsappLink, whatsappContactLink } from "@/lib/orders/whatsapp-link";

// WhatsApp links are plain deep links: no credentials, no automatic sending,
// and the message carries no address, phone or price. The builder must reject
// anything that isn't a plausible Indian mobile rather than emit a broken link.

describe("whatsappContactLink", () => {
  it("builds a wa.me link from a 10-digit national number", () => {
    expect(whatsappContactLink("9876543210", "Hello")).toBe(
      "https://wa.me/919876543210?text=Hello",
    );
  });

  it("accepts common +91 / 0 prefixed forms", () => {
    expect(whatsappContactLink("+91 98765-43210", "Hi")).toBe(
      "https://wa.me/919876543210?text=Hi",
    );
    expect(whatsappContactLink("09876543210", "Hi")).toBe(
      "https://wa.me/919876543210?text=Hi",
    );
  });

  it("URL-encodes the message", () => {
    expect(whatsappContactLink("9876543210", "Order D2H-100001 ready?")).toBe(
      "https://wa.me/919876543210?text=Order%20D2H-100001%20ready%3F",
    );
  });

  it("rejects missing, malformed and non-Indian numbers", () => {
    expect(whatsappContactLink(null, "Hi")).toBeNull();
    expect(whatsappContactLink("", "Hi")).toBeNull();
    expect(whatsappContactLink("12345", "Hi")).toBeNull();
    expect(whatsappContactLink("551234567890", "Hi")).toBeNull();
    // Leading digit outside the Indian mobile range.
    expect(whatsappContactLink("5876543210", "Hi")).toBeNull();
  });
});

const text = (href: string) => new URL(href).searchParams.get("text");

describe("d2hWhatsappLink", () => {
  it("opens a chat with the D2H Core number", () => {
    expect(d2hWhatsappLink({}).startsWith("https://wa.me/917483274168?")).toBe(true);
  });

  it("names the order once the buyer has placed it", () => {
    expect(text(d2hWhatsappLink({ orderReference: "D2H-100118" }))).toBe(
      "Hi Direct2Hub, I completed order D2H-100118.",
    );
  });

  it("asks about the product, without any order number, before an order", () => {
    expect(text(d2hWhatsappLink({ productTitle: "Car Seat Belt Cover" }))).toBe(
      "Hi Direct2Hub, I'm interested in Car Seat Belt Cover.",
    );
  });

  it("falls back to a general question", () => {
    expect(text(d2hWhatsappLink({}))).toBe("Hi Direct2Hub, I have a question.");
  });
});
