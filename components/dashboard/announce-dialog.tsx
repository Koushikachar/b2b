"use client"

import { useActionState, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Notification01Icon } from "@hugeicons/core-free-icons"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { postAnnouncement, type AnnouncementState } from "@/lib/supplier/announcement-actions"

const initialState: AnnouncementState = { ok: false, message: "" }

/** "Notify buyers": a short notice shown in every buyer's Notifications. */
export function AnnounceDialog() {
  const [open, setOpen] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const [state, action, pending] = useActionState(postAnnouncement, initialState)

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) setFormKey((key) => key + 1) // fresh form each time
      }}
    >
      <DialogTrigger render={<Button variant="outline" />}>
        <HugeiconsIcon icon={Notification01Icon} strokeWidth={2} />
        Notify buyers
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Notify buyers</DialogTitle>
          <DialogDescription>
            Shown in every buyer&apos;s Notifications — e.g. new products or new stock.
          </DialogDescription>
        </DialogHeader>
        <form key={formKey} action={action}>
          <FieldGroup>
            {state.message ? (
              <Alert variant={state.ok ? "default" : "destructive"}>
                <AlertDescription>{state.message}</AlertDescription>
              </Alert>
            ) : null}
            <Field>
              <FieldLabel htmlFor="announce-title">Title</FieldLabel>
              <Input id="announce-title" name="title" maxLength={80} required placeholder="New products added" />
            </Field>
            <Field>
              <FieldLabel htmlFor="announce-message">Message</FieldLabel>
              <Textarea
                id="announce-message"
                name="message"
                rows={3}
                maxLength={300}
                required
                placeholder="Steel bottles and jute bags are now in stock."
              />
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Close
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Sending…" : "Send notification"}
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  )
}
