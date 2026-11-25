"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { HeartIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { saveProduct, unsaveProduct } from "@/lib/buyer/actions";
import { glassIconClass } from "@/components/storefront/glass";

/**
 * Wishlist heart. Optimistic: flips the moment it's tapped, then the server
 * saves. On failure (e.g. signed out) it flips back and says why; on success
 * the page refresh hands down the new `saved`, so the state sticks.
 */
export function SaveButton({
  productId,
  saved,
}: {
  productId: string;
  saved: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [shown, setShown] = useOptimistic(saved);

  const toggle = () => {
    // One request at a time, so a fast double tap can't land out of order.
    if (pending) return;
    startTransition(async () => {
      const next = !shown;
      setShown(next);
      const formData = new FormData();
      formData.set("productId", productId);
      const result = await (next ? saveProduct : unsaveProduct)({ ok: true, message: "" }, formData);
      if (result.ok) {
        router.refresh();
      } else {
        toast.add({ type: "error", title: result.message });
      }
    });
  };

  // Heart icon in the product page's top row (next to Back and search).
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-pressed={shown}
      aria-busy={pending}
      aria-label={shown ? "Remove from wishlist" : "Add to wishlist"}
      title={shown ? "In your wishlist" : "Add to wishlist"}
      onClick={toggle}
      className={glassIconClass}
    >
      <HugeiconsIcon
        icon={HeartIcon}
        strokeWidth={2}
        className={shown ? "size-5 fill-primary text-primary" : "size-5"}
      />
    </Button>
  );
}
