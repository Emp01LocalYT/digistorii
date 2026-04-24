import type { PurchaseDetail, PurchaseHeader } from "../types";

export function calculateLineItem(row: PurchaseDetail): PurchaseDetail {
  const qty = Number(row.qty || 0);
  const rate = Number(row.rate || 0);
  const tax = Number(row.tax_percent || 0);
  const gross = qty * rate;
  const taxAmount = (gross * tax) / 100;
  const total = gross + taxAmount;
  return {
    ...row,
    amount: Number(gross.toFixed(2)),
    tax_amount: Number(taxAmount.toFixed(2)),
    line_total: Number(total.toFixed(2)),
  };
}

export function calculateTotals(details: PurchaseDetail[], header: PurchaseHeader) {
  const subtotal = details.reduce(
    (sum, d) => sum + Number(d.qty || 0) * Number(d.rate || 0),
    0
  );
  const productTax = details.reduce((sum, d) => sum + Number(d.tax_amount || 0), 0);
  const freightCharges = Number(header.freight_charges || 0);
  const freightTaxAmount = Number(header.freight_tax_amount || 0);
  const packagingAmount = Number(header.packaging_amount || 0);
  const extraChargesTotal = freightCharges + freightTaxAmount + packagingAmount;
  const grandTotal = subtotal + productTax + extraChargesTotal;
  const totalQty = details.reduce((sum, d) => sum + Number(d.qty || 0), 0);

  return {
    subtotal: Number(subtotal.toFixed(2)),
    productTax: Number(productTax.toFixed(2)),
    grandTotal: Number(grandTotal.toFixed(2)),
    freightCharges,
    freightTaxAmount,
    packagingAmount,
    extraChargesTotal: Number(extraChargesTotal.toFixed(2)),
    totalQty,
  };
}
