import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Private areas (account, cart, checkout, orders, sign-in, supplier, admin)
// are NOT blocked here on purpose: next.config.ts sends them a noindex header.
// A robots.txt block hides that header from Google, which then indexes the
// bare URL from links ("Indexed, though blocked by robots.txt").

// AI search / answer engines, named explicitly so they are welcome on the
// public catalogue (ChatGPT, Claude, Perplexity, Gemini, Copilot, Apple).
const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "Bingbot",
  "CCBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/" },
      { userAgent: AI_CRAWLERS, allow: ["/", "/llms.txt"] },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
