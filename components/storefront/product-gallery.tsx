"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle01Icon, PlayIcon } from "@hugeicons/core-free-icons";
import { publicTransformedImageUrl } from "@/lib/storage";
import { youtubeEmbedUrl, youtubeThumbUrl } from "@/lib/supplier/products";
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
  youtubeId = null,
}: {
  images: GalleryImage[];
  title: string;
  negotiable: boolean;
  /** Supplier's YouTube walkthrough, shown as the last slide. */
  youtubeId?: string | null;
}) {
  const [active, setActive] = useState(0);
  const slideCount = images.length + (youtubeId ? 1 : 0);
  const videoIndex = youtubeId ? images.length : -1;
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
        <div className="relative -mx-4 overflow-hidden bg-white sm:mx-0 sm:rounded-2xl sm:border sm:border-border lg:max-w-[720px] lg:flex-1">
          {slideCount > 0 ? (
            <Carousel setApi={setApi} opts={{ loop: slideCount > 1 }} aria-label={`${title} images`}>
              <CarouselContent className="ml-0">
                {images.map((img, i) => (
                  <CarouselItem key={img.id} className="pl-0">
                    {/* Square frame showing the whole photo (never cropped/zoomed). */}
                    <div className="relative aspect-square bg-white">
                      <Image
                        src={publicTransformedImageUrl("product_images", img.path, {
                          // Square + contain: the whole photo, never cropped
                          // (the frame is square too).
                          width: 1200,
                          height: 1200,
                          fit: "contain",
                        })}
                        alt={img.alt ?? title}
                        fill
                        priority={i === 0}
                        sizes="(min-width: 1024px) 720px, 100vw"
                        className="object-contain"
                      />
                    </div>
                  </CarouselItem>
                ))}
                {youtubeId ? (
                  <CarouselItem key="video" className="pl-0">
                    <div className="relative flex aspect-square items-center bg-foreground">
                      {/* Only mount the player once its slide is shown, so the
                          page never loads YouTube until the buyer asks for it. */}
                      {active === videoIndex ? (
                        <iframe
                          src={`${youtubeEmbedUrl(youtubeId)}?autoplay=1&rel=0`}
                          title={`${title} video`}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          className="aspect-video w-full border-0"
                        />
                      ) : (
                        <Image
                          src={youtubeThumbUrl(youtubeId)}
                          alt={`${title} video`}
                          fill
                          sizes="(min-width: 1024px) 720px, 100vw"
                          className="object-contain"
                          unoptimized
                        />
                      )}
                    </div>
                  </CarouselItem>
                ) : null}
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
          {slideCount > 1 && (
            <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5 lg:hidden" aria-hidden>
              {Array.from({ length: slideCount }, (_, i) => (
                <span
                  key={i}
                  className={`size-1.5 rounded-full transition-colors ${
                    i === active ? "bg-primary" : "bg-foreground/25"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
        {slideCount > 1 && (
          <div className="no-scrollbar flex gap-2.5 overflow-x-auto p-0.5 pb-1 lg:order-first lg:max-h-[720px] lg:w-[76px] lg:shrink-0 lg:flex-col lg:overflow-y-auto lg:pb-0.5">
            {images.map((img, i) => (
              <button
                key={img.id}
                type="button"
                onClick={() => show(i)}
                aria-label={`View image ${i + 1}`}
                aria-current={i === active}
                className={`relative aspect-square w-[68px] shrink-0 overflow-hidden rounded-xl border-2 bg-white outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 ${
                  i === active
                    ? "border-primary"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <Image
                  src={publicTransformedImageUrl("product_images", img.path, {
                    width: 128,
                    height: 128,
                    fit: "contain",
                  })}
                  alt=""
                  fill
                  sizes="64px"
                  className="object-contain"
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
            {youtubeId ? (
              <button
                type="button"
                onClick={() => show(videoIndex)}
                aria-label="Play product video"
                aria-current={active === videoIndex}
                className={`relative aspect-square w-[68px] shrink-0 overflow-hidden rounded-xl border-2 bg-white outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 ${
                  active === videoIndex ? "border-primary" : "border-border hover:border-primary/50"
                }`}
              >
                <Image src={youtubeThumbUrl(youtubeId)} alt="" fill sizes="64px" className="object-cover" unoptimized />
                <span className="absolute inset-0 flex items-center justify-center bg-foreground/30">
                  <span className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
                    <HugeiconsIcon icon={PlayIcon} strokeWidth={2} className="size-4" />
                  </span>
                </span>
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
