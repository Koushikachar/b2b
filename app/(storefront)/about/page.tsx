import type { Metadata } from "next"
import Link from "next/link"
import { CompanyDetails, LegalList, LegalPage } from "@/components/storefront/legal-page"
import { COMPANY } from "@/lib/company"

export const metadata: Metadata = {
  title: "About Direct2Hub",
  description:
    "Direct2Hub is a B2B ecommerce sourcing and enablement platform: source smarter, sell better, grow faster.",
  alternates: { canonical: "/about" },
}

const linkClass = "font-semibold text-primary hover:underline"

export default function AboutPage() {
  return (
    <LegalPage
      title="About Direct2Hub"
      numbered={false}
      intro={
        <>
          <p className="text-base font-bold text-foreground">
            Your All-in-One Ecommerce Enablement Platform
          </p>
          <p className="font-semibold text-primary">Source Smarter. Sell Better. Grow Faster.</p>
          <p className="mt-2">
            Direct2Hub is a B2B ecommerce sourcing and enablement platform founded by{" "}
            {COMPANY.founder} and operated by {COMPANY.legalName}, a company incorporated in India
            on {COMPANY.incorporated}.
          </p>
          <p className="mt-2">
            We help ecommerce sellers, resellers, dropshippers, retailers, and entrepreneurs
            discover products, access sourcing solutions, and simplify their ecommerce business
            operations.
          </p>
          <p className="mt-2">
            Our goal is to make starting and growing an ecommerce business easier by bringing
            products, suppliers, and essential ecommerce services together on one platform.
          </p>
        </>
      }
      sections={[
        {
          title: "What We Do",
          body: (
            <>
              <p>
                Direct2Hub offers sourcing and business support solutions for sellers at different
                stages of their ecommerce journey. Our services include:
              </p>
              <LegalList
                items={[
                  <><strong>Product Sourcing:</strong> Discover products across multiple categories.</>,
                  <><strong>Bulk Purchasing:</strong> Source inventory for ecommerce and retail businesses.</>,
                  <><strong>Dropshipping Solutions:</strong> Explore inventory-light selling and fulfilment services.</>,
                  <><strong>Packaging Materials:</strong> Access packaging supplies for ecommerce operations.</>,
                  <><strong>Ecommerce Enablement:</strong> Discover tools, resources, and services designed to support business growth.</>,
                ]}
              />
            </>
          ),
        },
        {
          title: "Explore Our Stores",
          body: (
            <LegalList
              items={[
                <><strong>Core — Fulfilled by Direct2Hub:</strong> Access products through our dedicated Core sourcing and fulfilment store.</>,
                <><strong>Select — Discover Product Opportunities:</strong> Explore curated, affordable, trending, and potentially high-demand products.</>,
                <><strong>Package — Packaging Solutions:</strong> Source packaging materials to support ecommerce packing and shipping.</>,
                <><strong>Dropship — Simplified Dropshipping:</strong> Explore solutions designed for sellers who want to operate without maintaining their own inventory.</>,
              ]}
            />
          ),
        },
        {
          title: "Why Choose Direct2Hub?",
          body: (
            <LegalList
              items={[
                <><strong>100+ Winning Product Opportunities:</strong> Explore a growing range of products identified as potential ecommerce selling opportunities.</>,
                <><strong>Multiple Stores, One Platform:</strong> Access sourcing and services from dedicated stores within a single platform.</>,
                <><strong>Shipping Powered by {COMPANY.shippingPartner}:</strong> Direct2Hub partners with {COMPANY.shippingPartner} for shipping and delivery-related services. Shipping charges are separate from product prices and are calculated according to the applicable logistics arrangement.</>,
                <><strong>Free Delivery Damage Protection:</strong> Orders using the applicable {COMPANY.shippingPartner} shipping service include free delivery damage protection, with coverage of up to 100% of eligible damage, subject to the logistics partner&apos;s conditions.</>,
                <><strong>Built for Ecommerce Sellers:</strong> Our solutions are designed around the needs of marketplace sellers, social commerce entrepreneurs, resellers, dropshippers, and retail businesses.</>,
                <><strong>Beyond Product Sourcing:</strong> We aim to support sellers through ecommerce tools, learning resources, and business-enablement services.</>,
              ]}
            />
          ),
        },
        {
          title: "Our Mission",
          body: (
            <p>
              To simplify ecommerce sourcing and operations by connecting businesses with products,
              suppliers, and practical ecommerce solutions.
            </p>
          ),
        },
        {
          title: "Our Vision",
          body: (
            <p>
              To build an integrated ecommerce enablement ecosystem where sellers can discover
              products, source inventory, manage operations, and grow their businesses.
            </p>
          ),
        },
        {
          title: "Our Founder",
          body: (
            <>
              <p>
                <strong>{COMPANY.founder}</strong>, Founder, Direct2Hub
              </p>
              <p>
                Direct2Hub was founded by {COMPANY.founder} with a vision to make ecommerce sourcing
                more accessible and organized for entrepreneurs, resellers, and growing businesses.
              </p>
              <p>
                The platform is built around the idea of simplifying product discovery, sourcing,
                and essential ecommerce services so sellers can focus on developing their
                businesses.
              </p>
            </>
          ),
        },
        {
          title: "Company Information",
          body: (
            <>
              <CompanyDetails />
              <p>
                Founded by {COMPANY.founder} · Incorporated {COMPANY.incorporated}
              </p>
            </>
          ),
        },
        {
          title: "Grow Your Business With Direct2Hub",
          body: (
            <>
              <p>
                Discover products, explore our stores, and access sourcing solutions designed for
                ecommerce sellers.
              </p>
              <p className="flex flex-wrap gap-x-4 gap-y-1">
                <Link href="/products" className={linkClass}>Explore Products</Link>
                <Link href="/stores" className={linkClass}>Browse Stores</Link>
                <Link href="/contact" className={linkClass}>Contact Us</Link>
              </p>
            </>
          ),
        },
      ]}
    />
  )
}
