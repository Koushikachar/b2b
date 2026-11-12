"use client"

import { useActionState } from "react"
import Image from "next/image"
import Link from "next/link"
import { HugeiconsIcon } from "@hugeicons/react"
import { Wallet01Icon } from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import {
  claimPromoEventReward,
  type PromoClaimState,
} from "@/lib/buyer/promo-actions"

/**
 * The lamp starts dim; tapping it (or the button) submits the claim. The flame
 * "lights" optimistically while the request is in flight, then the reward is
 * revealed. Already-claimed buyers see their lit diya and reward directly.
 */
export function LightDiya({
  eventKey,
  heroImage,
  heroWidth,
  heroHeight,
  actionLabel,
  signedIn,
  live,
  initialReward,
}: {
  eventKey: string
  heroImage: string
  heroWidth: number
  heroHeight: number
  actionLabel: string
  signedIn: boolean
  live: boolean
  initialReward: number | null
}) {
  const [state, action, pending] = useActionState<PromoClaimState, FormData>(
    claimPromoEventReward,
    initialReward != null
      ? { status: "won", reward: initialReward }
      : { status: "idle" }
  )
  const lit = pending || state.status === "won"
  const canPlay = signedIn && live && state.status !== "won"

  const lamp = (
    <span className="relative block">
      <span
        aria-hidden
        className={cn(
          "absolute inset-x-[15%] top-[10%] bottom-[30%] rounded-full bg-brand-amber/50 blur-3xl transition-opacity duration-700",
          lit ? "opacity-100" : "opacity-0"
        )}
      />
      <Image
        src={heroImage}
        alt={lit ? "A lit diya" : "An unlit diya — tap to light it"}
        width={heroWidth}
        height={heroHeight}
        priority
        sizes="(min-width: 640px) 420px, 90vw"
        className={cn(
          "relative mx-auto h-auto w-full max-w-[420px] rounded-3xl [mask-image:radial-gradient(ellipse_at_center,black_62%,transparent_78%)] transition-[filter] duration-700 ease-(--motion-settle)",
          lit ? "" : "brightness-75 grayscale-[70%]",
          canPlay && "cursor-pointer"
        )}
      />
    </span>
  )

  return (
    <form action={action} className="flex flex-col items-center gap-5">
      <input type="hidden" name="eventKey" value={eventKey} />

      {canPlay ? (
        <button
          type="submit"
          disabled={pending}
          aria-label={actionLabel}
          className="press block w-full rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {lamp}
        </button>
      ) : (
        lamp
      )}

      <div aria-live="polite" className="w-full max-w-sm text-center">
        {state.status === "won" ? (
          <div className="animate-in rounded-xl border border-brand-100 bg-card p-5 shadow-sm duration-500 fade-in zoom-in-95">
            <p className="text-sm font-medium text-muted-foreground">
              Your diya is lit! You won
            </p>
            <p className="mt-1 text-4xl font-extrabold tracking-tight text-primary tabular-nums">
              ₹{state.reward.toLocaleString("en-IN")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Credited to your Direct2Hub Wallet.
            </p>
            <Button
              nativeButton={false}
              render={<Link href="/account/wallet" />}
              className="mt-4 w-full"
            >
              <HugeiconsIcon icon={Wallet01Icon} strokeWidth={2} />
              View wallet
            </Button>
          </div>
        ) : !live ? (
          <p className="rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
            This event is not running right now. Check back on the next festival!
          </p>
        ) : !signedIn ? (
          <Button
            nativeButton={false}
            render={<Link href={`/auth/login?next=/events/${eventKey}`} />}
            className="h-11 w-full text-base font-bold"
          >
            Sign in to light your diya
          </Button>
        ) : (
          <>
            <Button
              type="submit"
              disabled={pending}
              className="h-11 w-full text-base font-bold"
            >
              {pending ? <Spinner className="size-4" /> : null}
              {pending ? "Lighting…" : actionLabel}
            </Button>
            {state.status === "error" ? (
              <p role="alert" className="mt-2 text-sm text-destructive">
                {state.message}
              </p>
            ) : null}
          </>
        )}
      </div>
    </form>
  )
}
