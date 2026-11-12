"use client"

import { useActionState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import { saveGstDetails, type AccountFormState } from "@/lib/buyer/account-actions"

const initial: AccountFormState = { ok: false, message: "" }

export function GstForm({
  gstin,
  businessName,
  address,
}: {
  gstin: string
  businessName: string
  address: string
}) {
  const [state, action, pending] = useActionState(saveGstDetails, initial)
  const errors = state.fieldErrors ?? {}

  useEffect(() => {
    if (state.message) toast.add({ type: state.ok ? "success" : "error", title: state.message })
  }, [state])

  return (
    <form action={action} className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
      <FieldGroup>
        <Field data-invalid={Boolean(errors.gstin) || undefined}>
          <FieldLabel htmlFor="gstin">GSTIN</FieldLabel>
          <Input
            id="gstin"
            name="gstin"
            defaultValue={gstin}
            maxLength={15}
            autoCapitalize="characters"
            placeholder="24ABCDE1234F1Z5"
            className="font-mono uppercase"
            aria-invalid={Boolean(errors.gstin) || undefined}
          />
          {errors.gstin ? <FieldError>{errors.gstin}</FieldError> : <FieldDescription>15 characters, as printed on your GST certificate.</FieldDescription>}
        </Field>
        <Field data-invalid={Boolean(errors.businessName) || undefined}>
          <FieldLabel htmlFor="businessName">Registered business name</FieldLabel>
          <Input id="businessName" name="businessName" defaultValue={businessName} maxLength={120} autoComplete="organization" aria-invalid={Boolean(errors.businessName) || undefined} />
          {errors.businessName ? <FieldError>{errors.businessName}</FieldError> : null}
        </Field>
        <Field data-invalid={Boolean(errors.address) || undefined}>
          <FieldLabel htmlFor="address">Registered billing address</FieldLabel>
          <Textarea id="address" name="address" defaultValue={address} maxLength={300} rows={3} aria-invalid={Boolean(errors.address) || undefined} />
          {errors.address ? <FieldError>{errors.address}</FieldError> : null}
        </Field>
      </FieldGroup>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
        <Button type="submit" name="intent" value="save" disabled={pending} className="h-11 flex-1 text-base font-bold">
          {pending ? <Spinner className="size-4" /> : null}
          Save GST details
        </Button>
        {gstin ? (
          <Button type="submit" name="intent" value="remove" variant="outline" disabled={pending} className="h-11 text-destructive hover:text-destructive">
            Remove
          </Button>
        ) : null}
      </div>
    </form>
  )
}
