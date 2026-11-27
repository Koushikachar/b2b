import { Resolver, getServers } from "node:dns/promises";

// The system's DNS servers first, then public ones: some hosts have no DNS
// reachable from Node's resolver (every lookup refuses), which would
// silently turn this check off.
const resolver = new Resolver({ timeout: 2500, tries: 1 });
resolver.setServers([...new Set([...getServers(), "1.1.1.1", "8.8.8.8"])]);
const dnsResolveMx = resolver.resolveMx.bind(resolver);
const dnsResolve4 = resolver.resolve4.bind(resolver);

/**
 * Can this address receive a sign-in code? Checked before asking Supabase to
 * send one, because codes sent to typos (gmial.con) or fake domains bounce,
 * and Supabase restricts projects with a high bounce rate.
 *
 * Fails open: if DNS itself is unreachable we let the user through rather
 * than lock real people out.
 */
type Resolvers = {
  resolveMx: (domain: string) => Promise<{ exchange: string; priority: number }[]>;
  resolve4: (domain: string) => Promise<string[]>;
};

// Reserved for documentation/testing (RFC 2606 / 6761): never deliverable.
const RESERVED = /(^|\.)(example\.(com|net|org)|test|invalid|localhost|local|example)$/i;
// "This name does not exist / has no such record" — a definite answer.
const DEFINITE = new Set(["ENOTFOUND", "ENODATA", "NXDOMAIN"]);
const TIMEOUT_MS = 3000;

const withTimeout = <T>(promise: Promise<T>) =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(Object.assign(new Error("ETIMEOUT"), { code: "ETIMEOUT" })), TIMEOUT_MS),
    ),
  ]);

export async function canReceiveEmail(
  email: string,
  resolvers: Resolvers = { resolveMx: dnsResolveMx, resolve4: dnsResolve4 },
): Promise<boolean> {
  const domain = email.split("@").pop()?.trim().toLowerCase() ?? "";
  if (!domain || RESERVED.test(domain)) return false;

  try {
    const mx = await withTimeout(resolvers.resolveMx(domain));
    // A "null MX" (single record, empty exchange) means the domain takes no mail.
    if (mx.length > 0) return !mx.every((record) => record.exchange === "" || record.exchange === ".");
  } catch (error) {
    const code = (error as { code?: string }).code ?? "";
    if (!DEFINITE.has(code)) return true;
  }
  // No MX: mail servers fall back to the domain's own address record.
  try {
    return (await withTimeout(resolvers.resolve4(domain))).length > 0;
  } catch (error) {
    const code = (error as { code?: string }).code ?? "";
    return !DEFINITE.has(code);
  }
}
