import { useState, type KeyboardEvent } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FormSection } from "@/components/dashboard/form-section";
import { MAX_VARIANTS } from "@/lib/supplier/products";
import type { ExistingVariant, FieldErrorHelpers, InvalidField } from "./product-form-types";
import { MAX_VARIANT_ATTRIBUTES, parseValues, type VariantAttribute } from "./variant-builder";

/** Chip input: Enter or comma adds a value, paste accepts a comma list. */
function ValuesInput({
  name,
  values,
  onChange,
}: {
  name: string;
  values: string[];
  onChange: (values: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function commit(raw: string) {
    if (raw.trim() === "") return;
    onChange(parseValues(raw, values));
    setDraft("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit(draft);
    } else if (e.key === "Backspace" && draft === "" && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  }

  return (
    <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-lg border border-input bg-card px-2 py-1.5 focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
      {values.map((value) => (
        <span
          key={value}
          className="inline-flex items-center gap-1 rounded-md border border-info/30 bg-info/10 py-0.5 pr-1 pl-2 text-xs font-medium text-info"
        >
          {value}
          <button
            type="button"
            onClick={() => onChange(values.filter((v) => v !== value))}
            aria-label={`Remove ${value}`}
            className="flex size-4 items-center justify-center rounded-sm hover:bg-info/20"
          >
            <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2.4} className="size-3" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => commit(draft)}
        onPaste={(e) => {
          const text = e.clipboardData.getData("text");
          if (text.includes(",")) {
            e.preventDefault();
            commit(text);
          }
        }}
        aria-label={`${name || "Attribute"} values`}
        placeholder={values.length === 0 ? "Add a value, press Enter — or paste comma-separated" : "Add another value"}
        className="min-w-40 flex-1 bg-transparent px-1 py-1 text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}

export function VariantsSection({
  invalidFor,
  invalidField,
  attributes,
  onAttributesChange,
  variants,
  onUpdateVariant,
}: {
  invalidFor: FieldErrorHelpers["invalidFor"];
  invalidField: InvalidField;
  attributes: VariantAttribute[];
  onAttributesChange: (attributes: VariantAttribute[]) => void;
  variants: ExistingVariant[];
  onUpdateVariant: (index: number, patch: Partial<ExistingVariant>) => void;
}) {
  const updateAttribute = (index: number, patch: Partial<VariantAttribute>) =>
    onAttributesChange(attributes.map((a, i) => (i === index ? { ...a, ...patch } : a)));

  return (
    <FormSection
      id="variants"
      title="Variants"
      description="Define attributes like Size or Colour — we'll auto-generate one SKU per combination, then you edit price / stock / SKU code per row."
      columns={1}
    >
      <div className="flex min-w-0 flex-col gap-3">
        {attributes.map((attribute, index) => (
          <div key={index} className="flex min-w-0 flex-col gap-2 rounded-lg border border-border bg-muted/40 p-3">
            <div className="flex items-center gap-2">
              <Input
                aria-label={`Attribute ${index + 1} name`}
                value={attribute.name}
                maxLength={40}
                onChange={(e) => updateAttribute(index, { name: e.target.value })}
                placeholder="Attribute name, e.g. Size, Colour, Pack"
                className="h-11 min-w-0 flex-1 bg-card sm:max-w-xs"
              />
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="ml-auto shrink-0 bg-card"
                aria-label={`Remove attribute ${attribute.name || index + 1}`}
                onClick={() => onAttributesChange(attributes.filter((_, i) => i !== index))}
              >
                <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
              </Button>
            </div>
            <ValuesInput
              name={attribute.name}
              values={attribute.values}
              onChange={(values) => updateAttribute(index, { values })}
            />
          </div>
        ))}

        {attributes.length < MAX_VARIANT_ATTRIBUTES ? (
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full"
            onClick={() => onAttributesChange([...attributes, { name: "", values: [] }])}
          >
            <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} data-icon="inline-start" />
            {attributes.length === 0 ? "Add an attribute" : "Add another attribute"}
          </Button>
        ) : null}

        {variants.length > 0 ? (
          <div className="flex min-w-0 flex-col gap-2">
            <p className="text-sm font-medium">
              {variants.length} variant{variants.length === 1 ? "" : "s"}
              {variants.length >= MAX_VARIANTS ? ` (limit of ${MAX_VARIANTS} reached)` : ""}
            </p>
            {/* Grid rows instead of a fixed-width table: one aligned row per
                variant from md up, a stacked card on phones. */}
            <div className="overflow-hidden rounded-lg border border-border">
              <div
                aria-hidden
                className={`hidden border-b border-border bg-muted/40 px-3 py-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase md:grid ${ROW_GRID}`}
              >
                <span>Variant</span>
                <span>Price ₹</span>
                <span>Stock</span>
                <span>MOQ</span>
                <span>SKU (optional)</span>
              </div>
              <ul className="divide-y divide-border">
                {variants.map((v, i) => (
                  <li key={v.label} className={`grid grid-cols-2 items-center gap-x-3 gap-y-2 px-3 py-3 md:gap-y-0 ${ROW_GRID}`}>
                    <p id={`variant-${i}-label`} className="col-span-2 truncate text-sm font-semibold md:col-span-1">
                      {v.label}
                    </p>
                    <VariantCell label="Price ₹">
                      <Input id={`variant-${i}-price`} aria-label={`${v.label} price`} required type="number" min={0.01} step="0.01" inputMode="decimal" aria-invalid={invalidFor(`variant-${i}-price`)} value={v.price || ""} onChange={(e) => onUpdateVariant(i, { price: Number(e.target.value) })} placeholder="0.00" />
                    </VariantCell>
                    <VariantCell label="Stock">
                      <Input id={`variant-${i}-stock`} aria-label={`${v.label} stock`} type="number" min={0} step="1" inputMode="numeric" aria-invalid={invalidFor(`variant-${i}-stock`)} value={v.stock_qty} onChange={(e) => onUpdateVariant(i, { stock_qty: Number(e.target.value) })} />
                    </VariantCell>
                    <VariantCell label="MOQ">
                      <Input id={`variant-${i}-moq`} aria-label={`${v.label} MOQ`} type="number" min={1} step="1" inputMode="numeric" aria-invalid={invalidFor(`variant-${i}-moq`)} value={v.moq ?? ""} onChange={(e) => onUpdateVariant(i, { moq: e.target.value === "" ? null : Number(e.target.value) })} placeholder="Base" />
                    </VariantCell>
                    <VariantCell label="SKU">
                      <Input id={`variant-${i}-sku`} aria-label={`${v.label} SKU`} pattern="[A-Za-z0-9_\-]{3,30}" aria-invalid={invalidFor(`variant-${i}-sku`)} value={v.seller_sku} onChange={(e) => onUpdateVariant(i, { seller_sku: e.target.value })} placeholder="Auto" />
                    </VariantCell>
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-xs text-muted-foreground">
              Blank SKU is generated for you. Blank MOQ uses the product MOQ.
            </p>
            {invalidField?.id.startsWith("variant-") ? (
              <FieldError>{invalidField.message}</FieldError>
            ) : null}
          </div>
        ) : null}
      </div>
    </FormSection>
  );
}

const ROW_GRID = "md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))_minmax(0,1.3fr)] md:gap-x-3";

/** Input with a visible label on phones; the header row labels it from md up. */
function VariantCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground md:sr-only">{label}</span>
      {children}
    </label>
  );
}
