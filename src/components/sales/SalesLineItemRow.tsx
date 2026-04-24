"use client";

import { memo, useCallback } from "react";
import type { ChangeEvent } from "react";
import { TrashIcon } from "@heroicons/react/24/outline";
import type { SalesDetail } from "@/types/sales";

type SalesLineItemRowProps = {
  row: SalesDetail;
  index: number;
  taxes: any[];
  productError?: string;
  rateError?: string;
  qtyError?: string;
  onRateChange: (index: number, value: number | "") => void;
  onQtyChange: (index: number, value: number | "") => void;
  onDiscountChange: (index: number, value: number | "") => void;
  onTaxChange: (index: number, taxId: number | null) => void;
  onRemove: (index: number) => void;
};

const SalesLineItemRow = memo(function SalesLineItemRow({
  row,
  index,
  taxes,
  productError,
  rateError,
  qtyError,
  onRateChange,
  onQtyChange,
  onDiscountChange,
  onTaxChange,
  onRemove,
}: SalesLineItemRowProps) {
  const handleRateChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value === "" ? "" : Number(e.target.value);
      onRateChange(index, value);
    },
    [index, onRateChange]
  );

  const handleQtyChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value === "" ? "" : Number(e.target.value);
      onQtyChange(index, value);
    },
    [index, onQtyChange]
  );

  const handleDiscountChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value === "" ? "" : Number(e.target.value);
      onDiscountChange(index, value);
    },
    [index, onDiscountChange]
  );

  const handleTaxChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      onTaxChange(index, value ? Number(value) : null);
    },
    [index, onTaxChange]
  );

  const handleRemove = useCallback(() => onRemove(index), [index, onRemove]);

  return (
    <tr className="border-t hover:bg-gray-50">
      <td className="p-2">
        <div className="text-gray-700">{row.product_code || row.product_id || "-"}</div>
        {productError && <p className="text-red-500 text-sm mt-1">{productError}</p>}
      </td>
      <td className="p-2">
        <div className="text-gray-700">{row.product_name}</div>
      </td>
      <td className="p-2">
        <div className="text-gray-700">{row.description}</div>
      </td>
      {/* <td className="p-2">
        <div className="text-gray-700">{row.uom_name}</div>
      </td> */}
      <td className="text-right">
        <input
          type="number"
          value={row.rate === "" ? "" : row.rate}
          onChange={handleRateChange}
          className={`border p-1 rounded w-20 ${rateError ? "border-red-500" : ""}`}
        />
        {rateError && <p className="text-red-500 text-sm mt-1">{rateError}</p>}
      </td>
      <td className="text-right">
        <input
          type="number"
          value={row.discount_value === undefined ? "" : row.discount_value}
          onChange={handleDiscountChange}
          className="border p-1 rounded w-20"
        />
      </td>
      <td className="text-right text-gray-500 bg-gray-50">
        {Number(row.discount || 0).toFixed(2)}
      </td>
      <td className="text-right">
        <input
          type="number"
          value={row.qty === "" ? "" : row.qty}
          onChange={handleQtyChange}
          className={`border p-1 rounded w-20 ${qtyError ? "border-red-500" : ""}`}
        />
        {qtyError && <p className="text-red-500 text-sm mt-1">{qtyError}</p>}
      </td>
      <td className="text-right">{Number(row.amount || 0).toFixed(2)}</td>
      <td className="text-center">
        <select
          value={row.tax_id ?? ""}
          onChange={handleTaxChange}
          className="border p-1 rounded w-25"
        >
          <option value="">--Select--</option>
          {taxes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.tax_name || t.name || t.taxName || t.gst_name || ""}
            </option>
          ))}
        </select>
      </td>
      <td className="text-right">{Number(row.tax_amount || 0).toFixed(2)}</td>
      <td className="text-right">{Number(row.line_total || 0).toFixed(2)}</td>
      <td className="p-2 flex justify-center items-center">
        <button type="button" onClick={handleRemove} className="text-red-600 hover:text-red-800">
          <TrashIcon className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
});

export default SalesLineItemRow;
