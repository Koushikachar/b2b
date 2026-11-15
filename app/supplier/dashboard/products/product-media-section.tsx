import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  CheckmarkCircle01Icon,
  CloudUploadIcon,
  Delete02Icon,
  DragDropIcon,
  Edit02Icon,
  PlusSignIcon,
  StarIcon,
} from "@hugeicons/core-free-icons";
import {
  Attachment,
  AttachmentActions,
  AttachmentAction,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
} from "@/components/ui/attachment";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FormSection } from "@/components/dashboard/form-section";
import dynamic from "next/dynamic";
import { cn } from "cn";
import { MAX_PRODUCT_IMAGES, MIN_PRODUCT_IMAGES, existingImageKey, stagedImageKey, youtubeThumbUrl } from "@/lib/supplier/products";
import type { ExistingImage, FieldErrorHelpers } from "./product-form-types";

const ImageCropModal = dynamic(
  () => import("@/components/dashboard/image-crop-modal").then((m) => m.ImageCropModal),
  { ssr: false },
);

type GalleryItem =
  | {
      key: string;
      kind: "existing";
      url: string;
      name: string;
      meta: string;
      image: ExistingImage;
    }
  | {
      key: string;
      kind: "staged";
      url: string;
      name: string;
      meta: string;
      file: File;
      index: number;
    };

export function ProductMediaSection({
  fileInputRef,
  onFilesPicked,
  existingImages,
  newFiles,
  previewUrls,
  removedImagePaths,
  totalImages,
  canAddMore,
  orderedKeys,
  onReorder,
  onMakePrimary,
  onRemoveStaged,
  onRemoveExisting,
  onReplaceStaged,
  onReplaceExisting,
  productImageUrl,
  youtubeUrl,
  onYoutubeChange,
  youtubeId,
  invalidFor,
  errorFor,
}: {
  fileInputRef: RefObject<HTMLInputElement | null>;
  onFilesPicked: (files: File[]) => void;
  existingImages: ExistingImage[];
  newFiles: File[];
  previewUrls: string[];
  removedImagePaths: string[];
  totalImages: number;
  canAddMore: boolean;
  /** Gallery keys in display order; the first one is the cover. */
  orderedKeys: string[];
  onReorder: (keys: string[]) => void;
  onMakePrimary: (key: string) => void;
  onRemoveStaged: (index: number) => void;
  onRemoveExisting: (path: string) => void;
  onReplaceStaged: (index: number, file: File) => void;
  onReplaceExisting: (path: string, file: File) => void;
  productImageUrl: (path: string) => string;
  youtubeUrl: string;
  onYoutubeChange: (value: string) => void;
  youtubeId: string | null;
  invalidFor: FieldErrorHelpers["invalidFor"];
  errorFor: FieldErrorHelpers["errorFor"];
}) {
  const visibleExisting = useMemo(
    () => existingImages.filter((img) => !removedImagePaths.includes(img.path)),
    [existingImages, removedImagePaths],
  );
  const primaryImageKey = orderedKeys[0] ?? null;
  const unordered = useMemo<GalleryItem[]>(
    () => [
      ...visibleExisting.map((image, index) => ({
        key: existingImageKey(image.path),
        kind: "existing" as const,
        url: productImageUrl(image.path),
        name: `Saved image ${index + 1}`,
        meta: "Stored in your gallery",
        image,
      })),
      ...newFiles.map((file, index) => ({
        key: stagedImageKey(index),
        kind: "staged" as const,
        url: previewUrls[index] ?? "",
        name: file.name,
        meta: `${Math.max(1, Math.round(file.size / 1024))} KB · ready to upload`,
        file,
        index,
      })),
    ],
    [visibleExisting, newFiles, previewUrls, productImageUrl],
  );
  const gallery = useMemo(
    () => [...unordered].sort((a, b) => orderedKeys.indexOf(a.key) - orderedKeys.indexOf(b.key)),
    [unordered, orderedKeys],
  );
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const selected =
    gallery.find((item) => item.key === selectedKey) ??
    gallery.find((item) => item.key === primaryImageKey) ??
    gallery[0] ??
    null;
  const selectedIndex = selected ? gallery.findIndex((item) => item.key === selected.key) : -1;

  // Drag-to-reorder with pointer events, so mouse, pen and touch all work.
  const [dragKey, setDragKey] = useState<string | null>(null);
  const dragStart = useRef<{ x: number; y: number; moved: boolean } | null>(null);

  function moveKey(key: string, toIndex: number) {
    const keys = gallery.map((item) => item.key).filter((k) => k !== key);
    keys.splice(Math.max(0, Math.min(toIndex, keys.length)), 0, key);
    onReorder(keys);
  }

  function onThumbPointerDown(e: ReactPointerEvent<HTMLButtonElement>, key: string) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStart.current = { x: e.clientX, y: e.clientY, moved: false };
    setDragKey(key);
  }

  function onThumbPointerMove(e: ReactPointerEvent<HTMLButtonElement>) {
    const start = dragStart.current;
    if (!dragKey || !start) return;
    if (!start.moved && Math.hypot(e.clientX - start.x, e.clientY - start.y) < 6) return;
    start.moved = true;
    const over = document
      .elementFromPoint(e.clientX, e.clientY)
      ?.closest<HTMLElement>("[data-image-key]")?.dataset.imageKey;
    if (!over || over === dragKey) return;
    moveKey(dragKey, gallery.findIndex((item) => item.key === over));
  }

  function endDrag() {
    setDragKey(null);
  }
  const [cropTarget, setCropTarget] = useState<
    { kind: "existing"; path: string } | { kind: "staged"; index: number } | null
  >(null);
  const [cropSource, setCropSource] = useState<string | null>(null);
  const [cropName, setCropName] = useState<string | null>(null);

  function openExistingCrop(img: ExistingImage) {
    setCropTarget({ kind: "existing", path: img.path });
    setCropSource(productImageUrl(img.path));
    setCropName(img.path.split("/").pop() ?? "image.jpg");
  }

  function openStagedCrop(index: number) {
    setCropTarget({ kind: "staged", index });
    setCropSource(previewUrls[index]);
    setCropName(newFiles[index]?.name ?? "image");
  }

  function applyCrop(file: File) {
    if (cropTarget?.kind === "existing") onReplaceExisting(cropTarget.path, file);
    else if (cropTarget?.kind === "staged") onReplaceStaged(cropTarget.index, file);
    setCropTarget(null);
  }

  function openGalleryCrop(item: GalleryItem) {
    if (item.kind === "existing") openExistingCrop(item.image);
    else openStagedCrop(item.index);
  }

  function removeGalleryItem(item: GalleryItem) {
    if (item.kind === "existing") onRemoveExisting(item.image.path);
    else onRemoveStaged(item.index);
  }

  function onDrop(e: React.DragEvent<HTMLElement>) {
    e.preventDefault();
    onFilesPicked(Array.from(e.dataTransfer.files ?? []));
  }

  return (
    <FormSection
      id="product-media"
      title="Product media"
      description="JPG, PNG or WEBP, under 2 MB each. Add 3–8 images and choose which one is the primary cover. A YouTube walkthrough is optional."
      columns={1}
    >
      <FieldSet>
        <FieldLegend>Images</FieldLegend>
        <Field>
          <FieldLabel htmlFor="images">Product images</FieldLabel>
          <input
            ref={fileInputRef}
            id="images"
            name="images"
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            multiple
            hidden
            aria-invalid={invalidFor("images")}
            onChange={(e) => {
              const picked = Array.from(e.target.files ?? []);
              e.target.value = "";
              onFilesPicked(picked);
            }}
          />
          {totalImages === 0 ? (
            <FieldDescription>
              No images yet — add at least 3 clear photos before submitting for approval.
            </FieldDescription>
          ) : (
            <FieldDescription>
              {totalImages} of {MAX_PRODUCT_IMAGES} images
              {totalImages < MIN_PRODUCT_IMAGES ? ` — add at least ${MIN_PRODUCT_IMAGES - totalImages} more` : null}
            </FieldDescription>
          )}
          {errorFor("images")}
        </Field>
        {selected ? (
          <div className="rounded-lg border border-border bg-muted/20 p-3 sm:p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="relative mx-auto aspect-square w-full max-w-md overflow-hidden rounded-md border border-border bg-muted sm:mx-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  loading="lazy"
                  decoding="async"
                  src={selected.url}
                  alt={selected.name}
                  className="h-full w-full object-contain"
                />
                {selected.key === primaryImageKey ? (
                  <Badge className="absolute top-2 left-2 gap-1" variant="default">
                    <HugeiconsIcon icon={StarIcon} strokeWidth={2} className="size-3.5" />
                    Cover
                  </Badge>
                ) : null}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    Image {selectedIndex + 1} of {gallery.length} · {selected.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{selected.meta}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => openGalleryCrop(selected)}>
                    <HugeiconsIcon icon={Edit02Icon} strokeWidth={2} data-icon="inline-start" />
                    Edit
                  </Button>
                  {selected.key !== primaryImageKey ? (
                    <Button type="button" variant="outline" size="sm" onClick={() => onMakePrimary(selected.key)}>
                      <HugeiconsIcon icon={StarIcon} strokeWidth={2} data-icon="inline-start" />
                      Make cover
                    </Button>
                  ) : null}
                  {gallery.length > 1 ? (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        aria-label="Move image earlier"
                        disabled={selectedIndex <= 0}
                        onClick={() => moveKey(selected.key, selectedIndex - 1)}
                      >
                        <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        aria-label="Move image later"
                        disabled={selectedIndex >= gallery.length - 1}
                        onClick={() => moveKey(selected.key, selectedIndex + 1)}
                      >
                        <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
                      </Button>
                    </>
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => removeGalleryItem(selected)}
                  >
                    <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} data-icon="inline-start" />
                    Remove
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Image 1 is the cover used in listings, search and product cards. Buyers see the
                  rest in this order.
                </p>
              </div>
            </div>
            {gallery.length > 1 ? (
              <div className="mt-4">
                <p className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <HugeiconsIcon icon={DragDropIcon} strokeWidth={2} className="size-3.5 shrink-0" />
                  Drag images to change their order. Image 1 is the cover.
                </p>
                <ol className="grid grid-cols-4 gap-2 min-[420px]:grid-cols-5 sm:grid-cols-8">
                  {gallery.map((item, index) => {
                    const isSelected = item.key === selected.key;
                    const isPrimary = item.key === primaryImageKey;
                    return (
                      <li key={item.key} data-image-key={item.key}>
                        <button
                          type="button"
                          onPointerDown={(e) => onThumbPointerDown(e, item.key)}
                          onPointerMove={onThumbPointerMove}
                          onPointerUp={endDrag}
                          onPointerCancel={endDrag}
                          onClick={() => {
                            if (!dragStart.current?.moved) setSelectedKey(item.key);
                          }}
                          aria-label={`Image ${index + 1}${isPrimary ? " (cover)" : ""}. Select to preview, drag to reorder.`}
                          aria-current={isSelected}
                          className={cn(
                            "relative block aspect-square w-full cursor-grab touch-none overflow-hidden rounded-md border-2 bg-muted outline-none select-none focus-visible:ring-[3px] focus-visible:ring-ring/50 active:cursor-grabbing",
                            isSelected ? "border-primary" : "border-border hover:border-primary/50",
                            item.key === dragKey && "scale-95 opacity-60 shadow-lg",
                          )}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            loading="lazy"
                            decoding="async"
                            draggable={false}
                            src={item.url}
                            alt=""
                            className="pointer-events-none h-full w-full object-cover"
                          />
                          <span className="absolute right-1 bottom-1 flex size-5 items-center justify-center rounded-sm bg-foreground/70 text-[11px] font-bold text-background tabular-nums">
                            {index + 1}
                          </span>
                          {isPrimary ? (
                            <span className="absolute top-1 left-1 flex size-5 items-center justify-center rounded-sm bg-primary text-primary-foreground">
                              <HugeiconsIcon icon={StarIcon} strokeWidth={2} className="size-3.5" />
                              <span className="sr-only">Cover</span>
                            </span>
                          ) : null}
                          {isSelected ? (
                            <span className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-sm bg-primary text-primary-foreground">
                              <HugeiconsIcon icon={CheckmarkCircle01Icon} strokeWidth={2} className="size-3.5" />
                              <span className="sr-only">Selected</span>
                            </span>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </div>
            ) : null}
          </div>
        ) : null}
        {canAddMore ? (
          <Empty
            className="border"
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
          >
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <HugeiconsIcon icon={CloudUploadIcon} strokeWidth={2} />
              </EmptyMedia>
              <EmptyTitle>Upload product images</EmptyTitle>
              <EmptyDescription>
                JPG, PNG or WEBP, under 2 MB each · {MAX_PRODUCT_IMAGES - totalImages} slot
                {MAX_PRODUCT_IMAGES - totalImages === 1 ? "" : "s"} left. You can also drag
                &amp; drop files here.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} data-icon="inline-start" />
                Add images
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <FieldDescription>
            You&apos;ve reached the {MAX_PRODUCT_IMAGES}-image limit. Remove one to add another, or re-crop an existing image.
          </FieldDescription>
        )}
      </FieldSet>
      <FieldSet>
        <FieldLegend>Video (optional)</FieldLegend>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="youtube_url">YouTube link</FieldLabel>
            <Input id="youtube_url" name="youtube_url" type="url" maxLength={200} aria-invalid={invalidFor("youtube_url")} value={youtubeUrl} onChange={(e) => onYoutubeChange(e.target.value)} placeholder="https://www.youtube.com/watch?v=…" />
            <FieldDescription>Link only — we never upload video files.</FieldDescription>
            {errorFor("youtube_url")}
          </Field>
          {youtubeId ? (
            <Field>
              <FieldLabel>Video preview</FieldLabel>
              <AttachmentGroup>
                <Attachment orientation="horizontal" state="done">
                  <AttachmentMedia variant="image">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img loading="lazy" decoding="async" src={youtubeThumbUrl(youtubeId)} alt="YouTube preview" />
                  </AttachmentMedia>
                  <AttachmentContent>
                    <AttachmentTitle>Video attached</AttachmentTitle>
                    <AttachmentDescription>{youtubeId}</AttachmentDescription>
                  </AttachmentContent>
                  <AttachmentActions>
                    <AttachmentAction
                      aria-label="Watch video on YouTube"
                      render={<a href={youtubeUrl} target="_blank" rel="noopener noreferrer" />}
                      nativeButton={false}
                    >
                      <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
                    </AttachmentAction>
                  </AttachmentActions>
                </Attachment>
              </AttachmentGroup>
            </Field>
          ) : null}
        </FieldGroup>
      </FieldSet>
      <ImageCropModal
        open={cropTarget !== null}
        source={cropSource}
        sourceName={cropName}
        title="Edit product image"
        onClose={() => setCropTarget(null)}
        onApplied={applyCrop}
      />
    </FormSection>
  );
}