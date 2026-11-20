import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { isPrivateAddress } = await import("../lib/supplier/fetch-remote-image");

describe("isPrivateAddress (image-import SSRF guard)", () => {
  it("blocks loopback, private, link-local, CGNAT and reserved IPv4", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1",
      "169.254.169.254", "100.64.0.1", "0.0.0.0", "224.0.0.1", "198.18.0.1"]) {
      expect(isPrivateAddress(ip), ip).toBe(true);
    }
  });

  it("blocks IPv6 loopback, unique-local, link-local and IPv4-mapped private", () => {
    for (const ip of ["::1", "::", "fc00::1", "fd12::1", "fe80::1", "::ffff:127.0.0.1", "::ffff:10.0.0.1"]) {
      expect(isPrivateAddress(ip), ip).toBe(true);
    }
  });

  it("allows public addresses and refuses non-IPs", () => {
    expect(isPrivateAddress("8.8.8.8")).toBe(false);
    expect(isPrivateAddress("172.32.0.1")).toBe(false);
    expect(isPrivateAddress("2606:4700:4700::1111")).toBe(false);
    expect(isPrivateAddress("::ffff:8.8.8.8")).toBe(false);
    expect(isPrivateAddress("example.com")).toBe(true);
  });
});
