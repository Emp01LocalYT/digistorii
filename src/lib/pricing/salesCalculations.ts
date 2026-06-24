export type SalesRowCalculationInput = {
  rate: number | "";
  qty: number  | "";
  tax_percent: number | "";
  discount: number | "";
  discount_auto?: boolean;
  discount_type?: "percentage" | "fixed";
  discount_value?: number | "";
};

export type SalesTotals = {
  subtotal: number;
  discount: number;
  taxable: number;
  tax: number;
  total: number;
};

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function applySalesRowCalculation<
  T extends SalesRowCalculationInput & {
    amount?: number;
    tax_amount?: number;
    line_total?: number;
  }
>(
  row: T,
  discountMode: "percent" | "amount" = "percent"
): T {
  const qty = Number(row.qty || 0);
  const unitPrice = Number(row.rate || 0);
  const taxPercent = Number(row.tax_percent || 0);
  const lineAmount = unitPrice * qty;

  const isAuto = row.discount_auto === true;
  const discountValue = Number(row.discount_value || 0);
  let discountAmount = 0;

  if (isAuto) {
    const autoType = row.discount_type;
    if (autoType === "percentage") {
      discountAmount = (lineAmount * discountValue) / 100;
    } else if (autoType === "fixed") {
      discountAmount = discountValue * qty;
    }
  } else if (discountValue > 0) {
    discountAmount =
      discountMode === "percent"
        ? (lineAmount * discountValue) / 100
        : discountValue;
  }

  discountAmount = Math.min(Math.max(discountAmount, 0), lineAmount);
  const taxableAmount = lineAmount - discountAmount;
  const taxAmount = (taxableAmount * taxPercent) / 100;
  const lineTotal = taxableAmount + taxAmount;

  return {
    ...row,
    amount: round2(lineAmount),
    discount: round2(discountAmount),
    tax_amount: round2(taxAmount),
    line_total: round2(lineTotal),
  };
}

export function calculateSalesTotals(
  details: Array<{
    amount?: number | "";
    discount?: number | "";
    tax_amount?: number | "";
    line_total?: number | "";
    subtotal?: number | "";
  }>
): SalesTotals {
  const totals = details.reduce<SalesTotals>(
    (acc, row) => {
      const amount = Number(row.amount || 0);
      const discount = Number(row.discount || 0);
      const tax = Number(row.tax_amount || 0);
      const total = Number(row.line_total || 0);

      return {
        subtotal: acc.subtotal + amount,
        discount: acc.discount + discount,
        taxable: acc.taxable + (amount - discount),
        tax: acc.tax + tax,
        total: acc.total + total,
      };
    },
    { subtotal: 0, discount: 0, taxable: 0, tax: 0, total: 0 }
  );

  return {
    subtotal: round2(totals.subtotal),
    discount: round2(totals.discount),
    taxable: round2(totals.taxable),
    tax: round2(totals.tax),
    total: round2(totals.total),
  };
}