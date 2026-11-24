"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlusSignIcon, Wallet01Icon } from "@hugeicons/core-free-icons";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { placeOrder, type CheckoutActionState } from "@/lib/buyer/checkout-actions";
import type { CheckoutPreview } from "@/lib/buyer/checkout-queries";
import type { BuyerAddress } from "@/lib/orders/delivery";
import { formatDeliveryLine } from "@/lib/orders/delivery";
import { formatRupees } from "@/lib/format";
import { MIN_CART_VALUE } from "@/lib/buyer/cart";
import { AddressForm, type AddressDefaults } from "../account/addresses-tab";

const initialState: CheckoutActionState = { ok: false, message: "", orderIds: [] };

export function CheckoutClient({
  preview,
  addresses,
  addressDefaults,
  walletBalance,
}: {
  preview: CheckoutPreview;
  addresses: BuyerAddress[];
  /** Prefill for a new address: the account's own name and phone. */
  addressDefaults: AddressDefaults;
  /** Direct2Hub wallet balance; the buyer chooses whether to use it. */
  walletBalance: number;
}) {
  const router = useRouter();
  // One request id per checkout attempt: retries after a timeout or double
  // click reuse it, so the server never creates duplicate orders.
  const [requestId] = useState(() => crypto.randomUUID());
  const [state, action, pending] = useActionState(placeOrder, initialState);

  const defaultAddress = addresses.find((a) => a.isDefault) ?? addresses[0];
  const [addressId, setAddressId] = useState(defaultAddress?.id ?? "");
  // Keep the selection valid when an address is added (router.refresh()).
  const selectedId = addresses.some((a) => a.id === addressId) ? addressId : (defaultAddress?.id ?? "");
  const [addOpen, setAddOpen] = useState(false);

  const [useWallet, setUseWallet] = useState(false);
  // Preview only; the server re-reads the balance and applies it per order.
  const walletUse = useWallet ? Math.min(Math.max(walletBalance, 0), preview.grandTotal) : 0;

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        {preview.groups.map((group) => (
          <Card key={group.supplierId} className="rounded-lg p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">Items</p>
              <Badge variant="secondary">{group.lines.length} item{group.lines.length === 1 ? "" : "s"}</Badge>
            </div>
            <ul className="mt-3 flex flex-col gap-2">
              {group.lines.map((line) => (
                <li key={line.cartItemId} className="flex items-start justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{line.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {line.quantity} {line.unit} × {formatRupees(line.unitPrice)}
                    </p>
                  </div>
                  <span className="shrink-0 font-bold tabular-nums">{formatRupees(line.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex flex-col gap-1 border-t border-border pt-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="tabular-nums">{formatRupees(group.subtotal)}</span>
              </div>
              {group.coupon ? (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Coupon {group.coupon.code}</span>
                  <span className="font-bold text-success tabular-nums">
                    −{formatRupees(group.coupon.discount)}
                  </span>
                </div>
              ) : null}
              {group.couponError ? <p className="text-xs text-warning">{group.couponError}</p> : null}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">GST</span>
                <span className="tabular-nums">{formatRupees(group.gst)}</span>
              </div>
              <p className="rounded-md bg-success/10 px-2 py-1 text-xs font-medium text-success">
                Eligible businesses can claim 100% GST input credit.
              </p>
              <div className="flex items-center justify-between">
                <span className="font-semibold">Total</span>
                <span className="font-bold tabular-nums">{formatRupees(group.grandTotal)}</span>
              </div>
            </div>
          </Card>
        ))}

        {/* Delivery address -------------------------------------------------- */}
        <Card className="rounded-lg p-4">
          <CardHeader className="flex-row items-start justify-between gap-3 p-0">
            <div>
              <CardTitle className="text-base">Delivery address</CardTitle>
              <CardDescription>Your order is delivered to this address.</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
              <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} data-icon="inline-start" />
              Add address
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {addresses.length === 0 ? (
              <Alert className="mt-3">
                <AlertDescription>
                  Add a delivery address to place your order. Your name and phone are filled in —
                  change them if someone else receives it.
                </AlertDescription>
              </Alert>
            ) : (
              <RadioGroup className="mt-3 flex flex-col gap-2" value={selectedId} onValueChange={setAddressId}>
                {addresses.map((address) => (
                  <label
                    key={address.id}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 has-data-checked:border-primary"
                  >
                    <RadioGroupItem value={address.id} className="mt-0.5" />
                    <div className="min-w-0 text-sm">
                      <span className="font-medium">{address.fullName}</span>{" "}
                      <span className="text-muted-foreground">{address.phone}</span>
                      {address.isDefault ? <Badge className="ml-2">Default</Badge> : null}
                      <p className="text-muted-foreground">{formatDeliveryLine(address)}</p>
                    </div>
                  </label>
                ))}
              </RadioGroup>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              Edit or remove addresses in{" "}
              <Link href="/account/addresses" className="underline">
                your address book
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="flex max-h-[90dvh] flex-col sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add a delivery address</DialogTitle>
            <DialogDescription>Saved to your address book for next time.</DialogDescription>
          </DialogHeader>
          <AddressForm
            initial={null}
            defaults={addressDefaults}
            hasAddresses={addresses.length > 0}
            onDone={() => {
              setAddOpen(false);
              router.refresh();
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Summary + place order ---------------------------------------------- */}
      <div className="w-full lg:w-80 lg:shrink-0">
        <Card className="h-fit rounded-lg p-4 lg:sticky lg:top-32">
          <p className="text-sm font-semibold">Order summary</p>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="tabular-nums">{formatRupees(preview.subtotal)}</span>
          </div>
          {preview.savings > 0 ? (
            <div className="mt-1.5 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Coupon savings</span>
              <span className="font-bold text-success tabular-nums">−{formatRupees(preview.savings)}</span>
            </div>
          ) : null}
          <div className="mt-1.5 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">GST</span>
            <span className="tabular-nums">{formatRupees(preview.gst)}</span>
          </div>
          {walletUse > 0 ? (
            <div className="mt-1.5 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">D2H wallet</span>
              <span className="font-bold text-success tabular-nums">−{formatRupees(walletUse)}</span>
            </div>
          ) : null}
          <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-sm">
            <span className="font-semibold">Total to pay</span>
            <span className="text-base font-bold tabular-nums">
              {formatRupees(Math.max(0, preview.grandTotal - walletUse))}
            </span>
          </div>

          {walletBalance > 0 ? (
            <label className="mt-3 flex cursor-pointer items-start gap-2 rounded-lg border border-brand-200 bg-linear-to-r from-brand-50 to-card p-3 text-sm">
              <Checkbox
                checked={useWallet}
                onCheckedChange={(checked) => setUseWallet(checked === true)}
                className="mt-0.5"
              />
              <span className="min-w-0">
                <span className="flex items-center gap-1 font-semibold">
                  <HugeiconsIcon icon={Wallet01Icon} strokeWidth={2} className="size-4 text-primary" />
                  Use D2H wallet ({formatRupees(walletBalance)})
                </span>
                <span className="block text-xs text-muted-foreground">Optional — keep it for later if you like.</span>
              </span>
            </label>
          ) : null}

          <form action={action} className="mt-4 flex flex-col gap-3">
            <input type="hidden" name="requestId" value={requestId} />
            <input type="hidden" name="addressId" value={selectedId} />
            {useWallet ? <input type="hidden" name="useWallet" value="on" /> : null}

            <Field>
              <FieldLabel htmlFor="buyerNote">Note for us (optional)</FieldLabel>
              <Textarea
                id="buyerNote"
                name="buyerNote"
                rows={2}
                maxLength={500}
                placeholder="Delivery timing, packaging, invoice needs…"
              />
            </Field>

            {!state.ok && state.message ? (
              <Alert variant="destructive">
                <AlertDescription>{state.message}</AlertDescription>
              </Alert>
            ) : null}

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={pending || !selectedId || !preview.meetsMinimum}
            >
              {pending ? "Placing order…" : "Place order"}
            </Button>
          </form>

          <p className="mt-3 text-xs text-muted-foreground">
            No online payment. After we review your order, we contact you to arrange payment.
          </p>
          {!preview.meetsMinimum ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Add {formatRupees(preview.shortfall)} more to reach the {formatRupees(MIN_CART_VALUE)} minimum.
            </p>
          ) : null}
          {preview.unavailableCount > 0 ? (
            <p className="mt-2 text-xs text-warning">
              {preview.unavailableCount} cart item
              {preview.unavailableCount === 1 ? " is" : "s are"} no longer available and won&apos;t be
              ordered.
            </p>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
