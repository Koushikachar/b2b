"use client";

import { useRef } from "react";
import { useActionState, useOptimistic, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import {
  deleteBanner,
  resetBannerSlot,
  toggleBanner,
  type BannerActionState,
} from "@/lib/admin/banners";

const initialState: BannerActionState = { ok: false, message: "" };

export function ToggleVisibilityButton({
  id,
  isActive,
}: {
  id: string;
  isActive: boolean;
}) {
  // Optimistic: flips at once, flips back with a toast if the save fails.
  const [pending, startTransition] = useTransition();
  const [shown, setShown] = useOptimistic(isActive);
  const toggle = () => {
    if (pending) return;
    startTransition(async () => {
      setShown(!shown);
      const formData = new FormData();
      formData.set("id", id);
      const result = await toggleBanner(initialState, formData);
      if (!result.ok) toast.add({ type: "error", title: result.message || "Could not update. Try again." });
    });
  };
  return (
    <Button type="button" variant="outline" aria-pressed={shown} aria-busy={pending} onClick={toggle}>
      {shown ? "Visible" : "Hidden"}
    </Button>
  );
}

export function DeleteBannerButton({ id }: { id: string }) {
  const [state, action, pending] = useActionState(deleteBanner, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <ConfirmDialog
        trigger={
          <Button type="button" variant="destructive" disabled={pending}>
            {pending ? "Deleting…" : "Delete"}
          </Button>
        }
        title="Delete banner?"
        description="This cannot be undone. The banner will disappear from the home page."
        confirmLabel={pending ? "Deleting…" : "Delete"}
        onConfirm={() => formRef.current?.requestSubmit()}
      />
      <form ref={formRef} action={action}>
        <input type="hidden" name="id" value={id} />
      </form>
      {state.message ? (
        <p role="alert" className="text-xs text-destructive">
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
/** Removes every image in a tile slot so the built-in design shows again. */
export function ResetSlotButton({ slot, label }: { slot: string; label: string }) {
  const [state, action, pending] = useActionState(resetBannerSlot, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="flex flex-col gap-1">
      <ConfirmDialog
        trigger={
          <Button type="button" variant="ghost" disabled={pending}>
            {pending ? "Resetting…" : "Reset to default design"}
          </Button>
        }
        title={`Reset ${label}?`}
        description="Removes the uploaded image(s). The home page shows the built-in design again."
        confirmLabel={pending ? "Resetting…" : "Reset"}
        onConfirm={() => formRef.current?.requestSubmit()}
      />
      <form ref={formRef} action={action}>
        <input type="hidden" name="slot" value={slot} />
      </form>
      {state.message && !state.ok ? (
        <p role="alert" className="text-xs text-destructive">
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
