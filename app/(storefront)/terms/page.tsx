import type { Metadata } from "next"
import { LegalPage } from "@/components/storefront/legal-page"

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "The terms that apply when you buy or sell wholesale products on Direct2Hub.",
  alternates: { canonical: "/terms" },
}

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms & Conditions"
      updated="14 November 2026"
      intro={
        <p>
          These terms apply to everyone who uses Direct2Hub to source or sell wholesale products. By
          creating an account or placing an order you agree to them.
        </p>
      }
      sections={[
        {
          title: "Accounts",
          body: (
            <p>
              You are responsible for activity on your account and for keeping your sign-in email
              secure. Business details you provide, including GSTIN, must be accurate.
            </p>
          ),
        },
        {
          title: "Orders and pricing",
          body: (
            <p>
              Prices are shown per unit and exclude GST unless stated. Orders must meet the product
              MOQ and any store minimum order value. Orders are reviewed and confirmed before payment;
              we may decline an order, for example if stock or pricing changes.
            </p>
          ),
        },
        {
          title: "Payment",
          body: (
            <p>
              Pay using the details on your order page after confirmation and submit your payment
              reference (UTR). Orders ship after payment is verified.
            </p>
          ),
        },
        {
          title: "Delivery, damage and returns",
          body: (
            <p>
              Report transit damage with photos within 48 hours of delivery. Eligible returns are
              accepted on unused products in original packaging; approved refunds are credited to your
              Direct2Hub Wallet. Store-specific policies shown on a store page also apply.
            </p>
          ),
        },
        {
          title: "Suppliers",
          body: (
            <p>
              Suppliers must list genuine products with accurate descriptions, images, prices and
              stock, hold the rights to sell them, and fulfil confirmed orders on time.
            </p>
          ),
        },
        {
          title: "Acceptable use",
          body: (
            <p>
              Do not misuse the platform: no scraping, automated bulk requests, fraudulent orders,
              attempts to access other users&apos; data, or uploading unlawful content. We may suspend
              accounts that break these rules.
            </p>
          ),
        },
        {
          title: "Liability and changes",
          body: (
            <p>
              Direct2Hub connects buyers and suppliers and is not liable for indirect losses. We may
              update these terms; continued use after an update means you accept the new terms.
            </p>
          ),
        },
      ]}
    />
  )
}
