"use client";

import { useActionState, useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle02Icon, Delete02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/toast";
import { DELETE_PHRASE } from "@/lib/supplier/delete-account";
import {
  updateBusinessProfile,
  deleteAccount,
  type KybActionState,
} from "@/lib/supplier/actions";

const initialState: KybActionState = { ok: false, message: "" };

export type BusinessProfileValues = {
  businessName: string;
  contactPerson: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  gstin: string;
  logoPath: string | null;
};

function SectionTitle({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-border pb-2">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

export function BusinessProfileForm({ values }: { values: BusinessProfileValues }) {
  const [state, action, pending] = useActionState(
    updateBusinessProfile,
    initialState,
  );
  // Fixed at first render: after a save the page re-renders with new props,
  // and an uncontrolled input must not get a new default (Base UI warning).
  // The inputs already show what the user typed.
  const [initial] = useState(values);
  const { businessName, logoPath } = values;
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const objectUrlsRef = useRef<string[]>([]);

  function onLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setLogoPreview((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev);
        objectUrlsRef.current = objectUrlsRef.current.filter(
          (u) => u !== prev,
        );
      }
      if (!file) {
        return null;
      }
      const url = URL.createObjectURL(file);
      objectUrlsRef.current.push(url);
      return url;
    });
  }

  const currentLogo =
    logoPreview ??
    (logoPath ? logoPublicUrl(logoPath) : null);

  return (
    <form action={action} className="flex flex-col gap-6">
      {/* Brand ------------------------------------------------------------ */}
      <section className="flex flex-col gap-4">
        <SectionTitle title="Brand" hint="Shown to buyers on your store and invoices." />
        <Item variant="outline">
          <ItemMedia variant="image">
            {currentLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img loading="lazy" decoding="async" src={currentLogo} alt="" />
            ) : null}
          </ItemMedia>
          <ItemContent>
            <ItemTitle>{businessName}</ItemTitle>
            <ItemDescription>
              {currentLogo ? "Choose a file to replace the logo." : "No logo yet."}
            </ItemDescription>
          </ItemContent>
        </Item>
        <FieldGroup className="grid gap-4 sm:grid-cols-2">
          <Field className="sm:col-span-2">
            <FieldLabel htmlFor="logo">Company logo</FieldLabel>
            <Input id="logo" name="logo" type="file" accept=".jpg,.jpeg,.png,.webp" onChange={onLogoChange} />
          </Field>
          <Field>
            <FieldLabel htmlFor="business_name">Company name</FieldLabel>
            <Input id="business_name" name="business_name" required minLength={2} defaultValue={initial.businessName} />
          </Field>
          <Field>
            <FieldLabel htmlFor="contact_person">Contact name</FieldLabel>
            <Input id="contact_person" name="contact_person" required minLength={2} defaultValue={initial.contactPerson} />
          </Field>
        </FieldGroup>
      </section>

      {/* Contact & address ------------------------------------------------ */}
      <section className="flex flex-col gap-4">
        <SectionTitle title="Contact & registered address" hint="Used on invoices and for order contact." />
        <FieldGroup className="grid gap-4 sm:grid-cols-6">
          <Field className="sm:col-span-2">
            <FieldLabel htmlFor="phone">Mobile</FieldLabel>
            <Input id="phone" name="phone" inputMode="numeric" maxLength={10} required defaultValue={initial.phone} />
          </Field>
          <Field className="sm:col-span-4">
            <FieldLabel htmlFor="address">Address</FieldLabel>
            <Input id="address" name="address" required minLength={5} defaultValue={initial.address} />
          </Field>
          <Field className="sm:col-span-2">
            <FieldLabel htmlFor="city">City</FieldLabel>
            <Input id="city" name="city" required minLength={2} defaultValue={initial.city} />
          </Field>
          <Field className="sm:col-span-2">
            <FieldLabel htmlFor="state">State</FieldLabel>
            <Input id="state" name="state" required minLength={2} defaultValue={initial.state} />
          </Field>
          <Field className="sm:col-span-2">
            <FieldLabel htmlFor="pincode">PIN code</FieldLabel>
            <Input id="pincode" name="pincode" inputMode="numeric" maxLength={6} required defaultValue={initial.pincode} />
          </Field>
        </FieldGroup>
      </section>

      {/* Tax ------------------------------------------------------------- */}
      <section className="flex flex-col gap-4">
        <SectionTitle title="Tax" hint="Printed on every invoice. Leave blank if you don't have one yet." />
        <Field className="sm:max-w-sm">
          <FieldLabel htmlFor="gstin">GSTIN (optional)</FieldLabel>
          <Input
            id="gstin"
            name="gstin"
            maxLength={15}
            className="uppercase"
            placeholder="29ABCDE1234F1Z5"
            defaultValue={initial.gstin}
          />
        </Field>
      </section>

      <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-end">
        {state.message ? (
          <p
            role="status"
            className={
              state.ok
                ? "flex items-center gap-1.5 text-sm font-medium text-success sm:mr-auto"
                : "text-sm font-medium text-destructive sm:mr-auto"
            }
          >
            {state.ok ? <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} className="size-4" /> : null}
            {state.message}
          </p>
        ) : null}
        <Button type="submit" size="lg" disabled={pending} className="sm:min-w-40">
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

function logoPublicUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/company_logos/${path}`;
}

/**
 * Delete account section shown under Settings on the supplier dashboard.
 * Only reachable by the company owner (the page itself is owner-gated).
 * Deleting the auth user cascades through the database (profile, company,
 * products/images/variants, memberships).
 */
export function DeleteAccountSection({
  businessName,
  productCount,
}: {
  businessName: string;
  productCount: number;
}) {
  const [pending, start] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);
  // Three confirmations: 1 understand the loss, 2 type the business name,
  // 3 type DELETE. The server re-checks 2 and 3.
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [typed, setTyped] = useState("");
  const [phrase, setPhrase] = useState("");
  const router = useRouter();
  const nameOk = typed.trim() === businessName.trim() && businessName.trim() !== "";
  const phraseOk = phrase.trim() === DELETE_PHRASE;

  const closeDialog = (open: boolean) => {
    setDeleteOpen(open);
    if (!open) {
      setStep(1);
      setTyped("");
      setPhrase("");
    }
  };

  const removeAccount = () =>
    start(async () => {
      const result = await deleteAccount(typed, phrase);
      if (result.ok) {
        toast.add({
          type: "success",
          title: "Account deleted",
          description: result.message,
        });
        router.push("/auth/login");
      } else {
        toast.add({
          type: "error",
          title: "Could not delete account",
          description: result.message,
        });
      }
    });

  return (
    <section>
      <Card size="sm" className="!gap-0 !py-0">
        <CardHeader className="border-b border-border px-5 py-4">
          <CardTitle>Delete account</CardTitle>
          <CardDescription>
            Permanently delete your supplier account and all associated data.
            This cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-5 py-5 flex flex-col gap-2">
          <Button
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
            className="w-full justify-start"
          >
            <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} className="mr-2" />
            Delete my account
          </Button>
          <AlertDialog open={deleteOpen} onOpenChange={closeDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogMedia>
                  <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
                </AlertDialogMedia>
                <AlertDialogTitle>
                  {step === 1
                    ? "Delete account and all data?"
                    : step === 2
                      ? "Are you really sure?"
                      : "Last step: this cannot be undone"}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {step === 1 ? (
                    <>
                      This permanently deletes your supplier account, business profile,
                      <strong> {productCount} product{productCount === 1 ? "" : "s"}</strong>, coupons,
                      customers and orders. There is no backup — it cannot be undone.
                    </>
                  ) : step === 2 ? (
                    "Confirm which business you are deleting."
                  ) : (
                    <>
                      Everything above will be gone for good, including all{" "}
                      <strong>{productCount}</strong> product photos and details.
                    </>
                  )}
                </AlertDialogDescription>
                <p className="text-xs text-muted-foreground">Step {step} of 3</p>
              </AlertDialogHeader>
              {step === 2 ? (
                <Field>
                  <FieldLabel htmlFor="confirm-delete">
                    Type <strong>{businessName}</strong> to confirm
                  </FieldLabel>
                  <Input
                    id="confirm-delete"
                    value={typed}
                    onChange={(e) => setTyped(e.target.value)}
                    autoComplete="off"
                  />
                </Field>
              ) : step === 3 ? (
                <Field>
                  <FieldLabel htmlFor="confirm-delete-phrase">
                    Type <strong>{DELETE_PHRASE}</strong> to delete everything
                  </FieldLabel>
                  <Input
                    id="confirm-delete-phrase"
                    value={phrase}
                    onChange={(e) => setPhrase(e.target.value)}
                    autoComplete="off"
                  />
                </Field>
              ) : null}
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => closeDialog(false)}>
                  Cancel
                </AlertDialogCancel>
                {step < 3 ? (
                  <Button
                    variant="destructive"
                    onClick={() => setStep(step === 1 ? 2 : 3)}
                    disabled={step === 2 && !nameOk}
                  >
                    {step === 1 ? "Yes, continue" : "Continue"}
                  </Button>
                ) : (
                  <AlertDialogAction
                    variant="destructive"
                    onClick={removeAccount}
                    disabled={pending || !nameOk || !phraseOk}
                  >
                    {pending ? "Deleting…" : "Delete everything"}
                  </AlertDialogAction>
                )}
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </section>
  );
}
