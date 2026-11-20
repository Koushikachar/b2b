import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth/session";
import { getVerifiedSupplierId } from "@/lib/auth/guard";
import { buildProductImportWorkbook } from "@/lib/supplier/product-import-xlsx";
import { getCachedActiveCategories } from "@/lib/storefront-cache";

/** Excel parsing/writing needs the Node runtime, not Edge. */
export const runtime = "nodejs";

/**
 * Download the guided Excel template. The dropdowns are built from the active
 * categories, so the file always matches the current catalogue.
 */
export async function GET() {
  const supabase = await createClient();
  const user = await getAuthUser(supabase);
  if (!user) {
    return new NextResponse("Sign in to download the template.", { status: 401 });
  }

  const supplierId = await getVerifiedSupplierId(supabase, user.id);
  if (!supplierId) {
    return new NextResponse("Only suppliers can import products.", {
      status: 403,
    });
  }

  try {
    const buffer = await buildProductImportWorkbook(await getCachedActiveCategories());

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          'attachment; filename="d2b-product-import-template.xlsx"',
        "Content-Length": String(buffer.byteLength),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("product import template failed:", err);
    return new NextResponse("Could not build the template. Try again.", {
      status: 500,
    });
  }
}
