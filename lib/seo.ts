// Structured data, FAQ answers and llms.txt for search engines and AI answer
// engines (Google, ChatGPT, Perplexity, Gemini). Pure functions: every fact
// here comes from the app's own rules (cart minimum, Terms page), never invented.
import { COMPANY } from "@/lib/company"
import { MIN_CART_VALUE } from "@/lib/buyer/cart"
import { stripHtml } from "@/lib/supplier/rich-text"

const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`

/**
 * Share image for pages that set their own openGraph: Next.js replaces the
 * whole openGraph object, which drops app/opengraph-image unless it is listed
 * again (those pages showed no picture when shared on WhatsApp / social).
 */
export const DEFAULT_OG_IMAGE = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: "Direct2Hub — Wholesale sourcing from verified Indian suppliers",
}

/** home: also shown in the home page FAQ (the most asked questions). */
export type Faq = { question: string; answer: string; home?: boolean }

/** Shown on /faq and sent as FAQPage schema. Short, self-contained answers AI engines can quote. */
export const FAQS: Faq[] = [
  {
    question: "What is Direct2Hub?",
    answer: `Direct2Hub is an Indian B2B ecommerce sourcing and enablement platform run by ${COMPANY.legalName} from Kundapura, Karnataka. It helps ecommerce sellers, resellers, retailers, dropshippers and small business owners source wholesale products across 13 categories, including home essentials, kitchen and dining, beauty and personal care, electronics accessories, automotive accessories and toys.`,
    home: true,
  },
  {
    question: "Who can buy from Direct2Hub?",
    answer:
      "Ecommerce sellers, retail shop owners, resellers, dropshippers and small business owners can buy from Direct2Hub. Create a free account with your email or Google account and start ordering.",
    home: true,
  },
  {
    question: "What is Direct2Hub Core?",
    answer:
      "Direct2Hub Core is Direct2Hub's own wholesale store of ready-to-ship products. Orders are managed and fulfilled by Direct2Hub from its warehouse in Surat, Gujarat.",
    home: true,
  },
  {
    question: "Does Direct2Hub have winning products?",
    answer:
      "Yes. Direct2Hub highlights winning and hot selling products picked by sellers, to help ecommerce sellers and resellers find products worth reselling. See them under Winning Products and Hot Selling Products on the home page.",
    home: true,
  },
  {
    question: "Can I source products for Amazon, Flipkart and Meesho?",
    answer:
      "Yes. Marketplace sellers source wholesale products on Direct2Hub for their online stores, including Amazon, Flipkart, Meesho and Instagram shops. Check each marketplace's own rules for the products you list there.",
    home: true,
  },
  {
    question: "What is the minimum order value on Direct2Hub?",
    home: true,
    answer: `The minimum cart value is ${rupees(MIN_CART_VALUE)} per order. Each product also shows its own minimum order quantity (MOQ), and many products can be ordered from a single piece, so you can mix several products to reach ${rupees(MIN_CART_VALUE)}.`,
  },
  {
    question: "Do I get a GST invoice for my order?",
    answer:
      "Yes. GST is shown separately at checkout and every order has a GST invoice you can view and download as a PDF from the order page. Product prices on the site are shown before GST.",
  },
  {
    question: "How long does delivery take and what does shipping cost?",
    home: true,
    answer: `Orders are shipped through ${COMPANY.shippingPartner} and usually arrive in 5–7 days, depending on your location. Shipping is charged separately from the product price; the stated rate is ₹60 under ${COMPANY.shippingPartner}'s volumetric-weight billing, and the final charge depends on the shipment.`,
  },
  {
    question: "Are shipments protected against damage?",
    home: true,
    answer: `Yes. Eligible orders shipped through ${COMPANY.shippingPartner} include free delivery damage protection covering up to 100% of eligible damage, subject to its terms. Customers outside Surat must record a clear, uninterrupted parcel-opening video showing the sealed parcel from all sides to support a claim.`,
  },
  {
    question: "How do I pay for an order?",
    answer:
      "Place the order with your delivery address; the supplier reviews and accepts it, and you then pay the product price through Direct2Hub. The order page shows each step — reviewed, payment confirmed, processing, shipped and delivered — and updates live.",
  },
  {
    question: "Can I track my order?",
    answer:
      "Yes. Every order has its own page with a step-by-step status, and once it ships the carrier name and tracking reference appear there. You also get a notification at each step, including when the order is shipped and delivered.",
  },
  {
    question: "What is the return and refund policy?",
    answer:
      "Returns, refunds and replacements follow the selling store's policy and applicable law; each product page shows its return policy. Defective, incorrect or misdescribed products are handled through a claim with the order ID, photos and, where required, the parcel-opening video.",
  },
  {
    question: "Is there a welcome offer for new buyers?",
    answer:
      "Yes. New buyer accounts receive a ₹100 welcome bonus in the Direct2Hub wallet, which can be used towards an order at checkout.",
  },
  {
    question: "How can I sell my products on Direct2Hub?",
    answer:
      "Suppliers register a business account, complete business verification, and then list products with photos, prices, MOQ, HSN code and GST rate. Orders, payments, shipping and invoices are managed from the supplier dashboard.",
  },
  {
    question: "How do I contact Direct2Hub support?",
    answer: `Email ${COMPANY.supportEmail} or message Direct2Hub on WhatsApp from any product page. The registered office is ${COMPANY.office}.`,
  },
]

export function faqJsonLd(faqs: Faq[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  }
}

export type ProductSeoInput = {
  id: string
  title: string
  description: string | null
  brand: string | null
  sku: string | null
  category: { name: string; slug: string } | null
  imageUrls: string[]
  /** Buyer price before GST; null = no live price, so no Offer is sent. */
  price: number | null
  outOfStock: boolean
}

/** Product + BreadcrumbList for a product page. */
export function productJsonLd(p: ProductSeoInput, siteUrl: string) {
  const url = `${siteUrl}/products/${p.id}`
  const description = p.description ? stripHtml(p.description).slice(0, 500) : ""
  const product = {
    "@type": "Product",
    "@id": `${url}#product`,
    name: p.title,
    url,
    ...(p.imageUrls.length ? { image: p.imageUrls.slice(0, 5) } : {}),
    ...(description ? { description } : {}),
    ...(p.sku ? { sku: p.sku } : {}),
    ...(p.category ? { category: p.category.name } : {}),
    brand: { "@type": "Brand", name: p.brand || COMPANY.brand },
    ...(p.price != null
      ? {
          offers: {
            "@type": "Offer",
            url,
            price: p.price,
            priceCurrency: "INR",
            priceSpecification: {
              "@type": "UnitPriceSpecification",
              price: p.price,
              priceCurrency: "INR",
              valueAddedTaxIncluded: false,
            },
            availability: p.outOfStock ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
            itemCondition: "https://schema.org/NewCondition",
            seller: { "@type": "Organization", name: COMPANY.brand, url: siteUrl },
          },
        }
      : {}),
  }
  const crumbs = [
    { name: "Home", item: siteUrl },
    ...(p.category ? [{ name: p.category.name, item: `${siteUrl}/category/${p.category.slug}` }] : []),
    { name: p.title, item: url },
  ]
  return {
    "@context": "https://schema.org",
    "@graph": [
      product,
      {
        "@type": "BreadcrumbList",
        itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, ...c })),
      },
    ],
  }
}

/**
 * CollectionPage + ItemList + BreadcrumbList for a listing page (category,
 * Winning / Hot Selling, Under ₹X): which products the page lists, in order.
 * Names and links only: no prices, ratings or offers are claimed here.
 */
export function listingJsonLd(input: {
  siteUrl: string
  path: string
  name: string
  crumbs: { name: string; path: string }[]
  products: { id: string; title: string }[]
}) {
  const url = `${input.siteUrl}${input.path}`
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        url,
        name: input.name,
        isPartOf: { "@id": `${input.siteUrl}#website` },
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: input.products.length,
          itemListElement: input.products.map((product, i) => ({
            "@type": "ListItem",
            position: i + 1,
            url: `${input.siteUrl}/products/${product.id}`,
            name: product.title,
          })),
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: input.crumbs.map((crumb, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: crumb.name,
          item: `${input.siteUrl}${crumb.path}`,
        })),
      },
    ],
  }
}

/** Organization + WebSite for every page (who runs the site, how to search it). */
export function siteJsonLd(siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}#organization`,
        name: COMPANY.brand,
        legalName: COMPANY.legalName,
        url: siteUrl,
        // Who Direct2Hub is, in one paragraph AI engines can quote (owner's brief).
        description: `Direct2Hub is an Indian B2B ecommerce sourcing and enablement platform for ecommerce sellers, resellers, retailers, dropshippers and small business owners. Businesses source wholesale products across 13 categories, including winning and hot selling products, with an estimated 5–7 day delivery and delivery damage protection on eligible orders through its logistics partner, ${COMPANY.shippingPartner}.`,
        logo: `${siteUrl}/logo.png`,
        email: COMPANY.supportEmail,
        founder: { "@type": "Person", name: COMPANY.founder },
        address: {
          "@type": "PostalAddress",
          streetAddress: "Shop No. 39-07 & 30-B, P.V.S. Complex",
          addressLocality: "Kundapura",
          addressRegion: "Karnataka",
          postalCode: "576201",
          addressCountry: "IN",
        },
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "customer support",
          email: COMPANY.supportEmail,
          areaServed: "IN",
          availableLanguage: ["en", "hi"],
        },
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}#website`,
        name: COMPANY.brand,
        url: siteUrl,
        inLanguage: "en-IN",
        publisher: { "@id": `${siteUrl}#organization` },
        potentialAction: {
          "@type": "SearchAction",
          target: { "@type": "EntryPoint", urlTemplate: `${siteUrl}/products?q={search_term_string}` },
          "query-input": "required name=search_term_string",
        },
      },
    ],
  }
}

/** llms.txt (llmstxt.org): a plain-markdown map of the site for AI engines. */
export function llmsTxt(siteUrl: string, categories: { name: string; slug: string }[]) {
  const link = (name: string, path: string, note?: string) =>
    `- [${name}](${siteUrl}${path})${note ? `: ${note}` : ""}`
  return [
    `# ${COMPANY.brand}`,
    "",
    `> ${COMPANY.brand} is an Indian B2B wholesale marketplace (${COMPANY.legalName}, Kundapura, Karnataka). Businesses and resellers buy products in bulk from verified suppliers with live wholesale prices, a ${rupees(MIN_CART_VALUE)} minimum cart value, GST invoices, 5–7 day delivery via ${COMPANY.shippingPartner}, and free delivery damage protection on eligible shipments.`,
    "",
    "## Key pages",
    link("All products", "/products", "full wholesale catalogue with prices and MOQs"),
    link("Categories", "/categories"),
    link("FAQ", "/faq", "minimum order, GST invoices, delivery, payment, returns"),
    link("Services", "/services"),
    link("Suppliers", "/suppliers"),
    link("About", "/about"),
    link("Contact", "/contact"),
    link("Terms", "/terms", "pricing, shipping, damage protection, returns"),
    "",
    "## Categories",
    ...categories.map((c) => link(c.name, `/category/${c.slug}`)),
    "",
    "## Optional",
    link("Sitemap", "/sitemap.xml", "every product page"),
    "",
  ].join("\n")
}
