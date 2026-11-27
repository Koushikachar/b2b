"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import { RepeatIcon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import { reorderOrder } from "@/lib/buyer/reorder-actions"
import { announceCartCount } from "@/lib/cart-count-event"

/** Put this order's products back in the cart, then open the cart. */
export function ReorderButton({ orderId }: { orderId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  return (
    <Button
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await reorderOrder(orderId)
          if (!result.ok) {
            toast.add({ type: "error", title: "Couldn't order again", description: result.message })
            return
          }
          announceCartCount(result.cartCount)
          toast.add({ type: "success", title: result.message })
          router.push("/cart")
        })
      }
    >
      {pending ? <Spinner className="size-4" /> : <HugeiconsIcon icon={RepeatIcon} strokeWidth={2} />}
      Order again
    </Button>
  )
}
