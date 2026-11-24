import { describe, expect, it } from "vitest"
import { FAQS, faqJsonLd, llmsTxt, productJsonLd } from "@/lib/seo"

const product = {
  id: "p1",
  title: "Car Mug Cup",
  description: "<p>Spill-proof <strong>car</strong> mug.</p><ul><li><p>Fits cup holders</p></li></ul>",
  brand: null,
  sku: "CMC-01",
  category: { name: "Automotive Accessories", slug: "automotive-accessories" },
  imageUrls: ["https://img/1.jpg", "https://img/2.jpg"],
  price: 212.4,
  outOfStock: false,
}

describe("productJsonLd (Product + breadcrumb structured data)", () => {
  const graph = productJsonLd(product, "https://direct2hub.in")["@graph"] as Record<string, unknown>[]
  const item = graph.find((n) => n["@type"] === "Product")!
  const crumbs = graph.find((n) => n["@type"] === "BreadcrumbList")!

  it("sends a plain-text description, never HTML tags", () => {
    expect(item.description).toBe("Spill-proof car mug. Fits cup holders")
  })

  it("includes SKU, category, absolute URL and images", () => {
    expect(item).toMatchObject({
      sku: "CMC-01",
      category: "Automotive Accessories",
      url: "https://direct2hub.in/products/p1",
      image: ["https://img/1.jpg", "https://img/2.jpg"],
    })
  })

  it("reports the buyer price in INR, excluding GST, and in stock", () => {
    expect(item.offers).toMatchObject({
      "@type": "Offer",
      price: 212.4,
      priceCurrency: "INR",
      availability: "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: "Direct2Hub" },
    })
  })

  it("marks out-of-stock products as OutOfStock", () => {
    const out = productJsonLd({ ...product, outOfStock: true }, "https://direct2hub.in")["@graph"] as Record<string, unknown>[]
    expect((out[0].offers as Record<string, unknown>).availability).toBe("https://schema.org/OutOfStock")
  })

  it("leaves out the offer when there is no price (never invents one)", () => {
    const noPrice = productJsonLd({ ...product, price: null }, "https://direct2hub.in")["@graph"] as Record<string, unknown>[]
    expect(noPrice[0].offers).toBeUndefined()
  })

  it("builds Home > Category > Product breadcrumbs", () => {
    const names = (crumbs.itemListElement as { name: string; position: number }[]).map((c) => `${c.position}:${c.name}`)
    expect(names).toEqual(["1:Home", "2:Automotive Accessories", "3:Car Mug Cup"])
  })
})

describe("faqJsonLd", () => {
  it("turns every FAQ into a Question with a plain-text answer", () => {
    const ld = faqJsonLd(FAQS)
    expect(ld["@type"]).toBe("FAQPage")
    expect(ld.mainEntity).toHaveLength(FAQS.length)
    expect(ld.mainEntity[0]).toMatchObject({
      "@type": "Question",
      name: FAQS[0].question,
      acceptedAnswer: { "@type": "Answer", text: FAQS[0].answer },
    })
  })

  it("answers the minimum order question with the real cart minimum", () => {
    expect(FAQS.find((f) => /minimum order/i.test(f.question))?.answer).toMatch(/₹3,000/)
  })
})

describe("llmsTxt", () => {
  it("describes the site and links key pages and categories with absolute URLs", () => {
    const txt = llmsTxt("https://direct2hub.in", [{ name: "Kitchen & Dining", slug: "kitchen-dining" }])
    expect(txt.startsWith("# Direct2Hub\n")).toBe(true)
    expect(txt).toContain("[Kitchen & Dining](https://direct2hub.in/category/kitchen-dining)")
    expect(txt).toContain("https://direct2hub.in/faq")
    expect(txt).not.toContain("localhost")
  })
})
