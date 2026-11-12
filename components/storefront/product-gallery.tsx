"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle01Icon } from "@hugeicons/core-free-icons";
import { publicTransformedImageUrl } from "@/lib/storage";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";

export type GalleryImage = {
  id: string;
  path: string;
  sort: number;
  alt: string | null;
};

export function ProductGallery({
  images,
  title,
  negotiable,
}: {
  images: GalleryImage[];
  title: string;
  negotiable: boolean;
}) {
  const [active, setActive] = useState(0);
  const [api, setApi] = useState<CarouselApi>();

  // Swipes (and thumbnail clicks) move the carousel; mirror its position so
  // the thumbnail highlight and dots follow.
  useEffect(() => {
    if (!api) return;
    const onSelect = () => setActive(api.selectedScrollSnap());
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  function show(index: number) {
    setActive(index);
    api?.scrollTo(index);
  }

  return (
    <div>
      {/* Main image first in the DOM (mobile order), thumbnails pulled to the
          left rail on desktop via `lg:order-first`. */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
        <div className="relative -mx-4 overflow-hidden bg-card sm:mx-0 sm:rounded-lg sm:border sm:border-border lg:max-w-[640px] lg:flex-1">
          {images.length > 0 ? (
            <Carousel setApi={setApi} opts={{ loop: images.length > 1 }} aria-label={`${title} images`}>
              <CarouselContent className="ml-0">
                {images.map((img, i) => (
                  <CarouselItem key={img.id} className="pl-0">
                    {/* Square frame; the whole photo fits inside (no zoom/crop). */}
                    <div className="relative aspect-square">
                      <Image
                        src={publicTransformedImageUrl("product_images", img.path, {
                          width: 1200,
                        })}
                        alt={img.alt ?? title}
                        fill
                        priority={i === 0}
                        sizes="(min-width: 1024px) 640px, 100vw"
                        className="object-contain"
                      />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          ) : (
            <div className="flex aspect-square items-center justify-center bg-muted text-sm text-muted-foreground">
              No image
            </div>
          )}
          {negotiable && (
            <span className="absolute left-3 top-3 rounded-sm bg-primary px-2 py-1 text-xs font-bold text-primary-foreground">
              Negotiable
            </span>
          )}
          {/* Position dots (mobile, where thumbnails are secondary to swiping). */}
          {images.length > 1 && (
            <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5 lg:hidden" aria-hidden>
              {images.map((img, i) => (
                <span
                  key={img.id}
                  className={`size-1.5 rounded-full transition-colors ${
                    i === active ? "bg-primary" : "bg-foreground/25"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
        {images.length > 1 && (
          <div className="flex gap-2.5 overflow-x-auto pb-1 lg:order-first lg:max-h-[500px] lg:w-16 lg:shrink-0 lg:flex-col lg:overflow-y-auto lg:pb-0">
            {images.map((img, i) => (
              <button
                key={img.id}
                type="button"
                onClick={() => show(i)}
                aria-label={`View image ${i + 1}`}
                aria-current={i === active}
                className={`relative size-16 shrink-0 overflow-hidden rounded-md border-2 bg-muted outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 ${
                  i === active
                    ? "border-primary"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <Image
                  src={publicTransformedImageUrl("product_images", img.path, {
                    width: 128,
                  })}
                  alt=""
                  fill
                  sizes="64px"
                  className="object-cover"
                />
                {i === active && (
                  <span className="absolute right-1 bottom-1 flex size-5 items-center justify-center rounded-sm bg-primary text-primary-foreground">
                    <HugeiconsIcon
                      icon={CheckmarkCircle01Icon}
                      strokeWidth={2}
                      className="size-3.5"
                    />
                    <span className="sr-only">Selected</span>
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
