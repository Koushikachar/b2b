"use client";

import { useActionState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { shrinkFileInput } from "@/lib/shrink-image";
import {
  updateCategory,
  type CategoryActionState,
} from "@/lib/admin/categories";

const initialState: CategoryActionState = { ok: false, message: "" };

export function EditCategoryForm({
  id,
  name,
  imageKept,
}: {
  id: string;
  name: string;
  imageKept: boolean;
}) {
  const [state, action, pending] = useActionState(updateCategory, initialState);

  return (
    <form action={action}>
      <FieldGroup>
        <input type="hidden" name="id" value={id} />
        <Field>
          <FieldLabel htmlFor="name">Name</FieldLabel>
          <Input
            id="name"
            name="name"
            required
            minLength={2}
            defaultValue={name}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="image">
            Image (JPG, PNG or WEBP, max 5 MB)
          </FieldLabel>
          {imageKept ? (
            <FieldDescription>
              Already set — choose a file to replace.
            </FieldDescription>
          ) : null}
          <Input
            id="image"
            name="image"
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            // Shrink in place: Vercel rejects requests over 4.5 MB (413).
            onChange={(e) => void shrinkFileInput(e.currentTarget)}
          />
        </Field>
        {state.message ? (
          <Alert variant="destructive">
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </FieldGroup>
    </form>
  );
}
