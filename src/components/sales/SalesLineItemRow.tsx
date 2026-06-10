"use client";

import { memo, useCallback } from "react";
import type { ChangeEvent } from "react";
import { TrashIcon } from "@heroicons/react/24/outline";
import type { SalesDetail } from "@/types/sales";

type SalesLineItemRowProps = {
  row: SalesDetail;
  index: number;
  taxes: any[];
  isActive?: boolean;
  productError?: string;
  rateError?: string;
  qtyError?: string;
  onRateChange: (index: number, value: number | "") => void;
  onQtyChange: (index: number, value: number | "") => void;
  onDiscountChange: (index: number, value: number | "") => void;
  onTaxChange: (index: number, taxId: number | null) => void;
  onRemove: (index: number) => void;
  onSelect?: (index: number) => void;
};

const SalesLineItemRow = memo(function SalesLineItemRow({
  row,
  index,
  taxes,
  isActive = false,
  productError,
  rateError,
  qtyError,
  onRateChange,
  onQtyChange,
  onDiscountChange,
  onTaxChange,
  onRemove,
  onSelect,
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
  const handleSelect = useCallback(() => onSelect?.(index), [index, onSelect]);

  return (
    <tr
      className={`border-t border-slate-100 transition hover:bg-slate-50 ${isActive ? "bg-blue-50/70" : "bg-white"}`}
      onClick={handleSelect}
    >
      <td className="px-3 py-2 align-top">
        <div className="font-medium text-slate-700">{row.product_code || row.product_id || "-"}</div>
        {productError ? <p className="mt-1 text-xs text-red-500">{productError}</p> : null}
      </td>
      <td className="px-3 py-2 align-top">
        <div className="font-medium text-slate-800">{row.product_name}</div>
        <div className="text-xs text-slate-500">{row.barcode || row.sku || ""}</div>
      </td>
      <td className="max-w-[240px] px-3 py-2 align-top">
        <div className="truncate text-slate-600">{row.description || "-"}</div>
      </td>
      <td className="px-3 py-2 text-right align-top">
        <input
          type="number"
          value={row.rate === "" ? "" : row.rate}
          onChange={handleRateChange}
          onClick={(e) => e.stopPropagation()}
          className={`h-9 w-24 rounded-lg border px-2 text-right text-sm ${rateError ? "border-red-500" : "border-slate-200"}`}
        />
        {rateError ? <p className="mt-1 text-xs text-red-500">{rateError}</p> : null}
      </td>
      <td className="px-3 py-2 text-right align-top">
        <input
          type="number"
          value={row.discount_value === undefined ? "" : row.discount_value}
          onChange={handleDiscountChange}
          onClick={(e) => e.stopPropagation()}
          className="h-9 w-20 rounded-lg border border-slate-200 px-2 text-right text-sm"
        />
      </td>
      <td className="bg-slate-50 px-3 py-2 text-right align-top text-slate-500">
        {Number(row.discount || 0).toFixed(2)}
      </td>
      <td className="px-3 py-2 text-right align-top">
        <input
          type="number"
          value={row.qty === "" ? "" : row.qty}
          onChange={handleQtyChange}
          onClick={(e) => e.stopPropagation()}
          className={`h-9 w-20 rounded-lg border px-2 text-right text-sm ${qtyError ? "border-red-500" : "border-slate-200"}`}
        />
        {qtyError ? <p className="mt-1 text-xs text-red-500">{qtyError}</p> : null}
      </td>
      <td className="px-3 py-2 text-right align-top font-medium">{Number(row.amount || 0).toFixed(2)}</td>
      <td className="px-3 py-2 text-center align-top">
        <select
          value={row.tax_id ?? ""}
          onChange={handleTaxChange}
          onClick={(e) => e.stopPropagation()}
          className="h-9 w-28 rounded-lg border border-slate-200 px-2 text-sm"
        >
          <option value="">--Select--</option>
          {taxes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.tax_name || t.name || t.taxName || t.gst_name || ""}
            </option>
          ))}
        </select>
      </td>
      <td className="px-3 py-2 text-right align-top">{Number(row.tax_amount || 0).toFixed(2)}</td>
      <td className="px-3 py-2 text-right align-top font-semibold text-slate-900">{Number(row.line_total || 0).toFixed(2)}</td>
      <td className="px-3 py-2 align-top">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleRemove();
          }}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-100 text-red-600 hover:bg-red-50 hover:text-red-800"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </td>
    </tr>
  );
});

export default SalesLineItemRow;
