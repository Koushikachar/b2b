import { HugeiconsIcon } from "@hugeicons/react";
import { Clock01Icon, WhatsappIcon } from "@hugeicons/core-free-icons";
import { d2hWhatsappLink } from "@/lib/orders/whatsapp-link";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";
import { isProductSaved } from "@/lib/buyer/queries";
import { recordRecentlyViewed } from "@/lib/buyer/actions";
import { GuestRecentlyViewedTracker } from "@/components/storefront/guest-recently-viewed-tracker";
import { SaveButton } from "./save-button";
import { AddToCartForm } from "./add-to-cart-form";

export type IslandVariant = {
  id: string;
  label: string;
  customer_price: number | undefined;
  moq: number | null;
};

/**
 * Personalized buy box. Auth + saved-state + recently-viewed all live here
 * so the cached product body (gallery, price, specs, tabs) paints without
 * waiting for per-user lookups.
 */
export async function ProductActionsIsland({
  productId,
  title,
  image,
  moq,
  unit,
  variants,
  outOfStock = false,
}: {
  productId: string;
  title: string;
  image: string | null;
  moq: number;
  unit: string;
  variants: IslandVariant[];
  outOfStock?: boolean;
}) {
  const supabase = await createClient();
  const user = await getSessionUser(supabase);
  const saved = user ? await isProductSaved(supabase, user.id, productId) : false;

  // Per-user write — never block the cached PDP body on it. Runs after the
  // response starts streaming; failures only log.
  if (user) {
    void recordRecentlyViewed(productId);
  }

  return (
    <div className="flex flex-col gap-2">
      {!user && (
        <GuestRecentlyViewedTracker
          productId={productId}
          title={title}
          image={image}
        />
      )}
      {outOfStock ? (
        <div
          role="status"
          className="flex items-center gap-3 rounded-lg border border-border bg-muted/60 p-3"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive [&_svg]:size-5">
            <HugeiconsIcon icon={Clock01Icon} strokeWidth={2} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-foreground">Out of stock — back soon</span>
            <span className="block text-xs text-muted-foreground">Save it to find it fast, or ask us when it&apos;s back.</span>
          </span>
          <a
            href={d2hWhatsappLink({ productTitle: title })}
            target="_blank"
            rel="noopener noreferrer"
            className="press inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md bg-whatsapp px-3 text-xs font-semibold text-white hover:bg-whatsapp-dark"
          >
            <HugeiconsIcon icon={WhatsappIcon} strokeWidth={2} className="size-4" />
            Ask
          </a>
        </div>
      ) : (
        <AddToCartForm
          productId={productId}
          moq={moq}
          unit={unit}
          variants={variants}
          signedIn={!!user}
        />
      )}
      <SaveButton productId={productId} saved={saved} />
    </div>
  );
}
