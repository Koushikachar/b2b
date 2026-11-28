"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import { SmartPhone01Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { confirmPhoneVerification, sendPhoneVerification } from "@/lib/auth/phone-actions"

/**
 * Verify the saved mobile number by SMS: send a code, enter it, done.
 * The badge flips to "Verified" from the database (a confirmed number is
 * marked verified by a trigger), so this component never decides it.
 */
export function PhoneVerify({ phone }: { phone: string }) {
  const router = useRouter()
  const [sent, setSent] = useState(false)
  const [code, setCode] = useState("")
  const [message, setMessage] = useState("")
  const [pending, startTransition] = useTransition()
  const display = `+91 ${phone.slice(0, 5)} ${phone.slice(5)}`

  const send = () =>
    startTransition(async () => {
      const result = await sendPhoneVerification(phone)
      setMessage(result.ok ? "" : result.message)
      if (result.ok) {
        setSent(true)
        setCode("")
        toast.add({ type: "success", title: result.message })
      }
    })

  const confirm = () =>
    startTransition(async () => {
      const result = await confirmPhoneVerification(phone, code)
      if (!result.ok) {
        setMessage(result.message)
        return
      }
      toast.add({ type: "success", title: result.message })
      router.refresh()
    })

  return (
    <div className="mt-4 rounded-2xl border border-warning/40 bg-warning/5 p-4">
      <div className="flex items-start gap-3">
        <HugeiconsIcon icon={SmartPhone01Icon} strokeWidth={2} className="mt-0.5 size-5 shrink-0 text-warning" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Verify your mobile number</p>
          <p className="text-xs text-muted-foreground">
            {sent ? `Enter the 6-digit code we sent to ${display}.` : `We'll send a 6-digit code by SMS to ${display}.`}
          </p>
        </div>
      </div>
      {sent ? (
        <div className="mt-3 flex flex-col gap-3">
          <InputOTP maxLength={6} value={code} onChange={setCode} aria-label="SMS code">
            <InputOTPGroup>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <InputOTPSlot key={i} index={i} />
              ))}
            </InputOTPGroup>
          </InputOTP>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={confirm} disabled={pending || code.length !== 6}>
              {pending ? <Spinner className="size-4" /> : null}
              Verify
            </Button>
            <Button size="sm" variant="ghost" onClick={send} disabled={pending}>
              Send a new code
            </Button>
          </div>
        </div>
      ) : (
        <Button size="sm" className="mt-3" onClick={send} disabled={pending}>
          {pending ? <Spinner className="size-4" /> : null}
          Verify by SMS
        </Button>
      )}
      {message ? (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {message}
        </p>
      ) : null}
    </div>
  )
}
