export type BillingDiscountType = "percentage" | "fixed" | undefined;

export type CalculateBillingRowInput = {
  unit_price: number;
  discount_type?: BillingDiscountType;
  discount_value?: number;
  tax_percent?: number;
  qty: number;
};

export type CalculateBillingRowOutput = {
  unit_price: number;
  discount_amount: number;
  discounted_price: number;
  tax_amount: number;
  row_total: number;
};

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function calculateBillingRow(
  input: CalculateBillingRowInput
): CalculateBillingRowOutput {
  const unitPrice = Number(input.unit_price || 0);
  const qty = Number(input.qty || 0);
  const taxPercent = Number(input.tax_percent || 0);
  const discountValue = Number(input.discount_value || 0);
  const discountType = input.discount_type;

  let perUnitDiscount = 0;
  if (qty > 0 && discountValue > 0 && discountType) {
    if (discountType === "percentage") {
      perUnitDiscount = (unitPrice * discountValue) / 100;
    } else {
      perUnitDiscount = discountValue;
    }
  }

  perUnitDiscount = Math.min(perUnitDiscount, unitPrice);

  const discountAmount = perUnitDiscount * qty;
  const discountedPrice = (unitPrice - perUnitDiscount) * qty;
  const taxAmount = (discountedPrice * taxPercent) / 100;
  const rowTotal = discountedPrice + taxAmount;

  return {
    unit_price: round2(unitPrice),
    discount_amount: round2(discountAmount),
    discounted_price: round2(discountedPrice),
    tax_amount: round2(taxAmount),
    row_total: round2(rowTotal),
  };
}
