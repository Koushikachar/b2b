"use client"

import { useState } from "react"
import Link from "next/link"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowRight01Icon, CrownIcon, FireIcon } from "@hugeicons/core-free-icons"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import { ProductCard, type ProductCardData } from "@/components/storefront/product-card"
import { SHOWCASES, type ShowcaseKind } from "@/lib/showcase"
import { cn } from "@/lib/utils"

const ICONS = { winning: CrownIcon, "hot-selling": FireIcon } as const
// Phones show ~2.4 cards (the next one peeks); beside the desktop tile, 4-5.
const ITEM = "basis-[42%] pl-3 sm:basis-1/3 md:basis-1/4 xl:basis-1/5"
const SIZES = "(min-width: 1280px) 190px, (min-width: 768px) 24vw, (min-width: 640px) 32vw, 40vw"
const ARROW =
  "static size-8 translate-none border-white/40 bg-white/15 text-white backdrop-blur-sm hover:bg-white/30 hover:text-white disabled:opacity-40"

/**
 * Winning / Hot Selling. Each tab pairs a bold gradient feature
 * tile (title, pitch, View all, arrows) with a product rail: on desktop the
 * tile stands beside the rail, on phones it is a slim strip above a swipeable
 * rail. Arrows live in the tile, so they never cover a photo or a name.
 */
export function ShowcaseTabs({ rows }: { rows: { kind: ShowcaseKind; cards: ProductCardData[] }[] }) {
  const [active, setActive] = useState<ShowcaseKind>(rows[0].kind)

  return (
    <section aria-label="Featured products" className="mx-auto w-full max-w-7xl px-4 py-2">
      <div className="rounded-2xl border border-border bg-card p-3 shadow-sm sm:p-4">
        <Tabs value={active} onValueChange={(value) => setActive(value as ShowcaseKind)}>
          {rows.length > 1 ? (
            <TabsList className="mb-3 h-auto! max-w-full overflow-x-auto [scrollbar-width:none] max-sm:w-full">
              {rows.map(({ kind }) => (
                <TabsTrigger key={kind} value={kind} className="h-8 shrink-0 gap-1 px-2 text-xs font-semibold max-sm:flex-1 sm:gap-1.5 sm:px-3 sm:text-sm">
                  {/* Icons drop on the narrowest phones (folded foldables) so all tabs fit. */}
                  <HugeiconsIcon icon={ICONS[kind]} strokeWidth={2} className="size-4 max-[359px]:hidden" />
                  {SHOWCASES[kind].tab}
                </TabsTrigger>
              ))}
            </TabsList>
          ) : null}
          {rows.map(({ kind, cards }) => {
            const config = SHOWCASES[kind]
            return (
              <TabsContent key={kind} value={kind}>
                <Carousel opts={{ align: "start", loop: false }}>
                  <div className="grid gap-3 lg:grid-cols-[13.5rem_minmax(0,1fr)] lg:gap-4">
                    {/* Feature tile: strip on phones/tablets, tall tile on desktop. */}
                    <div
                      className={cn(
                        "relative flex items-center gap-3 overflow-hidden rounded-xl bg-linear-to-br px-4 py-3 text-white lg:flex-col lg:items-start lg:justify-between lg:p-5",
                        config.tile,
                      )}
                    >
                      <HugeiconsIcon
                        icon={ICONS[kind]}
                        strokeWidth={1.5}
                        aria-hidden
                        className="pointer-events-none absolute -right-4 -bottom-5 size-24 text-white/15 lg:size-40"
                      />
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/20 lg:size-11">
                        <HugeiconsIcon icon={ICONS[kind]} strokeWidth={2} className="size-5 lg:size-6" />
                      </span>
                      <div className="relative min-w-0 flex-1 lg:flex-none">
                        <h2 className="truncate text-base leading-tight font-extrabold tracking-tight lg:text-2xl lg:whitespace-normal">
                          {config.title}
                        </h2>
                        <p className="mt-0.5 hidden truncate text-xs text-white/85 sm:block lg:mt-2 lg:text-sm lg:whitespace-normal">
                          {config.pitch}
                        </p>
                      </div>
                      <div className="relative flex shrink-0 items-center gap-2 lg:w-full lg:justify-between">
                        <Link
                          href={`/collections/${kind}`}
                          className="press flex items-center gap-0.5 rounded-md bg-white px-3 py-1.5 text-xs font-bold whitespace-nowrap text-foreground shadow-xs hover:bg-white/90 lg:text-sm"
                        >
                          View all
                          <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2.5} className="size-4" />
                        </Link>
                        {cards.length > 1 ? (
                          <div className="hidden items-center gap-1.5 lg:flex">
                            <CarouselPrevious variant="outline" className={ARROW} />
                            <CarouselNext variant="outline" className={ARROW} />
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <CarouselContent className="-ml-3">
                      {cards.map((product, index) => (
                        <CarouselItem key={product.id} className={ITEM}>
                          <ProductCard product={product} sizes={SIZES} priority={index < 2} />
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                  </div>
                </Carousel>
              </TabsContent>
            )
          })}
        </Tabs>
      </div>
    </section>
  )
}
