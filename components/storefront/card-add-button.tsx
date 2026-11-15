"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { ShoppingCart01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { addToCart, type BuyerActionState } from "@/lib/buyer/cart-actions";

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
  const router = useRouter();
  const [state, action, pending] = useActionState(addToCart, initialState);

  useEffect(() => {
    if (state.ok) {
      toast.add({ type: "success", title: "Added to cart" });
      router.refresh();
    } else if (state.message) {
      toast.add({ type: "error", title: "Could not add to cart", description: state.message });
    }
  }, [state, router]);

  if (outOfStock) {
    return (
      <span
        className={
          compact
            ? "inline-flex h-8 shrink-0 items-center rounded-lg border border-border bg-muted px-2 text-[11px] font-semibold text-muted-foreground"
            : "inline-flex h-9 w-full items-center justify-center rounded-md border border-border bg-muted text-xs font-semibold text-muted-foreground"
        }
      >
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
