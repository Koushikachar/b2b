"use client"

import { useActionState, useEffect, useRef, useState } from "react"
import Image from "next/image"
import { HugeiconsIcon } from "@hugeicons/react"
import { Camera01Icon, Delete02Icon, UserIcon } from "@hugeicons/core-free-icons"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { BUSINESS_TYPES } from "@/lib/buyer/business-type"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import {
  requestEmailChange,
  updateProfile,
  type AccountFormState,
} from "@/lib/buyer/account-actions"

const initial: AccountFormState = { ok: false, message: "" }

function useToastResult(state: AccountFormState) {
  useEffect(() => {
    if (!state.message) return
    toast.add({ type: state.ok ? "success" : "error", title: state.message })
  }, [state])
}

export function ProfileForm({
  fullName,
  phone,
  phoneVerified,
  businessType,
  avatarUrl,
}: {
  fullName: string
  phone: string
  phoneVerified: boolean
  businessType: string | null
  avatarUrl: string | null
}) {
  const [state, action, pending] = useActionState(updateProfile, initial)
  const [preview, setPreview] = useState<string | null>(avatarUrl)
  const [removed, setRemoved] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  useToastResult(state)

  useEffect(() => {
    return () => {
      if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview)
    }
  }, [preview])

  const errors = state.fieldErrors ?? {}

  return (
    <form action={action} className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <span className="relative flex size-28 items-center justify-center overflow-hidden rounded-full bg-muted text-muted-foreground">
            {preview ? (
              <Image src={preview} alt="Profile photo preview" fill sizes="112px" unoptimized className="object-cover" />
            ) : (
              <HugeiconsIcon icon={UserIcon} strokeWidth={1.6} className="size-14" />
            )}
          </span>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            aria-label="Change photo"
            className="press absolute right-0 bottom-0 flex size-10 items-center justify-center rounded-full border-2 border-card bg-primary text-primary-foreground shadow-md hover:bg-brand-dark"
          >
            <HugeiconsIcon icon={Camera01Icon} strokeWidth={2} className="size-5" />
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          name="avatar"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (!file) return
            setRemoved(false)
            setPreview(URL.createObjectURL(file))
          }}
        />
        <input type="hidden" name="removeAvatar" value={removed ? "true" : "false"} />
        {preview ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => {
              setPreview(null)
              setRemoved(true)
              if (fileRef.current) fileRef.current.value = ""
            }}
          >
            <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
            Remove photo
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">JPG, PNG or WebP, up to 2 MB</p>
        )}
        {errors.avatar ? <p className="text-sm text-destructive">{errors.avatar}</p> : null}
      </div>

      <FieldGroup className="mt-6">
        <Field data-invalid={Boolean(errors.fullName) || undefined}>
          <FieldLabel htmlFor="fullName">Full name</FieldLabel>
          <Input id="fullName" name="fullName" defaultValue={fullName} autoComplete="name" required maxLength={80} aria-invalid={Boolean(errors.fullName) || undefined} />
          {errors.fullName ? <FieldError>{errors.fullName}</FieldError> : null}
        </Field>
        <Field data-invalid={Boolean(errors.phone) || undefined}>
          <FieldLabel htmlFor="phone" className="flex items-center gap-2">
            Mobile number
            {phone ? (
              <Badge variant={phoneVerified ? "success" : "warning"}>
                {phoneVerified ? "Verified" : "Not verified"}
              </Badge>
            ) : null}
          </FieldLabel>
          <Input id="phone" name="phone" type="tel" inputMode="numeric" defaultValue={phone} autoComplete="tel-national" placeholder="98765 43210" aria-invalid={Boolean(errors.phone) || undefined} />
          {errors.phone ? (
            <FieldError>{errors.phone}</FieldError>
          ) : (
            <FieldDescription>Changing your number marks it as not verified until our team confirms it.</FieldDescription>
          )}
        </Field>
        <Field data-invalid={Boolean(errors.businessType) || undefined}>
          <FieldLabel htmlFor="businessType">What describes you best</FieldLabel>
          <NativeSelect id="businessType" name="businessType" defaultValue={businessType ?? ""} aria-invalid={Boolean(errors.businessType) || undefined}>
            <NativeSelectOption value="" disabled>Choose one</NativeSelectOption>
            {BUSINESS_TYPES.map((type) => (
              <NativeSelectOption key={type.value} value={type.value}>{type.label}</NativeSelectOption>
            ))}
          </NativeSelect>
          {errors.businessType ? <FieldError>{errors.businessType}</FieldError> : null}
        </Field>
      </FieldGroup>

      <Button type="submit" disabled={pending} className="mt-6 h-11 w-full text-base font-bold">
        {pending ? <Spinner className="size-4" /> : null}
        Save profile
      </Button>
    </form>
  )
}

export function EmailChangeForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState(requestEmailChange, initial)
  useToastResult(state)

  return (
    <form action={action} className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
      <h2 className="text-base font-bold tracking-tight">Email address</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Current: <span className="font-medium text-foreground">{email}</span>
      </p>
      <Field className="mt-4" data-invalid={Boolean(state.fieldErrors?.email) || undefined}>
        <FieldLabel htmlFor="email">New email</FieldLabel>
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder="you@business.com" />
        <FieldDescription>We&apos;ll email a confirmation link. Your login email changes only after you verify it.</FieldDescription>
      </Field>
      {state.ok ? (
        <p role="status" className="mt-3 rounded-lg bg-success/10 px-3 py-2 text-sm text-success">{state.message}</p>
      ) : null}
      <Button type="submit" variant="outline" disabled={pending} className="mt-4 w-full">
        {pending ? <Spinner className="size-4" /> : null}
        Send verification link
      </Button>
    </form>
  )
}
