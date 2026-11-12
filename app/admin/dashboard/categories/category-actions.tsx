"use client";

import { useRef, useState } from "react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import {
  deleteCategory,
  setCategoryImage,
  toggleCategory,
  type CategoryActionState,
} from "@/lib/admin/categories";

const initialState: CategoryActionState = { ok: false, message: "" };

export function ToggleVisibilityButton({
  id,
  isActive,
}: {
  id: string;
  isActive: boolean;
}) {
  const [, action, pending] = useActionState(toggleCategory, initialState);
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <Button
        type="submit"
        variant="outline"
        disabled={pending}
        aria-pressed={isActive}
      >
        {isActive ? "Visible" : "Hidden"}
      </Button>
    </form>
  );
}

export function DeleteCategoryButton({ id }: { id: string }) {
  const [state, action, pending] = useActionState(deleteCategory, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <ConfirmDialog
        trigger={
          <Button type="button" variant="destructive" disabled={pending}>
            {pending ? "Deleting…" : "Delete"}
          </Button>
        }
        title="Delete category?"
        description="This cannot be undone. Products using this category will become uncategorized."
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
/**
 * Row-level photo control: thumbnail (or empty placeholder) + upload button.
 * Picking a file submits immediately; the new photo previews while it uploads.
 */
export function CategoryImageUpload({
  id,
  name,
  imageUrl,
}: {
  id: string;
  name: string;
  imageUrl: string | null;
}) {
  const [state, action, pending] = useActionState(setCategoryImage, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const shown = preview ?? imageUrl;

  return (
    <form ref={formRef} action={action} className="flex shrink-0 items-center gap-3">
      <input type="hidden" name="id" value={id} />
      <input
        ref={inputRef}
        type="file"
        name="image"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        aria-label={`Upload photo for ${name}`}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          setPreview(URL.createObjectURL(file));
          formRef.current?.requestSubmit();
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={pending}
        aria-label={shown ? `Change photo for ${name}` : `Add photo for ${name}`}
        className="relative flex size-14 items-center justify-center overflow-hidden rounded-md border border-dashed border-border bg-muted/40 text-[10px] font-medium text-muted-foreground hover:border-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        {shown ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shown} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          <span className="px-1 text-center leading-tight">No photo</span>
        )}
        {pending ? (
          <span className="absolute inset-0 flex items-center justify-center bg-background/70">
            <Spinner className="size-4" />
          </span>
        ) : null}
      </button>
      <div className="hidden flex-col items-start gap-0.5 sm:flex">
        <Button
          type="button"
          variant={shown ? "outline" : "default"}
          size="sm"
          disabled={pending}
          onClick={() => inputRef.current?.click()}
        >
          {pending ? "Uploading…" : shown ? "Change photo" : "Upload photo"}
        </Button>
        {state.message ? (
          <p
            role={state.ok ? "status" : "alert"}
            className={state.ok ? "text-[11px] text-success" : "text-[11px] text-destructive"}
          >
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
