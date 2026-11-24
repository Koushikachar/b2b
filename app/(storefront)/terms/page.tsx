import type { Metadata } from "next"
import { CompanyDetails, LegalList, LegalPage } from "@/components/storefront/legal-page"
import { COMPANY } from "@/lib/company"

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description:
    "The terms that apply when you register, buy or sell on Direct2Hub, operated by DIRECT2HUB PRIVATE LIMITED.",
  alternates: { canonical: "/terms" },
}

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms & Conditions"
      updated="23 November 2026"
      intro={
        <>
          <p>
            Welcome to Direct2Hub, a B2B ecommerce sourcing and enablement platform operated by{" "}
            {COMPANY.legalName}, incorporated under the Companies Act, 2013.
          </p>
          <p className="mt-2">
            By accessing our website, registering an account, or placing an order through{" "}
            {COMPANY.website}, you agree to these Terms &amp; Conditions and applicable store
            policies.
          </p>
        </>
      }
      sections={[
        {
          title: "Platform Overview",
          body: (
            <>
              <p>
                Direct2Hub provides products and ecommerce-related services to resellers,
                dropshippers, retailers, marketplace sellers, and businesses.
              </p>
              <p>Our platform includes four dedicated stores: Core, Select, Package, and Dropship.</p>
              <p>
                Products may be supplied, invoiced, or fulfilled by Direct2Hub or participating
                suppliers.
              </p>
            </>
          ),
        },
        {
          title: "User Registration",
          body: (
            <>
              <p>Customers must provide accurate registration, billing, and delivery information.</p>
              <p>
                Users are responsible for maintaining the confidentiality of their account
                credentials and for activities conducted through their accounts, subject to
                applicable law.
              </p>
            </>
          ),
        },
        {
          title: "Product Colours and Variations",
          body: (
            <>
              <p>No colour choice is available for products listed on Direct2Hub.</p>
              <p>
                Products may be supplied in available colours, and customers cannot request
                specific colours unless Direct2Hub expressly offers such an option.
              </p>
              <p>
                Product colours shown in images or videos are for reference and may differ from the
                supplied product.
              </p>
              <p>
                This condition does not remove any applicable rights if a product materially
                differs from its advertised description.
              </p>
            </>
          ),
        },
        {
          title: "No Product Guarantee or Warranty",
          body: (
            <>
              <p>
                Direct2Hub does not provide any additional commercial guarantee or warranty on
                products sold through the platform.
              </p>
              <p>
                Products are supplied without a Direct2Hub-provided warranty unless expressly
                stated otherwise.
              </p>
              <p>
                This does not exclude statutory rights relating to defective, misdescribed, or
                non-conforming products, or any mandatory manufacturer obligations under applicable
                law.
              </p>
            </>
          ),
        },
        {
          title: "Non-Branded Products",
          body: (
            <>
              <p>
                Direct2Hub does not offer products represented as branded or officially authorized
                merchandise.
              </p>
              <p>Our product catalogue consists of generic or non-branded products.</p>
              <p>
                Customers should not assume that any product is manufactured, sponsored, endorsed,
                or warranted by a particular brand.
              </p>
            </>
          ),
        },
        {
          title: "Product Images and Videos",
          body: (
            <>
              <p>All product videos are for reference purposes only.</p>
              <p>
                Product images and videos may demonstrate appearance, features, functionality, or
                usage.
              </p>
              <p>
                Actual product colour, packaging, presentation, and minor visual details may vary.
              </p>
              <p>
                However, products must conform to their applicable descriptions and any mandatory
                legal requirements.
              </p>
            </>
          ),
        },
        {
          title: "Product Pricing and Payment",
          body: (
            <>
              <p>Customers pay the applicable product price through Direct2Hub.</p>
              <p>
                Shipping charges are additional and are handled under the applicable shipping
                arrangement.
              </p>
              <p>
                Product prices may change due to supplier pricing, product availability, and other
                commercial factors.
              </p>
              <p>
                Applicable taxes and charges must be communicated in accordance with applicable law.
              </p>
            </>
          ),
        },
        {
          title: "Order Placement",
          body: (
            <>
              <p>
                Orders are subject to payment confirmation, product availability, and applicable
                supplier requirements.
              </p>
              <p>
                Direct2Hub reserves the right to contact buyers if an order requires clarification
                or modification.
              </p>
              <p>
                Where an order cannot be fulfilled, the applicable refund or other remedy will be
                provided in accordance with the transaction and law.
              </p>
            </>
          ),
        },
        {
          title: "Order Cancellation Limit",
          body: (
            <>
              <p>
                Customers may not cancel more than three orders within a rolling one-month period
                for discretionary reasons.
              </p>
              <p>
                Direct2Hub may restrict additional voluntary cancellation requests after this limit
                has been reached.
              </p>
              <p>
                The cancellation count is associated with the relevant customer account and order
                history.
              </p>
              <p>
                This limit does not restrict cancellations, refunds, or other remedies required by
                law, including where an order cannot be fulfilled or where there is a legally
                actionable failure by the seller.
              </p>
            </>
          ),
        },
        {
          title: `Shipping Partner — ${COMPANY.shippingPartner}`,
          body: (
            <>
              <p>
                Direct2Hub partners with {COMPANY.shippingPartner} for shipping and delivery-related
                services.
              </p>
              <p>
                Customers pay the product price through Direct2Hub, while shipping charges apply
                separately.
              </p>
              <p>
                The stated shipping rate is ₹60 under {COMPANY.shippingPartner}&apos;s
                volumetric-weight-based billing arrangement. Final charges depend on its applicable
                rate calculation and shipment details.
              </p>
              <p>
                Delivery timelines depend on the destination, logistics network, supplier
                processing, and other relevant factors.
              </p>
            </>
          ),
        },
        {
          title: "Free Delivery Damage Protection",
          body: (
            <>
              <p>
                Orders shipped through the applicable {COMPANY.shippingPartner} service include
                free delivery damage protection.
              </p>
              <p>
                Protection provides coverage of up to 100% of eligible delivery damage, subject to{" "}
                {COMPANY.shippingPartner}&apos;s coverage limits, exclusions, required evidence,
                claim deadlines, and approval procedures.
              </p>
              <p>
                Detailed delivery damage protection conditions are communicated by{" "}
                {COMPANY.shippingPartner} after order placement.
              </p>
              <p>Coverage does not automatically guarantee full reimbursement for every claim.</p>
            </>
          ),
        },
        {
          title: "Mandatory Parcel Opening Video for Out-of-Surat Customers",
          body: (
            <>
              <p className="font-semibold">Important information for customers outside Surat:</p>
              <p>
                Customers receiving parcels outside Surat are required under Direct2Hub&apos;s claim
                verification procedure to record a clear, continuous parcel-opening video.
              </p>
              <p>The video should:</p>
              <LegalList
                items={[
                  "Show the sealed parcel from all sides in a 360-degree view.",
                  "Clearly display the outer packaging before opening.",
                  "Capture the parcel-opening process without interruptions.",
                  "Show all products received inside the parcel.",
                  "Clearly document any missing items or visible damage.",
                ]}
              />
              <p>
                A parcel-opening video is required to support missing-item claims under our
                standard claim verification procedure.
              </p>
              <p>
                If a video is not provided, Direct2Hub may reject a missing-item claim where the
                available evidence is insufficient to verify it.
              </p>
              <p>
                This requirement does not exclude statutory consumer rights or prevent
                consideration of other reliable evidence where required by applicable law.
              </p>
            </>
          ),
        },
        {
          title: "Missing Items and Delivery Claims",
          body: (
            <>
              <p>Customers should inspect their shipments immediately after delivery.</p>
              <p>
                Missing-item complaints should be submitted with the order ID, relevant
                photographs, and the parcel-opening video where required.
              </p>
              <p>
                Delivery damage claims are additionally governed by the applicable{" "}
                {COMPANY.shippingPartner} protection conditions.
              </p>
              <p>
                Claims will be assessed using the available evidence, applicable policies, and
                mandatory legal requirements.
              </p>
            </>
          ),
        },
        {
          title: "Returns and Refunds",
          body: (
            <>
              <p>
                Returns, refunds, and replacements are subject to the relevant store&apos;s policies
                and applicable law.
              </p>
              <p>
                Change-of-mind returns may be restricted depending on the product and store
                conditions.
              </p>
              <p>
                Claims involving defective, incorrect, or materially misdescribed products will be
                handled in accordance with applicable legal obligations.
              </p>
              <p>
                Delivery damage claims may follow a separate procedure managed through{" "}
                {COMPANY.shippingPartner}.
              </p>
            </>
          ),
        },
        {
          title: "Right to Refuse Service",
          body: (
            <>
              <p>
                Direct2Hub reserves the right to refuse service to any person at any time for a
                lawful reason.
              </p>
              <p>
                This may include suspected fraud, misuse of the platform, abusive conduct, repeated
                policy violations, or other legitimate business or security concerns.
              </p>
              <p>
                This right will be exercised in accordance with applicable law and does not permit
                unlawful discrimination or avoidance of existing legal obligations.
              </p>
            </>
          ),
        },
        {
          title: "Supplier Responsibilities",
          body: (
            <>
              <p>
                Certain products may be sourced, supplied, invoiced, or fulfilled by participating
                suppliers.
              </p>
              <p>
                Individual stores may maintain different ordering, payment, fulfilment, shipping,
                and return conditions.
              </p>
              <p>
                Direct2Hub&apos;s role and responsibilities depend on the applicable transaction and
                legal requirements.
              </p>
            </>
          ),
        },
        {
          title: "Resale Responsibilities",
          body: (
            <>
              <p>
                Customers purchasing products for resale are responsible for evaluating
                suitability, product compliance, and applicable marketplace requirements.
              </p>
              <p>
                Direct2Hub does not guarantee demand, sales volumes, resale profit, or business
                performance.
              </p>
            </>
          ),
        },
        {
          title: "Prohibited Activities",
          body: (
            <>
              <p>
                Customers must not provide false information, engage in fraudulent transactions,
                misuse the website, or attempt unauthorized access to platform systems.
              </p>
              <p>
                Direct2Hub may restrict accounts in response to suspected misconduct, subject to
                applicable law.
              </p>
            </>
          ),
        },
        {
          title: "Intellectual Property",
          body: (
            <>
              <p>
                The Direct2Hub name, logo, original website content, software, and proprietary
                materials are protected by applicable intellectual property laws.
              </p>
              <p>
                Unauthorized commercial reproduction or distribution is prohibited except where
                permitted by law.
              </p>
            </>
          ),
        },
        {
          title: "Privacy and Data Protection",
          body: (
            <>
              <p>
                Personal and business information is handled in accordance with the Direct2Hub
                Privacy Policy and applicable Indian data protection requirements.
              </p>
              <p>
                Relevant order and shipment information may be shared with suppliers and logistics
                partners as necessary to provide the requested services.
              </p>
            </>
          ),
        },
        {
          title: "Third-Party Services",
          body: (
            <>
              <p>
                Direct2Hub may integrate with independent suppliers, logistics providers, payment
                gateways, and technology partners.
              </p>
              <p>Their services may be subject to separate terms and conditions.</p>
              <p>Direct2Hub remains responsible for its own obligations under applicable law.</p>
            </>
          ),
        },
        {
          title: "Website Availability",
          body: (
            <>
              <p>
                Direct2Hub aims to maintain reliable website availability but does not guarantee
                uninterrupted service.
              </p>
              <p>
                Temporary interruptions may occur because of maintenance, updates, technical issues,
                or circumstances outside reasonable control.
              </p>
            </>
          ),
        },
        {
          title: "Limitation of Liability",
          body: (
            <>
              <p>
                To the extent permitted by applicable law, Direct2Hub will not be liable for
                indirect or consequential losses arising from use of the platform.
              </p>
              <p>
                Nothing in these Terms excludes liability or remedies that cannot lawfully be
                excluded.
              </p>
            </>
          ),
        },
        {
          title: "Changes to Terms & Conditions",
          body: (
            <>
              <p>
                {COMPANY.legalName} may update these Terms &amp; Conditions to reflect changes in
                policies, operations, services, or legal requirements.
              </p>
              <p>
                Updated Terms will be published on the website, with notice or consent where
                required.
              </p>
            </>
          ),
        },
        {
          title: "Governing Law",
          body: (
            <>
              <p>These Terms &amp; Conditions are governed by Indian law.</p>
              <p>
                Disputes will be handled by competent courts or other authorities according to
                applicable legal requirements.
              </p>
            </>
          ),
        },
        {
          title: "Company Information",
          body: <CompanyDetails />,
        },
      ]}
    />
  )
}
