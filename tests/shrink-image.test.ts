import { describe, expect, it } from "vitest"
import { MAX_UPLOAD_IMAGE_BYTES, shouldReencodeImage } from "@/lib/shrink-image"

const file = (type: string, size: number) => ({ type, size })

describe("shouldReencodeImage (what the browser converts to JPEG before upload)", () => {
  it("leaves small JPEG, PNG and WebP photos untouched", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp"]) {
      expect(shouldReencodeImage(file(type, 100 * 1024))).toBe(false)
    }
  })

  it("shrinks large photos of an accepted type", () => {
    expect(shouldReencodeImage(file("image/jpeg", MAX_UPLOAD_IMAGE_BYTES + 1))).toBe(true)
  })

  it("converts other image formats even when small (the server only accepts JPEG/PNG/WebP: 415)", () => {
    for (const type of ["image/avif", "image/gif", "image/bmp", "image/heic"]) {
      expect(shouldReencodeImage(file(type, 50 * 1024))).toBe(true)
    }
  })

  it("never touches non-images", () => {
    expect(shouldReencodeImage(file("application/pdf", 5_000_000))).toBe(false)
    expect(shouldReencodeImage(file("", 5_000_000))).toBe(false)
  })
})
