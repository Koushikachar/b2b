"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion, useReducedMotion } from "motion/react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Wallet01Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { springMomentum } from "@/lib/motion"
import { formatRupees } from "@/lib/format"
import { claimSignupBonus } from "@/lib/buyer/wallet-actions"

// Loaded only when the popup opens, so lottie never weighs on normal pages.
// LottieSvg: the SVG-only engine build, smaller than the full one.
const LottieSvg = dynamic(() => import("lottie-react").then((mod) => mod.LottieSvg), { ssr: false })

const CELEBRATION = "/lottie/signup-celebration.json"

// One claim per account per page load. React runs effects twice in
// development; both runs must share this request, and its answer must never
// be dropped — the database reports "credited" only once, ever.
const claims = new Map<string, ReturnType<typeof claimSignupBonus>>()
function claimOnce(accountKey: string) {
  let pending = claims.get(accountKey)
  if (!pending) {
    pending = claimSignupBonus()
    claims.set(accountKey, pending)
  }
  return pending
}

/**
 * Welcome bonus: claim_signup_bonus credits Rs 100 once per account and
 * returns it only the first time the account should see the celebration
 * (tracked in the database, so once on any device). A successful check is
 * remembered per browser session to avoid a call on every page; a failed one
 * retries on the next page.
 */
export function SignupBonus({ accountKey }: { accountKey: string }) {
  const router = useRouter()
  const reduceMotion = useReducedMotion()
  const [amount, setAmount] = useState(0)

  useEffect(() => {
    // v2: the database now decides when to celebrate (once per account), so
    // ignore keys saved by the earlier per-session check.
    const storageKey = `d2h-signup-bonus-v2:${accountKey}`
    try {
      if (sessionStorage.getItem(storageKey)) return
    } catch {
      // Storage blocked (private mode): the server call is idempotent anyway.
    }
    claimOnce(accountKey)
      .then((result) => {
        if (result.status === "error") {
          claims.delete(accountKey) // let the next page retry
          return
        }
        try {
          sessionStorage.setItem(storageKey, "1")
        } catch {}
        if (result.status === "credited") {
          setAmount(result.amount)
          router.refresh() // wallet balance on the current page
        }
      })
      .catch(() => claims.delete(accountKey))
  }, [accountKey, router])

  const close = () => setAmount(0)

  return (
    <Dialog open={amount > 0} onOpenChange={(open) => (open ? null : close())}>
      <DialogContent className="gap-4 overflow-hidden bg-linear-to-b from-brand-100 via-brand-50 to-card text-center sm:max-w-sm">
        <div className="relative mx-auto flex h-44 w-full items-center justify-center">
          {amount > 0 && !reduceMotion ? (
            <LottieSvg
              src={CELEBRATION}
              loop={false}
              autoplay
              aria-hidden
              className="pointer-events-none absolute inset-0 m-auto size-72 -translate-y-6"
            />
          ) : null}
          <motion.div
            initial={reduceMotion ? false : { scale: 0.2, rotate: -25, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={springMomentum}
            className="relative flex size-28 flex-col items-center justify-center rounded-full bg-linear-to-br from-brand-500 to-destructive text-white shadow-xl shadow-brand-500/40"
          >
            <HugeiconsIcon icon={Wallet01Icon} strokeWidth={1.8} className="size-7" />
            <span className="mt-0.5 text-2xl leading-none font-black tabular-nums">{formatRupees(amount)}</span>
          </motion.div>
        </div>
        <DialogTitle className="text-2xl font-extrabold tracking-tight">Congratulations! 🎉</DialogTitle>
        <DialogDescription className="text-sm text-foreground/80">
          <span className="font-bold text-primary">{formatRupees(amount)}</span> has been added to your
          Direct2Hub wallet for signing up. Use it on any order at checkout — it&apos;s optional.
        </DialogDescription>
        <div className="flex flex-col gap-2">
          <Button size="lg" className="h-11 text-base font-bold" onClick={close}>
            Start shopping
          </Button>
          <Button
            variant="ghost"
            size="sm"
            render={<Link href="/account/wallet" onClick={close} />}
            nativeButton={false}
          >
            View my wallet
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
