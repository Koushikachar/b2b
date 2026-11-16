import type { Metadata } from "next"
import { LegalPage } from "@/components/storefront/legal-page"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Direct2Hub collects, uses and protects your personal and business information.",
  alternates: { canonical: "/privacy" },
}

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="14 November 2026"
      intro={
        <p>
          This policy explains what information Direct2Hub collects when you buy or sell on the
          marketplace, why we collect it, and the choices you have. We only collect what we need to
          run your account and fulfil orders.
        </p>
      }
      sections={[
        {
          title: "Information we collect",
          body: (
            <ul className="list-disc space-y-1 pl-5">
              <li>Account details: email address, name, mobile number and profile photo.</li>
              <li>Business details: GSTIN, business name and address, and supplier verification documents.</li>
              <li>Delivery addresses you save, and your orders, quotations, payments and wallet activity.</li>
              <li>Usage information: pages and products viewed, searches and items added to cart.</li>
              <li>Photos you upload for search-by-image, used only to find similar products.</li>
            </ul>
          ),
        },
        {
          title: "How we use it",
          body: (
            <ul className="list-disc space-y-1 pl-5">
              <li>To sign you in, run your account and process orders and payments.</li>
              <li>To send order updates by email and WhatsApp.</li>
              <li>To issue GST invoices and meet legal and tax obligations.</li>
              <li>To prevent fraud and abuse and keep the marketplace secure.</li>
              <li>To improve search, recommendations and the site, using aggregated data.</li>
            </ul>
          ),
        },
        {
          title: "Sharing",
          body: (
            <p>
              We share order details with the supplier fulfilling your order and with delivery
              partners, and use trusted providers for hosting, database, email and messaging. We do
              not sell your personal information.
            </p>
          ),
        },
        {
          title: "Cookies",
          body: (
            <p>
              We use essential cookies to keep you signed in and your cart working. Analytics cookies
              load only if you accept them in the cookie banner; you can change this by clearing the
              site&apos;s data in your browser.
            </p>
          ),
        },
        {
          title: "Security and retention",
          body: (
            <p>
              Data is encrypted in transit (HTTPS) and access is restricted per account. We keep
              order and invoice records as long as the law requires, and other data only while your
              account is active.
            </p>
          ),
        },
        {
          title: "Your rights",
          body: (
            <p>
              You can view and update your details under My Account, download your data from Account
              Privacy, and ask us to correct or delete your information, subject to records we must
              keep by law.
            </p>
          ),
        },
      ]}
    />
  )
}
