"use client"

import { useState, useTransition } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Logout01Icon } from "@hugeicons/core-free-icons"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Spinner } from "@/components/ui/spinner"
import { signOut } from "@/lib/auth/actions"

/** Full-width pale-red logout with a confirmation step before ending the session. */
export function LogoutButton() {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="press flex h-13 w-full items-center gap-3 rounded-xl bg-destructive/10 px-4 sm:h-14 sm:px-5 text-base font-bold text-destructive hover:bg-destructive/15 focus-visible:ring-2 focus-visible:ring-destructive focus-visible:outline-none"
      >
        <HugeiconsIcon icon={Logout01Icon} strokeWidth={2} className="size-5" />
        Logout
      </button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent size="default">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive">
              <HugeiconsIcon icon={Logout01Icon} strokeWidth={2} />
            </AlertDialogMedia>
            <AlertDialogTitle>Log out of Direct2Hub?</AlertDialogTitle>
            <AlertDialogDescription>
              Your cart and saved products stay on your account. You can sign back in any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pending}
              onClick={() => startTransition(() => signOut())}
            >
              {pending ? <Spinner className="size-4" /> : null}
              Logout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
