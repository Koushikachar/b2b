import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FieldSet, FieldLegend } from "@/components/ui/field";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth/session";
import { LOGIN_PATH } from "@/lib/auth/paths";
import { requireOwnerCompany } from "@/lib/auth/guard";
import { BusinessProfileForm, DeleteAccountSection } from "./business-form";

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <Item variant="outline" size="sm">
      <ItemContent>
        <ItemTitle>{value || "—"}</ItemTitle>
        <ItemDescription>{label}</ItemDescription>
      </ItemContent>
    </Item>
  );
}

export default async function SupplierBusinessPage() {
  const supabase = await createClient();
  const user = await getAuthUser(supabase);

  if (!user) {
    redirect(LOGIN_PATH);
  }

  const companyId = await requireOwnerCompany(supabase, user.id);

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select(
      "id, business_name, contact_person, phone, address, city, state, pincode, gstin, pan, bank_account, bank_ifsc, logo_path, kyb_status",
    )
    .eq("id", companyId)
    .maybeSingle();

  // Distinguish "no company yet" (onboarding) from a failed read. Without this a
  // schema or permission error silently redirects to onboarding and then to the
  // status page, hiding the real cause.
  if (companyError) {
    console.error(
      "Supplier business profile query failed:",
      companyError.code,
      companyError.message,
    );
    throw companyError;
  }

  if (!company) {
    redirect("/supplier/onboarding");
  }

  // Shown in the delete warning so nobody wipes a catalogue by accident.
  const { count: productCount } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("supplier_id", company.id);

  const editable =
    company.kyb_status === "draft" || company.kyb_status === "rejected";

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <div className="grid min-w-0 gap-0.5">
          <h1 className="truncate text-xl font-bold tracking-tight">
            Business profile
          </h1>
          <p className="text-sm text-muted-foreground">
            Edit your logo, name, contact, address and GSTIN here — no re-verification needed.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 @lg/content:grid-cols-[minmax(0,1fr)_300px]">
        <Card className="gap-0! py-0!">
          <div className="px-5 py-5">
            <BusinessProfileForm
              values={{
                businessName: company.business_name ?? "",
                contactPerson: company.contact_person ?? "",
                phone: company.phone ?? "",
                address: company.address ?? "",
                city: company.city ?? "",
                state: company.state ?? "",
                pincode: company.pincode ?? "",
                gstin: company.gstin ?? "",
                logoPath: company.logo_path,
              }}
            />
          </div>
        </Card>

        <div className="flex flex-col gap-4 @lg/content:sticky @lg/content:top-4 @lg/content:self-start">
          <Card size="sm" className="gap-0! py-0!">
            <CardHeader className="border-b border-border px-5 py-4">
              <CardTitle>Verification details</CardTitle>
              <CardDescription>
                PAN and bank are checked at verification, so they change only through the application.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5 px-5 py-5">
              <FieldSet>
                <FieldLegend variant="label">Tax ID</FieldLegend>
                <ItemGroup>
                  <Detail label="PAN" value={company.pan} />
                </ItemGroup>
              </FieldSet>
              <Separator />
              <FieldSet>
                <FieldLegend variant="label">Bank</FieldLegend>
                <ItemGroup>
                  <Detail label="Account number" value={company.bank_account} />
                  <Detail label="IFSC" value={company.bank_ifsc} />
                </ItemGroup>
              </FieldSet>
              {editable ? (
                <Button
                  render={<Link href="/supplier/onboarding" />}
                  nativeButton={false}
                >
                  Edit full application
                </Button>
              ) : null}
            </CardContent>
          </Card>

        </div>
      </div>

      <DeleteAccountSection businessName={company.business_name ?? ""} productCount={productCount ?? 0} />
    </div>
  );
}