"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

/** Safety net when the realtime socket is blocked or drops (proxies, sleep). */
const POLL_MS = 15_000

/**
 * Keeps an order page current without a manual reload: re-renders the
 * server page when this order changes (Supabase Realtime, RLS-scoped to the
 * viewer), every 15 s while the tab is visible, and when the tab comes back
 * into view. Renders nothing.
 */
export function OrderLiveRefresh({ orderId }: { orderId: string }) {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`order-${orderId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${orderId}` },
        () => router.refresh(),
      )
      .subscribe()

    const poll = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh()
    }, POLL_MS)

    const onVisible = () => {
      if (document.visibilityState === "visible") router.refresh()
    }
    document.addEventListener("visibilitychange", onVisible)

    return () => {
      window.clearInterval(poll)
      document.removeEventListener("visibilitychange", onVisible)
      void supabase.removeChannel(channel)
    }
  }, [orderId, router])

  return null
}
