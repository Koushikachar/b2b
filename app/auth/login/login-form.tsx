"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestOtp, type AuthActionState } from "@/lib/auth/actions";
import { requestPhoneLogin } from "@/lib/auth/phone-actions";

const initialState: AuthActionState = { ok: false, message: "" };

export function RequestOtpForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(requestOtp, initialState);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@company.com"
        />
      </div>
      <input type="hidden" name="next" value={next} />
      {state.message ? (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Sending…" : "Continue with email"}
      </Button>
    </form>
  );
}

export function PhoneLoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(requestPhoneLogin, initialState);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="phone">Mobile number</Label>
        <div className="flex items-center gap-2">
          <span className="flex h-9 items-center rounded-md border border-border bg-muted px-3 text-sm font-medium text-muted-foreground">
            +91
          </span>
          <Input
            id="phone"
            name="phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            maxLength={14}
            required
            placeholder="98765 43210"
          />
        </div>
      </div>
      <input type="hidden" name="next" value={next} />
      {state.message ? (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Sending…" : "Send code by SMS"}
      </Button>
    </form>
  );
}

/** Email or mobile: the Mobile tab appears only once SMS (MSG91) is configured. */
export function LoginMethods({ next, smsEnabled }: { next: string; smsEnabled: boolean }) {
  const [method, setMethod] = useState<"email" | "phone">("email");
  if (!smsEnabled) return <RequestOtpForm next={next} />;
  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" aria-label="Log in with" className="grid grid-cols-2 gap-1 rounded-md border border-border bg-card p-1">
        {(["email", "phone"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={method === m}
            onClick={() => setMethod(m)}
            className={`h-8 rounded-sm text-sm font-semibold transition-colors ${
              method === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {m === "email" ? "Email" : "Mobile number"}
          </button>
        ))}
      </div>
      {method === "email" ? <RequestOtpForm next={next} /> : <PhoneLoginForm next={next} />}
    </div>
  );
}
