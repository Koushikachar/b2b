"use client";

import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import { HeartIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { glassIconClass } from "@/components/storefront/glass";
import { cn } from "@/lib/utils";
import { unsaveProduct } from "@/lib/buyer/actions";

function UnsaveSubmit({ title }: { title: string }) {
  const { pending } = useFormStatus();

  // Filled heart on the photo: one tap removes it from the wishlist.
  return (
    <Button
      type="submit"
      variant="ghost"
      size="icon"
      disabled={pending}
      aria-busy={pending}
      className={cn(glassIconClass, "size-9", pending && "opacity-50")}
      aria-label={`Remove ${title} from wishlist`}
      title="Remove from wishlist"
    >
      <HugeiconsIcon icon={HeartIcon} strokeWidth={2} className="size-5 fill-primary text-primary" />
    </Button>
  );
}

export function UnsaveButton({ productId, title }: { productId: string; title: string }) {
  const router = useRouter();

  return (
    <form
      action={async (formData: FormData) => {
        await unsaveProduct({ ok: true, message: "" }, formData);
        router.refresh();
      }}
      className="absolute top-2 right-2"
    >
      <input type="hidden" name="productId" value={productId} />
      <UnsaveSubmit title={title} />
    </form>
  );
}
