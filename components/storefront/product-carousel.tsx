"use client"

import { useEffect, useState } from "react"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel"
import {
  ProductCard,
  type ProductCardData,
} from "@/components/storefront/product-card"

/**
 * Horizontal product rail used by the homepage merchandising sections.
 * Shows whole ProductCards (image, price, add-to-cart) and keeps the same
 * arrow + dot affordances the reference design uses.
 */
export function ProductCarousel({
  products,
  sizes = "(min-width: 1024px) 18vw, (min-width: 640px) 30vw, 46vw",
  priorityCount = 0,
}: {
  products: ProductCardData[]
  sizes?: string
  priorityCount?: number
}) {
  const [api, setApi] = useState<CarouselApi>()
  const [selected, setSelected] = useState(0)
  const [snaps, setSnaps] = useState(0)

  useEffect(() => {
    if (!api) return
    const sync = () => {
      setSelected(api.selectedScrollSnap())
      setSnaps(api.scrollSnapList().length)
    }
    sync()
    api.on("select", sync)
    api.on("reInit", sync)
    return () => {
      api.off("select", sync)
      api.off("reInit", sync)
    }
  }, [api])

  if (products.length === 0) return null

  return (
    <Carousel setApi={setApi} opts={{ align: "start", loop: false }} className="relative">
      <CarouselContent className="-ml-2.5">
        {products.map((product, index) => (
          <CarouselItem
            key={product.id}
            className="basis-1/2 pl-2.5 sm:basis-1/3 md:basis-1/4 lg:basis-1/5"
          >
            <ProductCard
              product={product}
              priority={index < priorityCount}
              sizes={sizes}
            />
          </CarouselItem>
        ))}
      </CarouselContent>

      {products.length > 1 ? (
        <>
          <CarouselPrevious className="-left-4 z-10 hidden size-9 border-border bg-card shadow-sm hover:bg-muted md:inline-flex" />
          <CarouselNext className="-right-4 z-10 hidden size-9 border-border bg-card shadow-sm hover:bg-muted md:inline-flex" />
          <div className="mt-3 flex items-center justify-center gap-1.5">
            {Array.from({ length: snaps }, (_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => api?.scrollTo(index)}
                aria-label={`Go to slide ${index + 1}`}
                aria-current={index === selected}
                className={`size-1.5 rounded-full transition-colors ${
                  index === selected ? "bg-primary" : "bg-border"
                }`}
              />
            ))}
          </div>
        </>
      ) : null}
    </Carousel>
  )
}
