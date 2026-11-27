"use client"

import { useActionState, useState } from "react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { BUSINESS_TYPES } from "@/lib/buyer/business-type"
import { saveBusinessType, type BusinessTypeResult } from "@/lib/buyer/business-type-actions"

const initial: BusinessTypeResult = { ok: false, message: "" }

/**
 * Asked once per account (profiles.business_type is null until answered).
 * It must be answered, so it has no close button and ignores outside clicks.
 */
export function BusinessTypePrompt() {
  const [choice, setChoice] = useState("")
  const [done, setDone] = useState(false)
  const [state, action, pending] = useActionState(async (prev: BusinessTypeResult, formData: FormData) => {
    const result = await saveBusinessType(prev, formData)
    if (result.ok) setDone(true)
    return result
  }, initial)

  return (
    <Dialog open={!done} disablePointerDismissal onOpenChange={() => {}}>
      <DialogContent showCloseButton={false} className="gap-4 sm:max-w-md">
        <div>
          <DialogTitle className="text-xl font-extrabold tracking-tight">What describes you best?</DialogTitle>
          <DialogDescription className="mt-1">
            One quick question so we can show you the right products and prices. We only ask once.
          </DialogDescription>
        </div>
        <form action={action} className="flex flex-col gap-3">
          <input type="hidden" name="business_type" value={choice} />
          <RadioGroup
            value={choice}
            onValueChange={(value) => setChoice(String(value))}
            aria-label="What describes you best"
            className="grid gap-1.5"
          >
            {BUSINESS_TYPES.map((type) => (
              <label
                key={type.value}
                className="flex cursor-pointer items-center gap-3 rounded-md border border-border px-3 py-2.5 text-sm font-medium has-data-checked:border-primary has-data-checked:bg-brand-50"
              >
                <RadioGroupItem value={type.value} />
                {type.label}
              </label>
            ))}
          </RadioGroup>
          {!state.ok && state.message ? (
            <Alert variant="destructive">
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          ) : null}
          <Button type="submit" size="lg" className="h-11 text-base font-bold" disabled={!choice || pending}>
            {pending ? "Saving…" : "Continue"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
