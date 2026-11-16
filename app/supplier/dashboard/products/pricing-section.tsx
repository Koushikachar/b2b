import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { FormSection } from "@/components/dashboard/form-section";

/** Negotiation toggle; prices themselves live in Product information. */
export function PricingSection({
  negotiable,
  onNegotiableChange,
}: {
  negotiable: boolean;
  onNegotiableChange: (value: boolean) => void;
}) {
  return (
    <FormSection
      id="pricing"
      title="Pricing"
      description="Buyers see your base price plus the margin set under Products → Margin. GST applies on top unless variants override it."
    >
      <FieldSet>
        <FieldLegend>Price</FieldLegend>
        <FieldGroup>
          <Field orientation="horizontal">
            <Switch id="negotiable-switch" checked={negotiable} onCheckedChange={onNegotiableChange} />
            <FieldLabel htmlFor="negotiable-switch">Price negotiable</FieldLabel>
            <input type="hidden" name="negotiable" value={negotiable ? "1" : ""} />
          </Field>
        </FieldGroup>
      </FieldSet>
    </FormSection>
  );
}
