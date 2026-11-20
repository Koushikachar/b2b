"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { HeartIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { saveProduct, unsaveProduct } from "@/lib/buyer/actions";

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

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      aria-pressed={shown}
      aria-busy={pending}
      onClick={toggle}
      className="h-11 w-full"
    >
      <HugeiconsIcon
        icon={HeartIcon}
        strokeWidth={2}
        data-icon="inline-start"
        className={shown ? "fill-primary text-primary" : undefined}
      />
      {shown ? "In your wishlist" : "Add to wishlist"}
    </Button>
  );
}
