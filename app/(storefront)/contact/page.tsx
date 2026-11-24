import type { Metadata } from "next"
import Link from "next/link"
import { CompanyDetails, LegalList, LegalPage } from "@/components/storefront/legal-page"
import { COMPANY } from "@/lib/company"
import { d2hWhatsappLink } from "@/lib/orders/whatsapp-link"
import { SUPPORT_WHATSAPP } from "@/lib/site"

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Questions about Direct2Hub, product sourcing, orders, shipping or our ecommerce services? Our team is here to help.",
  alternates: { canonical: "/contact" },
}

const linkClass = "font-semibold text-primary hover:underline"

function Mail({ address }: { address: string }) {
  return (
    <a href={`mailto:${address}`} className={linkClass}>
      {address}
    </a>
  )
}

export default function ContactPage() {
  return (
    <LegalPage
      title="Contact Us"
      numbered={false}
      intro={
        <>
          <p className="text-base font-bold text-foreground">We&apos;re Here to Help</p>
          <p className="mt-1">
            Have a question about Direct2Hub, product sourcing, orders, shipping, or our ecommerce
            services? Our team is here to assist you.
          </p>
        </>
      }
      sections={[
        {
          title: "Customer Support",
          body: (
            <>
              <p>
                For product-related questions, order assistance, payments, and technical issues:
              </p>
              <p>
                <Mail address={COMPANY.supportEmail} />
              </p>
              <p>
                Or chat with us on WhatsApp:{" "}
                <a
                  href={d2hWhatsappLink({})}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClass}
                >
                  +91 {SUPPORT_WHATSAPP}
                </a>
              </p>
            </>
          ),
        },
        {
          title: "General & Business Enquiries",
          body: (
            <>
              <p>
                For company information, business collaborations, supplier partnerships, and
                general enquiries:
              </p>
              <p>
                <Mail address={COMPANY.contactEmail} />
              </p>
            </>
          ),
        },
        {
          title: "Shipping & Delivery Support",
          body: (
            <>
              <p>
                Shipping and delivery services are provided through our logistics partner,{" "}
                {COMPANY.shippingPartner}.
              </p>
              <p>
                For shipping charges, shipment-related concerns, and delivery damage protection,
                customers may contact Direct2Hub support or follow the instructions shared by{" "}
                {COMPANY.shippingPartner}.
              </p>
              <p>
                Free delivery damage protection is available under the applicable{" "}
                {COMPANY.shippingPartner} service, with coverage of up to 100% of eligible damage,
                subject to its terms.
              </p>
            </>
          ),
        },
        {
          title: "Send Us a Message",
          body: (
            <>
              <p>
                Email us with the relevant enquiry category in the subject line, along with your
                contact information and a description of your enquiry, so our team can assist you:
              </p>
              <LegalList
                items={[
                  "General Enquiry",
                  "Product Sourcing",
                  "Order Support",
                  "Shipping & Delivery",
                  "Delivery Damage Protection",
                  "Supplier Partnership",
                  "Account & Technical Support",
                ]}
              />
            </>
          ),
        },
        {
          title: "Registered Office",
          body: <CompanyDetails />,
        },
        {
          title: "Grow Your Business With Direct2Hub",
          body: (
            <>
              <p>
                We&apos;re committed to making ecommerce sourcing simpler and helping sellers
                discover new business opportunities.
              </p>
              <p className="flex flex-wrap gap-x-4 gap-y-1">
                <Link href="/products" className={linkClass}>Explore Products</Link>
                <Link href="/about" className={linkClass}>About Direct2Hub</Link>
              </p>
            </>
          ),
        },
      ]}
    />
  )
}
