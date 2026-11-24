import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Private areas: never in search results or AI answers.
const PRIVATE = [
  "/supplier/",
  "/admin/",
  "/account/",
  "/cart/",
  "/checkout/",
  "/orders/",
  "/auth/",
];

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
      { userAgent: "*", allow: "/", disallow: PRIVATE },
      { userAgent: AI_CRAWLERS, allow: ["/", "/llms.txt"], disallow: PRIVATE },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
