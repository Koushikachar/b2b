import { describe, expect, it } from "vitest";
import { announcementSchema } from "../lib/supplier/announcement-schema";

describe("announcementSchema", () => {
  it("accepts a trimmed title and message", () => {
    const parsed = announcementSchema.safeParse({ title: "  New stock  ", message: " Steel bottles are back. " });
    expect(parsed.success && parsed.data).toEqual({ title: "New stock", message: "Steel bottles are back." });
  });

  it("rejects a blank message", () => {
    const parsed = announcementSchema.safeParse({ title: "New stock", message: "   " });
    expect(parsed.success).toBe(false);
  });

  it("caps the message at 300 characters, like the database", () => {
    expect(announcementSchema.safeParse({ title: "New stock", message: "x".repeat(301) }).success).toBe(false);
  });
});
