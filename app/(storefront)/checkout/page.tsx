import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getBuyAgainProductIds } from "@/lib/buyer/buy-again";
import { RecommendedProductsSection } from "@/components/storefront/home-recommended";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";
import { getBuyerAddresses } from "@/lib/buyer/address-queries";
import { getCheckoutPreview } from "@/lib/buyer/checkout-queries";
import { addressDefaults, getBuyerProfile, getWallet } from "@/lib/buyer/account-queries";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { CheckoutClient } from "./checkout-client";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Review your order and confirm your delivery address.",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
  const supabase = await createClient();
  const user = await getSessionUser(supabase);

  if (!user) {
    redirect("/auth/login?next=/checkout&reason=purchase");
  }

  const [preview, addresses, profile, wallet] = await Promise.all([
    getCheckoutPreview(supabase, user.id),
    getBuyerAddresses(supabase, user.id),
    getBuyerProfile(supabase, user.id, user.email),
    getWallet(supabase, user.id, 0),
  ]);

  const cartProductIds = [
    ...new Set(preview.groups.flatMap((group) => group.lines.map((line) => line.productId))),
  ];

  return (
    <>
    <div className="mx-auto w-full max-w-7xl px-4 py-5">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "My Cart", href: "/cart" },
          { label: "Checkout" },
        ]}
      />
      <h1 className="mt-2 text-xl font-bold tracking-tight md:text-2xl">Checkout</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Review your items, choose a delivery address and place your order.
      </p>

      {preview.groups.length === 0 ? (
        <Card className="mt-4 rounded-lg p-6">
          <Empty>
            <EmptyTitle>Nothing to check out</EmptyTitle>
            <EmptyDescription>
              Your cart is empty or has no available products right now.
            </EmptyDescription>
            <Link href="/cart" className="mt-4">
              <Button>Back to cart</Button>
            </Link>
          </Empty>
        </Card>
      ) : (
        <div className="mt-4">
          <CheckoutClient
            preview={preview}
            addresses={addresses}
            addressDefaults={addressDefaults(profile)}
            walletBalance={wallet.balance}
          />
        </div>
      )}
    </div>
    {/* Streams in after checkout renders; never delays placing the order. */}
    <Suspense fallback={null}>
      <CheckoutRecommendations buyerId={user.id} cartProductIds={cartProductIds} />
    </Suspense>
    </>
  );
}

/** "You may also need": categories of the cart and past orders, minus what's in the cart. */
async function CheckoutRecommendations({
  buyerId,
  cartProductIds,
}: {
  buyerId: string;
  cartProductIds: string[];
}) {
  const supabase = await createClient();
  const pastIds = await getBuyAgainProductIds(supabase, buyerId).catch(() => [] as string[]);
  const ids = [...new Set([...cartProductIds, ...pastIds])];
  const { data } = ids.length
    ? await supabase.from("products").select("category_id").in("id", ids)
    : { data: [] as { category_id: string | null }[] };
  const categoryIds = [
    ...new Set((data ?? []).map((row) => row.category_id).filter((id): id is string => Boolean(id))),
  ];

  return (
    <RecommendedProductsSection
      categoryIds={categoryIds}
      excludeIds={cartProductIds}
      title="You may also need"
      subtitle={
        categoryIds.length > 0
          ? "Based on what you're ordering and your past orders"
          : "Popular with other buyers"
      }
    />
  );
}
