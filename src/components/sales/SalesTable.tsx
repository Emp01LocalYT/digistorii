"use client";

import { memo } from "react";
import type { SalesDetail } from "@/types/sales";
import SalesLineItemRow from "./SalesLineItemRow";

type SalesTableProps = {
  details: SalesDetail[];
  errors: Record<string, string | undefined>;
  taxes: any[];
  onRateChange: (index: number, value: number | "") => void;
  onQtyChange: (index: number, value: number | "") => void;
  onDiscountChange: (index: number, value: number | "") => void;
  onTaxChange: (index: number, taxId: number | null) => void;
  onRemove: (index: number) => void;
};

const SalesTable = memo(function SalesTable({
  details,
  errors,
  taxes,
  onRateChange,
  onQtyChange,
  onDiscountChange,
  onTaxChange,
  onRemove,
}: SalesTableProps) {
  return (
    <div className="bg-white rounded-xl shadow overflow-auto max-h-[480px]">
      <table className="w-full text-sm table-auto border-separate border-spacing-0">
        <thead className="bg-gray-50 text-sm">
          <tr>
            <th className="p-3 text-sm text-left">Product Id</th>
            <th className="p-3 text-sm text-left">Product Name</th>
            <th className="p-3 text-sm text-left">Description</th>
            {/* <th className="p-3 text-sm">UOM</th> */}
            <th className="p-3 text-sm">Unit Price</th>
            <th className="p-3 text-sm">Discount</th>
            <th className="p-3 text-sm">Disc.Amt</th>
            <th className="p-3 text-sm">Qty</th>
            <th className="p-3 text-sm">Amount</th>
            <th className="p-3 text-sm">Tax %</th>
            <th className="p-3 text-sm">Tax Amt</th>
            <th className="p-3 text-sm">Total</th>
            <th className="p-3"></th>
          </tr>
        </thead>

        <tbody>
          {details.map((row, index) => (
            <SalesLineItemRow
              key={`${row.product_id}-${index}`}
              row={row}
              index={index}
              taxes={taxes}
              productError={errors[`product_${index}`]}
              rateError={errors[`rate_${index}`]}
              qtyError={errors[`qty_${index}`]}
              onRateChange={onRateChange}
              onQtyChange={onQtyChange}
              onDiscountChange={onDiscountChange}
              onTaxChange={onTaxChange}
              onRemove={onRemove}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
});

export default SalesTable;
