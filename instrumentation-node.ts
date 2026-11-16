import dns from "node:dns"

// Node.js-only startup work, loaded from instrumentation.ts.
//
// On IPv6-only / NAT64 networks *.supabase.co also resolves to 64:ff9b::/96
// addresses, and Node 22 tries those first. That route drops intermittently,
// surfacing as "TypeError: fetch failed" in Supabase queries and 504s from the
// image optimizer. Prefer the IPv4 addresses; IPv6 is still used when no IPv4
// address exists.
dns.setDefaultResultOrder("ipv4first")
