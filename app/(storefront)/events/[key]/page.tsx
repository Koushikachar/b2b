import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getAuthUser } from "@/lib/auth/session"
import {
  getPromoClaim,
  getPromoEventByKey,
} from "@/lib/buyer/account-queries"
import { PROMO_EVENT_THEMES, isPromoEventLive } from "@/lib/promotions"
import { Breadcrumbs } from "@/components/layout/breadcrumbs"
import { LightDiya } from "./light-diya"

type Props = { params: Promise<{ key: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { key } = await params
  const supabase = await createClient()
  const event = await getPromoEventByKey(supabase, key)
  if (!event) return {}
  const theme = PROMO_EVENT_THEMES[event.theme]
  return {
    title: `${event.title} — ${theme.tagline(event.maxReward)}`,
    alternates: { canonical: `/events/${key}` },
  }
}

const dateFmt = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  timeZone: "Asia/Kolkata",
})

export default async function PromoEventPage({ params }: Props) {
  const { key } = await params
  const supabase = await createClient()
  const [event, user] = await Promise.all([
    getPromoEventByKey(supabase, key),
    getAuthUser(supabase),
  ])
  if (!event) notFound()

  const theme = PROMO_EVENT_THEMES[event.theme]
  const reward = user ? await getPromoClaim(supabase, user.id, event.key) : null
  const live = isPromoEventLive(event)

  return (
    <div className="min-h-full bg-gradient-to-b from-brand-50 via-white to-white">
      <div className="mx-auto w-full max-w-xl px-4 py-5">
        <Breadcrumbs items={[{ label: "D2H Select", href: "/select" }, { label: event.title }]} />

        <header className="mt-2 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            {event.title}
          </h1>
          <p className="mx-auto mt-3 inline-block -skew-x-6 rounded-md bg-primary px-5 py-1.5 text-lg font-extrabold text-primary-foreground shadow-sm">
            <span className="inline-block skew-x-6">{theme.tagline(event.maxReward)}</span>
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            {dateFmt.format(new Date(event.startsAt))} – {dateFmt.format(new Date(event.endsAt))}
          </p>
        </header>

        <div className="mt-6">
          <LightDiya
            eventKey={event.key}
            heroImage={theme.heroImage}
            heroWidth={theme.heroImageWidth}
            heroHeight={theme.heroImageHeight}
            actionLabel={theme.actionLabel}
            signedIn={Boolean(user)}
            live={live}
            initialReward={reward}
          />
        </div>

        <section className="mt-5 rounded-xl border border-border bg-card p-4 text-sm">
          <h2 className="font-bold tracking-tight">How it works</h2>
          <p className="mt-1.5 leading-relaxed text-muted-foreground">{theme.instructions}</p>
        </section>
      </div>
    </div>
  )
}
