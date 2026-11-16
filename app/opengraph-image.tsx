import { ImageResponse } from "next/og"
import { SITE_NAME } from "@/lib/site"

// Default share card for pages without their own (products use their photo).
export const alt = `${SITE_NAME} — Wholesale sourcing from verified Indian suppliers`
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #fff4ec 0%, #ffffff 55%, #ffe2cc 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 44, fontWeight: 800, color: "#ff6a00" }}>
          Direct2Hub
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 24,
            fontSize: 72,
            fontWeight: 800,
            lineHeight: 1.05,
            color: "#111827",
            maxWidth: 900,
          }}
        >
          Wholesale sourcing from verified Indian suppliers
        </div>
        <div style={{ display: "flex", marginTop: 28, fontSize: 32, color: "#4b5563" }}>
          Live pricing · Low MOQs · Buyer protection
        </div>
      </div>
    ),
    size,
  )
}
