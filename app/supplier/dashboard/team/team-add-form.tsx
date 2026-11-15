"use client";

import { useEffect, useRef, useActionState, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlusSignIcon } from "@hugeicons/core-free-icons";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { MEMBER_ROLES, ROLE_DESCRIPTIONS, ROLE_LABELS, type MemberRole } from "@/lib/supplier/permissions";
import { Spinner } from "@/components/ui/spinner";
import { addStaff, type StaffActionState } from "@/lib/supplier/staff-actions";

const initialState: StaffActionState = { ok: false, message: "" };

export function TeamAddForm() {
  const [state, action, pending] = useActionState(addStaff, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [role, setRole] = useState<MemberRole>("staff");

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action}>
      <FieldGroup>
        <Field data-invalid={state.field === "email" && !state.ok ? true : undefined}>
          <FieldLabel htmlFor="email">Email address</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            required
            maxLength={254}
            autoComplete="email"
            aria-invalid={state.field === "email" && !state.ok ? true : undefined}
            placeholder="staff@example.com"
          />
          <FieldDescription>
            We email them a link. No account yet? They get an invite that creates one.
          </FieldDescription>
          {state.field === "email" && !state.ok ? (
            <FieldError>{state.message}</FieldError>
          ) : null}
        </Field>
        <Field>
          <FieldLabel htmlFor="role">Role</FieldLabel>
          <NativeSelect id="role" name="role" value={role} onChange={(e) => setRole(e.target.value as MemberRole)}>
            {MEMBER_ROLES.map((value) => (
              <NativeSelectOption key={value} value={value}>
                {ROLE_LABELS[value]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <FieldDescription>{ROLE_DESCRIPTIONS[role]}</FieldDescription>
        </Field>
        {state.message && (!state.field || state.ok) ? (
          <Alert variant={state.ok ? "default" : "destructive"}>
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        ) : null}
        <Field>
          <Button type="submit" disabled={pending} className="w-full sm:w-auto">
            {pending ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} data-icon="inline-start" />
            )}
            {pending ? "Adding…" : "Add team member"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
