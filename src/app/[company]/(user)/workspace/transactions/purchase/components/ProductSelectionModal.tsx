"use client";

import { Dispatch, SetStateAction } from "react";
import { createPortal } from "react-dom";
import ProductFilters from "../../../../workspace/inventory/products/components/ProductFilters";
import {
  PRODUCT_LOOKUP_COLUMNS,
  PRODUCT_LOOKUP_COLUMN_LABELS,
} from "@/lib/product-lookup";
import type { ProductCatalogItem, ProductFiltersState } from "./types";

type ProductSelectionModalProps = {
  open: boolean;
  onClose: () => void;
  onAddNew: () => void;
  onAddSelected: () => void;
  isEditable: boolean;
  popupError: string;
  productFilters: ProductFiltersState;
  onFiltersChange: (next: ProductFiltersState) => void;
  categoryOptions: Array<{ value: string; label: string }>;
  paginatedProducts: ProductCatalogItem[];
  selectedProducts: ProductCatalogItem[];
  toggleProduct: (product: ProductCatalogItem) => void;
  setSelectedProducts: Dispatch<SetStateAction<ProductCatalogItem[]>>;
  productTypeLabel: Record<string, string>;
  sourceLabel: Record<string, string>;
  categoryLabelMap: Map<string, string>;
  pageLoading: boolean;
  popupCurrentPage: number;
  popupItemsPerPage: number;
  popupTotalPages: number;
  filteredCount: number;
  onPageChange: (page: number) => void;
};

export default function ProductSelectionModal({
  open,
  onClose,
  onAddNew,
  onAddSelected,
  isEditable,
  popupError,
  productFilters,
  onFiltersChange,
  categoryOptions,
  paginatedProducts,
  selectedProducts,
  toggleProduct,
  setSelectedProducts,
  categoryLabelMap,
  pageLoading,
  popupCurrentPage,
  popupItemsPerPage,
  popupTotalPages,
  filteredCount,
  onPageChange,
}: ProductSelectionModalProps) {
  if (!open) return null;

  const startIndex = filteredCount === 0 ? 0 : (popupCurrentPage - 1) * popupItemsPerPage + 1;
  const endIndex = Math.min(popupCurrentPage * popupItemsPerPage, filteredCount);
  const maxVisible = 5;
  let start = Math.max(1, popupCurrentPage - 2);
  let end = Math.min(popupTotalPages, popupCurrentPage + 2);
  if (popupCurrentPage <= 3) {
    start = 1;
    end = Math.min(popupTotalPages, maxVisible);
  }
  if (popupCurrentPage > popupTotalPages - 3) {
    start = Math.max(1, popupTotalPages - maxVisible + 1);
    end = popupTotalPages;
  }
  const pages = [];
  for (let i = start; i <= end; i += 1) {
    pages.push(i);
  }

  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-black/40 backdrop-blur-sm flex items-center justify-center">
      <div className="w-[1200px] max-w-[95vw] h-[700px] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-3 border-b bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-700">Select Products</h2>

          <div className="flex items-end gap-3">
            {popupError && <span className="text-red-500 text-sm">{popupError}</span>}
            <button
              type="button"
              onClick={onAddNew}
              className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              + Add New Item
            </button>
            <button onClick={onClose} className="text-gray-500 hover:text-black text-xl">
              x
            </button>
          </div>
        </div>

        <div className="p-4 border-b bg-white">
          <ProductFilters
            values={productFilters}
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
                    checked={
                      paginatedProducts.length > 0 &&
                      paginatedProducts.every((p) =>
                        selectedProducts.some((sp) => sp.id === p.id)
                      )
                    }
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedProducts((prev) => {
                          const map = new Map(prev.map((p) => [p.id, p]));
                          paginatedProducts.forEach((p) => {
                            if (!map.has(p.id)) map.set(p.id, p);
                          });
                          return Array.from(map.values());
                        });
                      } else {
                        setSelectedProducts((prev) =>
                          prev.filter((p) => !paginatedProducts.some((pg) => pg.id === p.id))
                        );
                      }
                    }}
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
              {pageLoading ? (
                <tr className="border-t">
                  <td colSpan={7} className="p-6 text-center text-gray-500">
                    Loading products...
                  </td>
                </tr>
              ) : paginatedProducts.length === 0 ? (
                <tr className="border-t">
                  <td colSpan={7} className="p-6 text-center text-gray-500">
                    No products found.
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((p) => {
                  const categoryLabel = p.category
                    ? categoryLabelMap.get(String(p.category)) || String(p.category)
                    : "-";
                  return (
                    <tr key={p.id} className="border-t hover:bg-blue-50 transition">
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedProducts.some((sp) => sp.id === p.id)}
                          onChange={() => toggleProduct(p)}
                        />
                      </td>
                      <td className="p-3 font-medium text-gray-700">{p.product_code}</td>
                      <td className="p-3 text-gray-600">{p.sku || "-"}</td>
                      <td className="p-3 text-gray-600">{p.color || "-"}</td>
                      <td className="p-3 text-gray-600">{p.name}</td>
                      <td className="p-3 text-gray-600">{p.description || "-"}</td>
                      <td className="p-3 text-gray-600">{categoryLabel}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-between items-center px-6 py-4 bg-gray-50 border-t">
          <p className="text-sm text-gray-500">
            Showing {startIndex}-{endIndex} of {filteredCount} items
          </p>

          <div className="flex items-center gap-1">
            <button
              disabled={popupCurrentPage === 1}
              onClick={() => onPageChange(popupCurrentPage - 1)}
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

            {pages.map((page) => (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`px-3 py-1 text-sm border rounded transition-colors ${popupCurrentPage === page
                    ? "bg-[var(--color-blue-600)] text-white border-indigo-600"
                    : "bg-white text-gray-600 hover:bg-gray-100"
                  }`}
              >
                {page}
              </button>
            ))}

            {end < popupTotalPages && (
              <>
                {end < popupTotalPages - 1 && (
                  <span className="px-2 text-sm text-gray-500">...</span>
                )}
                <button
                  onClick={() => onPageChange(popupTotalPages)}
                  className="px-3 py-1 text-sm border rounded bg-white hover:bg-gray-100"
                >
                  {popupTotalPages}
                </button>
              </>
            )}

            <button
              disabled={popupCurrentPage >= popupTotalPages}
              onClick={() => onPageChange(popupCurrentPage + 1)}
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
