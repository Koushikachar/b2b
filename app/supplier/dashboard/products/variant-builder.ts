import { MAX_VARIANTS } from "@/lib/supplier/products";
import type { ExistingVariant } from "./product-form-types";

/** One attribute the supplier defines, e.g. { name: "Pack", values: ["Pack of 2"] }. */
export type VariantAttribute = { name: string; values: string[] };

export const MAX_VARIANT_ATTRIBUTES = 3;

function attrsOf(variant: ExistingVariant): Record<string, string> {
  if (variant.attrs && Object.keys(variant.attrs).length > 0) return variant.attrs;
  if (variant.attr_key && variant.attr_value) return { [variant.attr_key]: variant.attr_value };
  return {};
}

/** Order-independent identity of an attribute combination. */
function attrsKey(attrs: Record<string, string>): string {
  return JSON.stringify(Object.entries(attrs).sort(([a], [b]) => a.localeCompare(b)));
}

/** Rebuild the attribute editor from saved variants (edit mode). */
export function attributesFromVariants(variants: ExistingVariant[] | undefined): VariantAttribute[] {
  const byName = new Map<string, string[]>();
  for (const variant of variants ?? []) {
    for (const [name, value] of Object.entries(attrsOf(variant))) {
      const values = byName.get(name) ?? [];
      if (!values.includes(value)) values.push(value);
      byName.set(name, values);
    }
  }
  return [...byName].map(([name, values]) => ({ name, values }));
}

/** Every combination of the attributes' values, capped at MAX_VARIANTS. */
export function combinations(attributes: VariantAttribute[]): Record<string, string>[] {
  const usable = attributes.filter((a) => a.name.trim() !== "" && a.values.length > 0);
  if (usable.length === 0) return [];
  let combos: Record<string, string>[] = [{}];
  for (const attribute of usable) {
    const name = attribute.name.trim();
    combos = combos.flatMap((combo) => attribute.values.map((value) => ({ ...combo, [name]: value })));
  }
  return combos.slice(0, MAX_VARIANTS);
}

export function comboLabel(combo: Record<string, string>): string {
  const label = Object.values(combo).join(" / ");
  // Labels need 2+ characters, so a lone "S" becomes "Size S".
  return label.length >= 2
    ? label
    : Object.entries(combo).map(([name, value]) => `${name} ${value}`).join(" / ");
}

/**
 * Variant rows for the current attributes. Rows whose combination already
 * existed keep their id, price, stock, MOQ and SKU, so editing attributes
 * never wipes what the supplier typed.
 */
export function buildVariantRows(
  attributes: VariantAttribute[],
  previous: ExistingVariant[],
): ExistingVariant[] {
  // Match saved rows by their attribute values (custom labels survive), then
  // by label for rows that predate attributes.
  const byAttrs = new Map(previous.map((v) => [attrsKey(attrsOf(v)), v]));
  const byLabel = new Map(previous.map((v) => [v.label, v]));
  return combinations(attributes).map((combo) => {
    const label = comboLabel(combo);
    const kept = byAttrs.get(attrsKey(combo)) ?? byLabel.get(label);
    return {
      id: kept?.id,
      label: kept && attrsKey(attrsOf(kept)) === attrsKey(combo) ? kept.label : label,
      attrs: combo,
      attr_key: "",
      attr_value: "",
      seller_sku: kept?.seller_sku ?? "",
      price: kept?.price ?? 0,
      moq: kept?.moq ?? null,
      stock_qty: kept?.stock_qty ?? 0,
    };
  });
}

/** Split a typed or pasted entry ("S, M, L") into clean, de-duplicated values. */
export function parseValues(raw: string, existing: string[]): string[] {
  const next = [...existing];
  for (const part of raw.split(",")) {
    const value = part.trim().slice(0, 40);
    if (value && !next.some((v) => v.toLowerCase() === value.toLowerCase())) next.push(value);
  }
  return next;
}
