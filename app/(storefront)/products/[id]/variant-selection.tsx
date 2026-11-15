"use client"

import { createContext, useContext, useState, type ReactNode } from "react"
import { Badge } from "@/components/ui/badge"
import { discountPercent } from "@/lib/format"
import { cn } from "@/lib/utils"

export type SelectableVariant = {
  id: string
  label: string
  attrs: Record<string, string>
  customer_price: number | undefined
  moq: number | null
}

type Selection = { variantId: string; setVariantId: (id: string) => void }

/** "base" = the product itself (only used when it has no variants). */
const VariantSelectionContext = createContext<Selection>({ variantId: "base", setVariantId: () => {} })

/**
 * Shares the chosen variant between the price/chips panel (top of the buy
 * column) and the add-to-cart form further down, so one tap updates both.
 */
export function VariantSelectionProvider({
  variants,
  children,
}: {
  variants: SelectableVariant[]
  children: ReactNode
}) {
  const [variantId, setVariantId] = useState(variants[0]?.id ?? "base")
  return (
    <VariantSelectionContext.Provider value={{ variantId, setVariantId }}>
      {children}
    </VariantSelectionContext.Provider>
  )
}

export function useVariantSelection(): Selection {
  return useContext(VariantSelectionContext)
}

function rupees(n: number): string {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`
}

/** Attribute → values in first-seen order; legacy variants without attrs get "Option". */
function attributeGroups(variants: SelectableVariant[]): { name: string; values: string[] }[] {
  const groups = new Map<string, string[]>()
  for (const v of variants) {
    const entries = Object.entries(v.attrs)
    for (const [name, value] of entries.length > 0 ? entries : [["Option", v.label] as const]) {
      const values = groups.get(name) ?? []
      if (!values.includes(value)) values.push(value)
      groups.set(name, values)
    }
  }
  return [...groups].map(([name, values]) => ({ name, values }))
}

function attrsOf(v: SelectableVariant): Record<string, string> {
  return Object.keys(v.attrs).length > 0 ? v.attrs : { Option: v.label }
}

/**
 * Price (with MRP, discount pill and "You save"), variant chips and stock
 * state. Prices follow the selected variant.
 */
export function ProductPricePanel({
  basePrice,
  mrp,
  negotiable,
  outOfStock,
  variants,
}: {
  basePrice: number | null
  mrp: number | null
  negotiable: boolean
  outOfStock: boolean
  variants: SelectableVariant[]
}) {
  const { variantId, setVariantId } = useVariantSelection()
  const selected = variants.find((v) => v.id === variantId) ?? null
  const price = selected?.customer_price ?? basePrice
  // MRP belongs to the base item, so it is only compared with the base price
  // (a "Pack of 10" must not show a discount against a single unit's MRP).
  const off = selected ? 0 : discountPercent(mrp, price)
  const groups = attributeGroups(variants)
  const selectedAttrs = selected ? attrsOf(selected) : {}

  // Pick the variant matching the current choices with one attribute changed;
  // fall back to any variant carrying that value.
  function choose(name: string, value: string) {
    const wanted = { ...selectedAttrs, [name]: value }
    const exact = variants.find((v) =>
      Object.entries(wanted).every(([k, val]) => attrsOf(v)[k] === val),
    )
    const loose = variants.find((v) => attrsOf(v)[name] === value)
    const next = exact ?? loose
    if (next) setVariantId(next.id)
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
          <span className="text-3xl font-bold tracking-tight text-primary tabular-nums sm:text-[2rem]">
            {price != null ? rupees(price) : "Price on request"}
          </span>
          {off > 0 && mrp != null ? (
            <>
              <span className="text-lg text-muted-foreground line-through tabular-nums">
                <span className="sr-only">MRP </span>
                {rupees(mrp)}
              </span>
              <span className="rounded-full bg-primary px-2.5 py-0.5 text-sm font-bold text-primary-foreground tabular-nums">
                −{off}%
              </span>
            </>
          ) : null}
          {negotiable ? <Badge className="ml-auto">Price Negotiable</Badge> : null}
        </div>
        {price != null ? (
          <p className="mt-1 text-xs text-muted-foreground">+ GST</p>
        ) : null}
        {off > 0 && mrp != null && price != null ? (
          <p className="mt-2 text-sm font-semibold text-success tabular-nums">
            You save {rupees(Number((mrp - price).toFixed(2)))}
          </p>
        ) : null}
      </div>

      {groups.length > 0 ? (
        <div className="flex flex-col gap-4 border-t border-border pt-4">
          {groups.map((group) => (
            <fieldset key={group.name}>
              <legend className="text-sm text-muted-foreground">
                {group.name}:{" "}
                <span className="font-semibold text-foreground">{selectedAttrs[group.name] ?? "—"}</span>
              </legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {group.values.map((value) => {
                  const active = selectedAttrs[group.name] === value
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => choose(group.name, value)}
                      className={cn(
                        "press h-11 min-w-16 rounded-xl border px-4 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                        active
                          ? "border-foreground bg-foreground text-background"
                          : "border-border bg-card text-foreground hover:border-foreground/40",
                      )}
                    >
                      {value}
                    </button>
                  )
                })}
              </div>
            </fieldset>
          ))}
        </div>
      ) : null}

      <p
        className={cn(
          "flex items-center gap-2 text-sm font-medium",
          outOfStock ? "text-destructive" : "text-success",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "size-2.5 rounded-full ring-4",
            outOfStock ? "bg-destructive ring-destructive/15" : "bg-success ring-success/15",
          )}
        />
        {outOfStock ? "Out of stock" : "In stock"}
      </p>
    </div>
  )
}
