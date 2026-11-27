"use client";

import { useActionState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Clock01Icon, ShoppingCart01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { addToCart, type BuyerActionState } from "@/lib/buyer/cart-actions";
import { announceCartCount } from "@/lib/cart-count-event";

const initialState: BuyerActionState = { ok: false, message: "" };

/**
 * One-tap add from listing cards: base product at its MOQ. Full
 * variant/quantity control lives on the product page.
 */
export function CardAddButton({
  productId,
  moq,
  compact = false,
  outOfStock = false,
}: {
  productId: string;
  moq: number;
  /** Small "ADD" pill-rect used by promo slider rows. */
  compact?: boolean;
  outOfStock?: boolean;
}) {
  const [state, action, pending] = useActionState(addToCart, initialState);

  useEffect(() => {
    if (state.ok) {
      toast.add({ type: "success", title: "Added to cart" });
      // Only the cart badge changes: no page refresh, so nothing reloads or jumps.
      announceCartCount(state.cartCount);
    } else if (state.message) {
      toast.add({ type: "error", title: "Could not add to cart", description: state.message });
    }
  }, [state]);

  if (outOfStock) {
    // Plain muted bar: clearly unavailable without looking broken.
    const muted = "border border-border bg-muted text-muted-foreground";
    return compact ? (
      <span
        className={`inline-flex h-8 shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-semibold ${muted}`}
      >
        <HugeiconsIcon icon={Clock01Icon} strokeWidth={2} className="size-3.5" />
        Out of stock
      </span>
    ) : (
      <span
        role="status"
        className={`inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-md text-xs font-semibold ${muted}`}
      >
        <HugeiconsIcon icon={Clock01Icon} strokeWidth={2} className="size-4" />
        Out of stock
      </span>
    );
  }

  return (
    <form action={action} className={compact ? "shrink-0" : "w-full"}>
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="quantity" value={Math.max(1, moq)} />
      <Button
        type="submit"
        variant="outline"
        disabled={pending}
        aria-label="Add to cart"
        aria-busy={pending}
        title="Add to cart"
        className={
          compact
            ? "h-8 min-w-[4.5rem] justify-center gap-1 rounded-lg border-primary/60 bg-card px-2.5 text-xs font-bold tracking-wide text-primary shadow-xs hover:border-primary hover:bg-primary/5 hover:text-primary"
            : "h-9 w-full justify-center gap-1.5 border-primary/40 bg-primary/5 text-xs font-semibold text-primary hover:border-primary hover:bg-primary/10 hover:text-primary"
        }
      >
        {pending ? (
          <Spinner className="size-4" />
        ) : (
          <HugeiconsIcon
            icon={ShoppingCart01Icon}
            strokeWidth={2}
            className={compact ? "size-3.5" : "size-4"}
          />
        )}
        <span>{compact ? "ADD" : "Add to cart"}</span>
      </Button>
    </form>
  );
}
