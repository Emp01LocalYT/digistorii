"use client";

import { memo } from "react";
import type { SalesDetail } from "@/types/sales";
import SalesLineItemRow from "./SalesLineItemRow";

type SalesTableProps = {
  details: SalesDetail[];
  errors: Record<string, string | undefined>;
  taxes: any[];
  activeIndex?: number | null;
  onRateChange: (index: number, value: number | "") => void;
  onQtyChange: (index: number, value: number | "") => void;
  onDiscountChange: (index: number, value: number | "") => void;
  onTaxChange: (index: number, taxId: number | null) => void;
  onRemove: (index: number) => void;
  onSelectRow?: (index: number) => void;
};

const SalesTable = memo(function SalesTable({
  details,
  errors,
  taxes,
  activeIndex = null,
  onRateChange,
  onQtyChange,
  onDiscountChange,
  onTaxChange,
  onRemove,
  onSelectRow,
}: SalesTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="max-h-[58vh] overflow-auto">
        <table className="w-full min-w-[1120px] border-separate border-spacing-0 text-sm">
        <thead className="sticky top-0 z-10 bg-slate-100 text-[11px] uppercase tracking-wide text-slate-600">
          <tr>
            <th className="px-3 py-2 text-left font-semibold">Product Id</th>
            <th className="px-3 py-2 text-left font-semibold">Product Name</th>
            <th className="px-3 py-2 text-left font-semibold">Description</th>
            <th className="px-3 py-2 text-center font-semibold">Unit Price</th>
            <th className="px-3 py-2 text-center font-semibold">Discount</th>
            <th className="px-3 py-2 text-center font-semibold">Disc.Amt</th>
            <th className="px-3 py-2 text-center font-semibold">Qty</th>
            <th className="px-3 py-2 text-center font-semibold">Amount</th>
            <th className="px-3 py-2 text-center font-semibold">Tax %</th>
            <th className="px-3 py-2 text-center font-semibold">Tax Amt</th>
            <th className="px-3 py-2 text-center font-semibold">Total</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>

        <tbody>
          {details.map((row, index) => (
            <SalesLineItemRow
              key={`${row.product_id}-${index}`}
              row={row}
              index={index}
              taxes={taxes}
              isActive={activeIndex === index}
              productError={errors[`product_${index}`]}
              rateError={errors[`rate_${index}`]}
              qtyError={errors[`qty_${index}`]}
              onRateChange={onRateChange}
              onQtyChange={onQtyChange}
              onDiscountChange={onDiscountChange}
              onTaxChange={onTaxChange}
              onRemove={onRemove}
              onSelect={onSelectRow}
            />
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
});

export default SalesTable;
