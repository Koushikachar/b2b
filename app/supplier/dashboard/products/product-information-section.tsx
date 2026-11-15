import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { FormSection } from "@/components/dashboard/form-section";
import { cn } from "cn";
import dynamic from "next/dynamic";
import {
  DESCRIPTION_MIN_TEXT_CHARS,
  plainTextLength,
} from "@/lib/supplier/rich-text";
import { PRODUCT_GST_RATES, PRODUCT_UNITS, discountPercent } from "@/lib/supplier/products";
import type { CategoryOption, FieldErrorHelpers } from "./product-form-types";

const RichTextEditor = dynamic(
  () => import("./rich-text-editor").then((m) => m.RichTextEditor),
  { ssr: false },
);

const WEIGHT_UNITS = ["mg", "g", "kg"] as const;
type WeightUnit = (typeof WEIGHT_UNITS)[number];
const KG_PER_UNIT: Record<WeightUnit, number> = { mg: 0.000001, g: 0.001, kg: 1 };

/** Typed weight in `unit` → kg string for the form ("" when blank/invalid). */
function toKg(raw: string, unit: WeightUnit): string {
  const n = Number(raw);
  if (raw.trim() === "" || !Number.isFinite(n) || n <= 0) return raw.trim() === "" ? "" : raw;
  return String(Number((n * KG_PER_UNIT[unit]).toFixed(6)));
}

/** Live "₹199 → ₹50 · 75% off" preview of how the price reads to buyers. */
function PricePreview({ mrp, price }: { mrp: string; price: string }) {
  const mrpValue = Number(mrp);
  const priceValue = Number(price);
  if (!(priceValue > 0)) return null;
  const off = discountPercent(mrpValue > 0 ? mrpValue : null, priceValue);
  const rupees = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

  return (
    <div
      aria-live="polite"
      className="flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded-lg border border-brand-100 bg-brand-50 px-3 py-2.5 sm:col-span-2"
    >
      <span className="text-xs font-medium text-muted-foreground">Buyers see:</span>
      {off > 0 ? (
        <span className="text-sm text-muted-foreground line-through tabular-nums">{rupees(mrpValue)}</span>
      ) : null}
      <span className="text-lg font-bold text-primary tabular-nums">{rupees(priceValue)}</span>
      <span className="text-xs text-muted-foreground">+ GST</span>
      {off > 0 ? (
        <span className="rounded-sm bg-success/10 px-1.5 py-0.5 text-xs font-semibold text-success tabular-nums">
          {off}% off
        </span>
      ) : mrpValue > 0 ? (
        <span className="text-xs text-destructive">MRP should be higher than the selling price to show a discount.</span>
      ) : null}
    </div>
  );
}

export function ProductInformationSection({
  categories,
  invalidFor,
  errorFor,
  formValues,
  onValueChange,
  skuDuplicate,
}: {
  categories: CategoryOption[];
  invalidFor: FieldErrorHelpers["invalidFor"];
  errorFor: FieldErrorHelpers["errorFor"];
  formValues: Map<string, string>;
  onValueChange: (key: string, value: string) => void;
  skuDuplicate?: boolean | null;
}) {
  const v = (key: string): string => formValues.get(key) ?? "";
  const descriptionLength = plainTextLength(v("description"));
  // Weight: typed value + unit, converted to kg for the hidden field. Saved
  // products start in kg (carton_weight_input is unset until the first edit).
  const weightUnit = (WEIGHT_UNITS as readonly string[]).includes(v("carton_weight_unit"))
    ? (v("carton_weight_unit") as WeightUnit)
    : "kg";
  const weightInput = formValues.has("carton_weight_input") ? v("carton_weight_input") : v("carton_weight_kg");
  const weightKg = toKg(weightInput, weightUnit);

  return (
    <FormSection
      id="product-information"
      title="Product information"
      description="What buyers see first — make the title specific, like IndiaMART listings."
    >
      <FieldSet>
        <FieldLegend>Listing</FieldLegend>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="title">Product title</FieldLabel>
            <Input id="title" name="title" required minLength={10} maxLength={140} aria-invalid={invalidFor("title")} value={v("title")} onChange={(e) => onValueChange("title", e.target.value)} placeholder="Cotton school socks, ankle length" />
            <FieldDescription>10–140 characters.</FieldDescription>
            {errorFor("title")}
          </Field>
          <Field>
            <FieldLabel htmlFor="category_id">Category</FieldLabel>
            <NativeSelect id="category_id" name="category_id" required aria-invalid={invalidFor("category_id")} value={v("category_id")} onChange={(e) => onValueChange("category_id", e.target.value)}>
              <NativeSelectOption value="" disabled>Pick a category</NativeSelectOption>
              {categories.map((c) => (
                <NativeSelectOption key={c.id} value={c.id}>{c.name}</NativeSelectOption>
              ))}
            </NativeSelect>
            {errorFor("category_id")}
          </Field>
        </FieldGroup>
      </FieldSet>
      <FieldSet>
        <FieldLegend>Identification (optional)</FieldLegend>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="seller_sku">Your SKU (optional)</FieldLabel>
            <Input id="seller_sku" name="seller_sku" pattern="[A-Za-z0-9_\-]{3,30}" aria-invalid={invalidFor("seller_sku")} value={v("seller_sku")} onChange={(e) => onValueChange("seller_sku", e.target.value)} placeholder="SCK-ANK-001" />
            <FieldDescription>Leave blank and we&apos;ll generate one. Variants get their own SKUs.</FieldDescription>
            {skuDuplicate === true ? (
              <p className="text-sm text-destructive">This SKU is already used by another product.</p>
            ) : null}
            {skuDuplicate === false && v("seller_sku").trim() !== "" ? (
              <p className="text-sm text-success">SKU is available.</p>
            ) : null}
            {errorFor("seller_sku")}
          </Field>
          <FieldGroup className="grid gap-7 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="hsn_code">HSN code (optional)</FieldLabel>
              <Input id="hsn_code" name="hsn_code" pattern="\d{4,8}" inputMode="numeric" aria-invalid={invalidFor("hsn_code")} value={v("hsn_code")} onChange={(e) => onValueChange("hsn_code", e.target.value)} placeholder="6115" />
              <FieldDescription>4–8 digits, as printed on your GST invoice.</FieldDescription>
              {errorFor("hsn_code")}
            </Field>
            <Field>
              <FieldLabel htmlFor="gst_rate">GST rate (optional)</FieldLabel>
              <NativeSelect id="gst_rate" name="gst_rate" aria-invalid={invalidFor("gst_rate")} value={v("gst_rate")} onChange={(e) => onValueChange("gst_rate", e.target.value)}>
                <NativeSelectOption value="">Not specified</NativeSelectOption>
                {PRODUCT_GST_RATES.map((r) => (
                  <NativeSelectOption key={r} value={String(r)}>{r}%</NativeSelectOption>
                ))}
              </NativeSelect>
              <FieldDescription>Applied on top of the base price.</FieldDescription>
              {errorFor("gst_rate")}
            </Field>
          </FieldGroup>
        </FieldGroup>
      </FieldSet>
      <FieldSet>
        <FieldLegend>Pricing</FieldLegend>
        <FieldGroup className="grid gap-7 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="mrp">MRP (optional)</FieldLabel>
            <Input id="mrp" name="mrp" type="number" min={0.01} step="0.01" inputMode="decimal" aria-invalid={invalidFor("mrp")} value={v("mrp")} onChange={(e) => onValueChange("mrp", e.target.value)} placeholder="199" />
            <FieldDescription>Original price. Shown crossed out with the discount %.</FieldDescription>
            {errorFor("mrp")}
          </Field>
          <Field>
            <FieldLabel htmlFor="price_per_unit">Selling price</FieldLabel>
            <Input id="price_per_unit" name="price_per_unit" required type="number" min={0.01} step="0.01" inputMode="decimal" aria-invalid={invalidFor("price_per_unit")} value={v("price_per_unit")} onChange={(e) => onValueChange("price_per_unit", e.target.value)} placeholder="50" />
            <FieldDescription>Price per unit, before GST.</FieldDescription>
            {errorFor("price_per_unit")}
          </Field>
          <PricePreview mrp={v("mrp")} price={v("price_per_unit")} />
          <Field>
            <FieldLabel htmlFor="unit">Selling unit (optional)</FieldLabel>
            <NativeSelect id="unit" name="unit" aria-invalid={invalidFor("unit")} value={v("unit")} onChange={(e) => onValueChange("unit", e.target.value)}>
              <NativeSelectOption value="">Not specified</NativeSelectOption>
              {PRODUCT_UNITS.map((u) => (
                <NativeSelectOption key={u} value={u}>{u}</NativeSelectOption>
              ))}
            </NativeSelect>
            <FieldDescription>Defaults to pieces when left blank.</FieldDescription>
            {errorFor("unit")}
          </Field>
        </FieldGroup>
      </FieldSet>
      <FieldSet>
        <FieldLegend>Packaging &amp; dispatch</FieldLegend>
        <FieldGroup className="grid gap-7 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="carton_units">Units per carton</FieldLabel>
            <Input id="carton_units" name="carton_units" type="number" min={1} step="1" aria-invalid={invalidFor("carton_units")} value={v("carton_units")} onChange={(e) => onValueChange("carton_units", e.target.value)} placeholder="24" />
            {errorFor("carton_units")}
          </Field>
          <Field>
            <FieldLabel htmlFor="carton_weight_kg">Weight (optional)</FieldLabel>
            <div className="flex gap-2">
              <Input
                id="carton_weight_kg"
                type="number"
                min={0.001}
                step="any"
                inputMode="decimal"
                aria-invalid={invalidFor("carton_weight_kg")}
                value={weightInput}
                onChange={(e) => onValueChange("carton_weight_input", e.target.value)}
                placeholder="12.5"
                className="min-w-0 flex-1"
              />
              <NativeSelect
                aria-label="Weight unit"
                value={weightUnit}
                onChange={(e) => onValueChange("carton_weight_unit", e.target.value)}
                className="w-24"
              >
                {WEIGHT_UNITS.map((u) => (
                  <NativeSelectOption key={u} value={u}>{u}</NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            {/* Always submitted in kg; the server contract is unchanged. */}
            <input type="hidden" name="carton_weight_kg" value={weightKg} />
            {errorFor("carton_weight_kg")}
          </Field>
          <Field className="sm:col-span-2">
            <FieldLabel htmlFor="carton_dimensions">Carton dimensions</FieldLabel>
            <Input id="carton_dimensions" name="carton_dimensions" maxLength={100} aria-invalid={invalidFor("carton_dimensions")} value={v("carton_dimensions")} onChange={(e) => onValueChange("carton_dimensions", e.target.value)} placeholder="40 × 30 × 25 cm" />
            <FieldDescription>Optional — length × width × height.</FieldDescription>
            {errorFor("carton_dimensions")}
          </Field>
        </FieldGroup>
      </FieldSet>
      <FieldSet className="col-span-full grid gap-4">
        <Field>
          <FieldLabel htmlFor="description">Description</FieldLabel>
          <input type="hidden" name="description" value={v("description")} />
          <RichTextEditor
            id="description"
            value={v("description")}
            onChange={(html) => onValueChange("description", html)}
            invalid={invalidFor("description")}
            placeholder="Describe your product — material, sizes, packaging, certifications…"
          />
          <FieldDescription>
            At least {DESCRIPTION_MIN_TEXT_CHARS} characters of text — material, sizes, packaging, certifications.
          </FieldDescription>
          <p className={cn("text-xs tabular-nums", descriptionLength >= DESCRIPTION_MIN_TEXT_CHARS ? "text-success" : "text-muted-foreground")}>
            {descriptionLength} / {DESCRIPTION_MIN_TEXT_CHARS} characters of text
          </p>
          {errorFor("description")}
        </Field>
      </FieldSet>
    </FormSection>
  );
}