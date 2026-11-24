import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/site";
import { llmsTxt } from "@/lib/seo";

// /llms.txt — a plain-markdown map of the site for AI engines (llmstxt.org).
export async function GET() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("name, slug")
    .eq("is_active", true)
    .order("name")
    .limit(200);

  return new Response(llmsTxt(SITE_URL, (data ?? []) as { name: string; slug: string }[]), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
