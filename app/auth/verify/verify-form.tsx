"use client";

import { useState, useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { verifyOtp, type AuthActionState } from "@/lib/auth/actions";
import { verifyPhoneLogin } from "@/lib/auth/phone-actions";

const initialState: AuthActionState = { ok: false, message: "" };

/** One form for both: an emailed code (email) or an SMS code (phone). */
export function VerifyOtpForm({ email, phone, next }: { email?: string; phone?: string; next: string }) {
  const [value, setValue] = useState("");
  const [state, action, pending] = useActionState(phone ? verifyPhoneLogin : verifyOtp, initialState);

  return (
    <form action={action} className="flex flex-col gap-4">
      {phone ? <input type="hidden" name="phone" value={phone} /> : <input type="hidden" name="email" value={email} />}
      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="token" value={value} />
      <InputOTP maxLength={6} value={value} onChange={setValue}>
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
          <InputOTPSlot index={2} />
          <InputOTPSlot index={3} />
          <InputOTPSlot index={4} />
          <InputOTPSlot index={5} />
        </InputOTPGroup>
      </InputOTP>
      {state.message ? (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      ) : null}
      <Button type="submit" disabled={pending || value.length !== 6}>
        {pending ? "Verifying…" : "Verify code"}
      </Button>
    </form>
  );
}
