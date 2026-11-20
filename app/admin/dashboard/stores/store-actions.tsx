"use client";

import { useOptimistic, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { toggleStore, type StoreActionState } from "@/lib/admin/stores";

const initialState: StoreActionState = { ok: false, message: "" };

export function ToggleStoreButton({
  id,
  isActive,
}: {
  id: string;
  isActive: boolean;
}) {
  // Optimistic: flips at once, flips back with a toast if the save fails.
  const [pending, startTransition] = useTransition();
  const [active, setActive] = useOptimistic(isActive);
  const toggle = () => {
    if (pending) return;
    startTransition(async () => {
      setActive(!active);
      const formData = new FormData();
      formData.set("id", id);
      const result = await toggleStore(initialState, formData);
      if (!result.ok) toast.add({ type: "error", title: result.message || "Could not update. Try again." });
    });
  };
  return (
    <Button type="button" variant="outline" aria-pressed={active} aria-busy={pending} onClick={toggle}>
      {active ? "Deactivate" : "Activate"}
    </Button>
  );
}
