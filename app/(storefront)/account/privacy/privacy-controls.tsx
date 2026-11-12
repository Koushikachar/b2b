"use client"

import { useOptimistic, useTransition } from "react"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/toast"
import { setMarketingOptIn } from "@/lib/buyer/account-actions"

export function MarketingToggle({ initial }: { initial: boolean }) {
  const [, startTransition] = useTransition()
  const [checked, setChecked] = useOptimistic(initial)

  return (
    <label className="flex min-h-14 cursor-pointer items-center gap-4 px-5 py-3">
      <span className="flex-1">
        <span className="block text-sm font-semibold">Offers & festival events</span>
        <span className="block text-xs text-muted-foreground">
          Deal alerts and event invites like Light a Diya. Order updates are always sent.
        </span>
      </span>
      <Switch
        checked={checked}
        onCheckedChange={(next) =>
          startTransition(async () => {
            setChecked(next)
            const result = await setMarketingOptIn(next)
            toast.add({ type: result.ok ? "success" : "error", title: result.message })
          })
        }
      />
    </label>
  )
}
