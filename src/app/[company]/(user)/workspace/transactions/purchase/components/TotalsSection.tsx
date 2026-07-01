"use client";

type TotalsSectionProps = {
  formatMoney: (value: number) => string;
  itemsSubtotal: number;
  productTax: number;
  freightBase: number;
  freightTaxAmount: number;
  packagingAmount: number;
  extraChargesTotal: number;
  grandTotal: number;
};

export default function TotalsSection({
  formatMoney,
  itemsSubtotal,
  productTax,
  freightBase,
  freightTaxAmount,
  packagingAmount,
  extraChargesTotal,
  grandTotal,
}: TotalsSectionProps) {
  return (
    <div className="bg-white p-6 rounded-xl shadow">
      <h3 className="text-sm font-semibold text-gray-600 mb-4">Totals</h3>
      <div className="text-sm text-gray-700 space-y-2">
        <div className="flex justify-between">
          <span>Items Total</span>
          <span>{formatMoney(itemsSubtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span>Product Tax (GST)</span>
          <span>{formatMoney(productTax)}</span>
        </div>
        <div className="border-t pt-3 mt-2 space-y-2">
          <div className="flex justify-between">
            <span>Freight</span>
            <span>{formatMoney(freightBase)}</span>
          </div>
          <div className="flex justify-between">
            <span>Freight Tax</span>
            <span>{formatMoney(freightTaxAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span>Packaging</span>
            <span>{formatMoney(packagingAmount)}</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>Extra Charges Total</span>
            <span>{formatMoney(extraChargesTotal)}</span>
          </div>
        </div>
        <div className="border-t pt-3 flex justify-between text-lg font-bold text-indigo-600">
          <span>Grand Total</span>
          <span>{formatMoney(grandTotal)}</span>
        </div>
      </div>
    </div>
  );
}
