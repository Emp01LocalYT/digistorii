"use client";

import { createPortal } from "react-dom";
import ProductFilters from "@/app/[company]/(user)/workspace/inventory/products/components/ProductFilters";
import {
  PRODUCT_LOOKUP_COLUMNS,
  PRODUCT_LOOKUP_COLUMN_LABELS,
  ProductLookupItem,
} from "@/lib/product-lookup";
import type { ProductLookupFilters } from "@/hooks/useProductLookup";

type ProductLookupModalProps = {
  open: boolean;
  onClose: () => void;
  onAddSelected: () => void;
  onAddNew?: () => void;
  isEditable?: boolean;
  errorMessage?: string;
  items: ProductLookupItem[];
  loading: boolean;
  filters: ProductLookupFilters;
  onFiltersChange: (next: ProductLookupFilters) => void;
  categoryOptions: Array<{ value: string; label: string }>;
  page: number;
  totalPages: number;
  itemsPerPage: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  isSelected: (item: ProductLookupItem) => boolean;
  onToggle: (item: ProductLookupItem) => void;
  onToggleAll: (checked: boolean, pageItems: ProductLookupItem[]) => void;
  showBarcodeInput?: boolean;
  barcodeValue?: string;
  barcodeMessage?: string;
  onBarcodeChange?: (value: string) => void;
  onBarcodeSubmit?: (value?: string) => void;
};

export default function ProductLookupModal({
  open,
  onClose,
  onAddSelected,
  onAddNew,
  isEditable = true,
  errorMessage,
  items,
  loading,
  filters,
  onFiltersChange,
  categoryOptions,
  page,
  totalPages,
  itemsPerPage,
  totalCount,
  onPageChange,
  isSelected,
  onToggle,
  onToggleAll,
  showBarcodeInput = false,
  barcodeValue = "",
  barcodeMessage,
  onBarcodeChange,
  onBarcodeSubmit,
}: ProductLookupModalProps) {
  if (!open) return null;

  const startIndex = totalCount === 0 ? 0 : (page - 1) * itemsPerPage + 1;
  const endIndex = Math.min(page * itemsPerPage, totalCount);

  const maxVisible = 5;
  let start = Math.max(1, page - 2);
  let end = Math.min(totalPages, page + 2);
  if (page <= 3) {
    start = 1;
    end = Math.min(totalPages, maxVisible);
  }
  if (page > totalPages - 3) {
    start = Math.max(1, totalPages - maxVisible + 1);
    end = totalPages;
  }
  const pages = [];
  for (let i = start; i <= end; i += 1) {
    pages.push(i);
  }

  const allSelected = items.length > 0 && items.every((item) => isSelected(item));

  return createPortal(
    <div className="fixed inset-0 z-[100002] bg-black/40 backdrop-blur-sm flex items-center justify-center">
      <div className="w-[1200px] max-w-[95vw] h-[700px] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-3 border-b bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-700">Select Products</h2>

          <div className="flex items-end gap-3">
            {errorMessage && <span className="text-red-500 text-sm">{errorMessage}</span>}
            {onAddNew ? (
              <button
                type="button"
                onClick={onAddNew}
                className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                + Add New ItemPO
              </button>
            ) : null}
            <button onClick={onClose} className="text-gray-500 hover:text-black text-xl">
              x
            </button>
          </div>
        </div>

        <div className="p-4 border-b bg-white space-y-3">
          {showBarcodeInput ? (
            <div className="flex flex-col sm:flex-row sm:items-end gap-3">
              <div className="flex-1">
                <label className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Barcode
                </label>
                <input
                  value={barcodeValue}
                  onChange={(e) => onBarcodeChange?.(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      onBarcodeSubmit?.(barcodeValue);
                    }
                  }}
                  placeholder="Scan or enter barcode"
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
                {barcodeMessage ? (
                  <span className="text-xs text-red-500 mt-1 block">{barcodeMessage}</span>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => onBarcodeSubmit?.(barcodeValue)}
                className="h-[42px] rounded-md bg-gray-900 px-4 text-sm font-medium text-white hover:bg-gray-800"
              >
                Add
              </button>
            </div>
          ) : null}
          <ProductFilters
            values={filters}
            onChange={onFiltersChange}
            categoryOptions={categoryOptions}
            searchPlaceholder="Search by SKU or product name"
          />
        </div>

        <div className="bg-white shadow-lg flex-1 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-indigo-50 text-gray-600 text-sm">
              <tr className="border-t hover:bg-blue-50 transition">
                <th className="p-3 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => onToggleAll(e.target.checked, items)}
                  />
                </th>
                {PRODUCT_LOOKUP_COLUMNS.map((col) => (
                  <th key={col} className="p-3 text-left">
                    {PRODUCT_LOOKUP_COLUMN_LABELS[col]}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr className="border-t">
                  <td colSpan={7} className="p-6 text-center text-gray-500">
                    Loading products...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr className="border-t">
                  <td colSpan={7} className="p-6 text-center text-gray-500">
                    No products found.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const cells: Record<string, string> = {
                    code: item.code || item.product_code || "-",
                    sku: item.sku || "-",
                    color: item.color || "-",
                    name: item.name || "-",
                    description: item.description || "-",
                    category: item.category_name || item.category || "-",
                    current_stock: item.current_stock != null ? String(+item.current_stock) : "-",
                  };
                  return (
                    <tr key={item.id} className="border-t hover:bg-blue-50 transition">
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected(item)}
                          onChange={() => onToggle(item)}
                        />
                      </td>
                      {PRODUCT_LOOKUP_COLUMNS.map((col) => (
                        <td key={col} className="p-3 text-gray-600">
                          {cells[col]}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-between items-center px-6 py-4 bg-gray-50 border-t">
          <p className="text-sm text-gray-500">
            Showing {startIndex}-{endIndex} of {totalCount} items
          </p>

          <div className="flex items-center gap-1">
            <button
              disabled={page === 1}
              onClick={() => onPageChange(page - 1)}
              className="px-3 py-1 text-sm border rounded bg-white disabled:opacity-50 hover:bg-gray-100"
            >
              Prev
            </button>

            {start > 1 && (
              <>
                <button
                  onClick={() => onPageChange(1)}
                  className="px-3 py-1 text-sm border rounded bg-white hover:bg-gray-100"
                >
                  1
                </button>
                {start > 2 && <span className="px-2 text-sm text-gray-500">...</span>}
              </>
            )}

            {pages.map((p) => (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={`px-3 py-1 text-sm border rounded transition-colors ${page === p
                  ? "bg-[var(--color-blue-600)] text-white border-indigo-600"
                  : "bg-white text-gray-600 hover:bg-gray-100"
                  }`}
              >
                {p}
              </button>
            ))}

            {end < totalPages && (
              <>
                {end < totalPages - 1 && <span className="px-2 text-sm text-gray-500">...</span>}
                <button
                  onClick={() => onPageChange(totalPages)}
                  className="px-3 py-1 text-sm border rounded bg-white hover:bg-gray-100"
                >
                  {totalPages}
                </button>
              </>
            )}

            <button
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="px-3 py-1 text-sm border rounded bg-white disabled:opacity-50 hover:bg-gray-100"
            >
              Next
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-3 border-t bg-gray-50">
          <button onClick={onClose} className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300">
            Cancel
          </button>
          <button
            onClick={() => {
              if (!isEditable) return;
              onAddSelected();
            }}
            className={`px-4 py-2 rounded-md text-white ${!isEditable ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
              }`}
          >
            Add Selected
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
