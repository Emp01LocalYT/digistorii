"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronLeftIcon, ChevronRightIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import { useTenant } from "@/context/TenantContext";
import { apiFetch } from "@/lib/apiFetch";
import { useProductLookup } from "@/hooks/useProductLookup";
import { usePagination } from "@/hooks/usePagination";
import { attachRuleValidationListeners, getRuleValidationError } from "@/lib/formValidationRules";
import { useConfirm } from "@/hooks/useConfirm";
import { useNotify } from "@/hooks/useNotify";

type WarehouseOption = { id: number; name: string };
type LocatorOption = { id: number; locator_name: string; warehouse_id: number };

type StockAdjustmentRow = {
  adjustment_id: number;
  txn_date: string;
  reason: string | null;
  warehouse_name: string | null;
  locator_name: string | null;
  system_qty: string | number;
  physical_qty: string | number;
  adjustment_qty: string | number;
  product_name: string;
  sku: string;
  color: string | null;
};

type StockAdjustmentForm = {
  txn_date: string;
  warehouse_id: string;
  locator_id: string;
  reason: string;
  physical_qty: string;
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function initialForm(): StockAdjustmentForm {
  return {
    txn_date: todayISO(),
    warehouse_id: "",
    locator_id: "",
    reason: "",
    physical_qty: "",
  };
}

export default function StockAdjustmentPage() {
  const { company } = useTenant();
  const confirm = useConfirm();
  const notify = useNotify();

  const [form, setForm] = useState<StockAdjustmentForm>(initialForm());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [listItems, setListItems] = useState<StockAdjustmentRow[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [locators, setLocators] = useState<LocatorOption[]>([]);

  // Product lookup state
  const [productSearch, setProductSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [systemStock, setSystemStock] = useState<number | null>(null);
  const [loadingStock, setLoadingStock] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  const formRef = useRef<HTMLFormElement | null>(null);

  const { items: lookupItems, loading: lookupLoading } = useProductLookup({
    enabled: Boolean(company),
  });

  const loadList = useCallback(async () => {
    if (!company) return;
    try {
      setTableLoading(true);
      const res = await apiFetch("/api/stock-adjustments", company);
      const data = await res.json();
      setListItems(data.success ? data.data || [] : []);
    } finally {
      setTableLoading(false);
    }
  }, [company]);

  async function loadWarehouses() {
    if (!company) return;
    const res = await apiFetch("/api/warehouses", company);
    const data = await res.json();
    setWarehouses(data.success ? data.data || [] : []);
  }

  async function loadLocators() {
    if (!company) return;
    const res = await apiFetch("/api/locators", company);
    const data = await res.json();
    setLocators(data.success ? data.data || [] : []);
  }

  useEffect(() => {
    void loadList();
    void loadWarehouses();
    void loadLocators();
  }, [company, loadList]);

  // Filter locators based on selected warehouse
  const availableLocators = useMemo(() => {
    if (!form.warehouse_id) return [];
    return locators.filter((loc) => String(loc.warehouse_id) === form.warehouse_id);
  }, [locators, form.warehouse_id]);

  // Reset locator if it doesn't belong to the newly selected warehouse
  useEffect(() => {
    if (!form.locator_id) return;
    const stillValid = availableLocators.some((loc) => String(loc.id) === form.locator_id);
    if (!stillValid) {
      setForm((prev) => ({ ...prev, locator_id: "" }));
    }
  }, [availableLocators, form.locator_id]);

  // Fetch system stock dynamically when selection changes
  useEffect(() => {
    if (!company || !form.warehouse_id || !form.locator_id || !selectedProduct) {
      setSystemStock(null);
      return;
    }

    async function fetchSystemStock() {
      setLoadingStock(true);
      try {
        const res = await apiFetch(
          `/api/stock-adjustments/current-stock?warehouse_id=${form.warehouse_id}&locator_id=${form.locator_id}&product_id=${selectedProduct.variant_id}`,
          company
        );
        const data = await res.json();
        if (data.success) {
          setSystemStock(Number(data.current_stock ?? 0));
        }
      } catch (err) {
        console.error("Error fetching system stock:", err);
      } finally {
        setLoadingStock(false);
      }
    }

    void fetchSystemStock();
  }, [company, form.warehouse_id, form.locator_id, selectedProduct]);

  // Autocomplete suggestions
  const suggestedProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    if (!query) return [];
    return lookupItems
      .filter((item) => {
        return (
          item.sku.toLowerCase().includes(query) ||
          item.name.toLowerCase().includes(query) ||
          (item.barcode && item.barcode.includes(query))
        );
      })
      .slice(0, 10);
  }, [productSearch, lookupItems]);

  // Handle barcode scanning / fast selection
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const query = productSearch.trim();
      if (!query) return;

      // Check exact barcode match first
      const exactMatch = lookupItems.find(
        (item) => String(item.barcode || "") === query || item.sku.toLowerCase() === query.toLowerCase()
      );

      if (exactMatch) {
        setSelectedProduct(exactMatch);
        setProductSearch(`${exactMatch.sku} - ${exactMatch.name}`);
        setSearchFocused(false);
      } else if (suggestedProducts.length > 0) {
        const first = suggestedProducts[0];
        setSelectedProduct(first);
        setProductSearch(`${first.sku} - ${first.name}`);
        setSearchFocused(false);
      }
    }
  };

  // Calculate Variance
  const varianceInfo = useMemo(() => {
    if (systemStock === null || !form.physical_qty) return null;
    const physical = Number(form.physical_qty);
    if (isNaN(physical) || physical < 0) return null;
    const diff = physical - systemStock;
    return {
      diff,
      color: diff > 0 ? "text-green-600 font-bold" : diff < 0 ? "text-red-600 font-bold" : "text-gray-500 font-medium",
      indicator: diff > 0 ? `+${diff} (Stock Gain)` : diff < 0 ? `${diff} (Stock Loss)` : "0 (No Change)",
    };
  }, [systemStock, form.physical_qty]);

  const {
    currentPage,
    itemsPerPage: rowsPerPage,
    setItemsPerPage: setRowsPerPage,
    totalItems,
    totalPages,
    pageNumbers,
    showingFrom,
    showingTo,
    paginatedData: paginatedListItems,
    goToPage,
    goToPreviousPage,
    goToNextPage,
  } = usePagination({
    data: listItems,
    initialItemsPerPage: 10,
  });

  const inputClass = (key: string) =>
    `w-full mt-2 border rounded-lg p-3 outline-none focus:ring-2 ${errors[key] ? "border-red-500 focus:ring-red-400" : "focus:ring-indigo-500"
    }`;

  function openForm() {
    setShowForm(true);
    setForm(initialForm());
    setSelectedProduct(null);
    setProductSearch("");
    setSystemStock(null);
    setErrors({});
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!form.txn_date) next.txn_date = "Date is required";
    if (!form.warehouse_id) next.warehouse_id = "Warehouse is required";
    if (!form.locator_id) next.locator_id = "Store locator is required";
    if (!selectedProduct) next.product_search = "Product selection is required";

    const physical = Number(form.physical_qty);
    if (!form.physical_qty) {
      next.physical_qty = "Physical quantity is required";
    } else if (isNaN(physical) || physical < 0) {
      next.physical_qty = "Quantity must be a positive number";
    }

    if (varianceInfo && varianceInfo.diff === 0) {
      next.physical_qty = "Physical quantity matches system quantity. Zero-variance adjustment is not allowed.";
    }

    if (form.reason && form.reason.trim()) {
      const reasonMessage = getRuleValidationError("alphanumeric-spaces-hyphens", form.reason);
      if (reasonMessage) next.reason = reasonMessage;
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit() {
    if (!company) return;
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        txn_date: form.txn_date,
        warehouse_id: Number(form.warehouse_id),
        locator_id: Number(form.locator_id),
        reason: form.reason.trim() || null,
        product_id: selectedProduct.variant_id,
        physical_qty: Number(form.physical_qty),
      };

      const res = await apiFetch("/api/stock-adjustments", company, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Save failed");

      notify("Stock adjustment successfully saved!");
      setShowForm(false);
      void loadList();
    } catch (error: any) {
      notify(error.message || "Failed to save stock adjustment", { severity: "error" });
    } finally {
      setSaving(false);
    }
  }

  // Attach dynamic input constraints validation
  useEffect(() => {
    if (!showForm || !formRef.current) return;
    const cleanup = attachRuleValidationListeners(formRef.current, (fieldName, message) => {
      setErrors((prev) => {
        if (message) return { ...prev, [fieldName]: message };
        const next = { ...prev };
        delete next[fieldName];
        return next;
      });
    });
    return cleanup;
  }, [showForm]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {saving &&
        createPortal(
          <div className="fixed inset-0 z-[99999] bg-black/20 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-white p-8 rounded-xl shadow-2xl flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-700 font-semibold text-lg">Saving Stock Adjustment...</p>
            </div>
          </div>,
          document.body
        )}

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">{showForm ? "New Stock Adjustment" : "Stock Adjustment History"}</h1>
          <p className="text-sm text-gray-500">Reconcile physical inventory counts against system records.</p>
        </div>
        {!showForm && (
          <button
            onClick={openForm}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2 rounded-lg transition"
          >
            Add Stock Adjustment
          </button>
        )}
      </div>

      {!showForm ? (
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-8">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-indigo-50 text-gray-600 uppercase text-xs">
                <tr className="border-t hover:bg-blue-50 transition">
                  <th className="p-4 text-left">Date</th>
                  <th className="p-4 text-left">SKU</th>
                  <th className="p-4 text-left">Product Name</th>
                  <th className="p-4 text-left">Color</th>
                  <th className="p-4 text-left">Location</th>
                  <th className="p-4 text-right">System Qty</th>
                  <th className="p-4 text-right">Physical Qty</th>
                  <th className="p-4 text-right">Adjustment Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tableLoading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-gray-400 animate-pulse">
                      Loading stock adjustments...
                    </td>
                  </tr>
                ) : paginatedListItems.length > 0 ? (
                  paginatedListItems.map((row) => (
                    <tr key={row.adjustment_id} className="border-t hover:bg-blue-50 transition">
                      <td className="p-4">{new Date(row.txn_date).toLocaleDateString()}</td>
                      <td className="p-4 font-mono font-medium">{row.sku}</td>
                      <td className="p-4 font-medium">{row.product_name}</td>
                      <td className="p-4">{row.color || "-"}</td>
                      <td className="p-4">
                        <span className="text-xs px-2 py-1 rounded bg-gray-100 font-semibold text-gray-600 block sm:inline mr-1">
                          {row.warehouse_name || "-"}
                        </span>
                        <span className="text-xs px-2 py-1 rounded bg-indigo-50 font-semibold text-indigo-600">
                          {row.locator_name || "-"}
                        </span>
                      </td>
                      <td className="p-4 text-right">{row.system_qty}</td>
                      <td className="p-4 text-right font-semibold text-gray-900">{row.physical_qty}</td>
                      <td className={`p-4 text-right font-bold ${Number(row.adjustment_qty) > 0 ? "text-green-600" : "text-red-600"
                        }`}>
                        {Number(row.adjustment_qty) > 0 ? `+${row.adjustment_qty}` : row.adjustment_qty}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-6 py-10 text-center text-gray-500">
                      No stock adjustments found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-gray-200 px-4 py-4 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{showingFrom}</span> to{" "}
                <span className="font-medium">{showingTo}</span> of{" "}
                <span className="font-medium">{totalItems}</span> results
              </p>
              <div className="flex items-center gap-2">
                <label htmlFor="adjust-rows-per-page" className="text-sm text-gray-600">
                  Rows per page
                </label>
                <select
                  id="adjust-rows-per-page"
                  value={rowsPerPage}
                  onChange={(e) => setRowsPerPage(Number(e.target.value))}
                  className="border rounded-md px-2 py-1 text-sm bg-white"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>

                <nav aria-label="Pagination" className="isolate inline-flex -space-x-px rounded-md shadow-sm">
                  <button
                    type="button"
                    onClick={goToPreviousPage}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-500 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ChevronLeftIcon className="h-5 w-5" />
                  </button>

                  {pageNumbers.map((page, idx) =>
                    page === "..." ? (
                      <span
                        key={`ellipsis-${idx}`}
                        className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300"
                      >
                        ...
                      </span>
                    ) : (
                      <button
                        key={`page-${page}`}
                        type="button"
                        onClick={() => goToPage(page)}
                        className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ring-1 ring-inset ring-gray-300 ${currentPage === page ? "z-10 bg-indigo-600 text-white" : "text-gray-900 hover:bg-gray-50"
                          }`}
                      >
                        {page}
                      </button>
                    )
                  )}

                  <button
                    type="button"
                    onClick={goToNextPage}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-500 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ChevronRightIcon className="h-5 w-5" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <form
          ref={formRef}
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          className="bg-white p-6 rounded-xl shadow space-y-6"
        >
          <div className="border-b pb-4">
            <h2 className="text-lg font-semibold text-gray-800">Adjustment Document Details</h2>
            <p className="text-xs text-gray-500">Provide header information and transaction reasons.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <label className="text-sm font-semibold mb-1 block">
                Transaction Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.txn_date}
                onChange={(e) => setForm({ ...form, txn_date: e.target.value })}
                className={inputClass("txn_date")}
              />
              {errors.txn_date && <p className="text-red-500 text-sm mt-1">{errors.txn_date}</p>}
            </div>

            <div>
              <label className="text-sm font-semibold mb-1 block">
                Warehouse <span className="text-red-500">*</span>
              </label>
              <select
                value={form.warehouse_id}
                onChange={(e) => setForm({ ...form, warehouse_id: e.target.value })}
                className={inputClass("warehouse_id")}
              >
                <option value="">Select Warehouse</option>
                {warehouses.map((wh) => (
                  <option key={wh.id} value={String(wh.id)}>
                    {wh.name}
                  </option>
                ))}
              </select>
              {errors.warehouse_id && <p className="text-red-500 text-sm mt-1">{errors.warehouse_id}</p>}
            </div>

            <div>
              <label className="text-sm font-semibold mb-1 block">
                Locator <span className="text-red-500">*</span>
              </label>
              <select
                value={form.locator_id}
                disabled={!form.warehouse_id}
                onChange={(e) => setForm({ ...form, locator_id: e.target.value })}
                className={inputClass("locator_id")}
              >
                <option value="">Select Locator</option>
                {availableLocators.map((loc) => (
                  <option key={loc.id} value={String(loc.id)}>
                    {loc.locator_name}
                  </option>
                ))}
              </select>
              {errors.locator_id && <p className="text-red-500 text-sm mt-1">{errors.locator_id}</p>}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 border-t pt-6">
            <div className="relative">
              <label className="text-sm font-semibold mb-1 block">
                Select Product Variant <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={productSearch}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                onChange={(e) => {
                  setProductSearch(e.target.value);
                  setSelectedProduct(null);
                  setSystemStock(null);
                }}
                onKeyDown={handleSearchKeyDown}
                className={inputClass("product_search")}
                placeholder="Scan barcode or type Name / SKU..."
              />
              {errors.product_search && <p className="text-red-500 text-sm mt-1">{errors.product_search}</p>}

              {searchFocused && suggestedProducts.length > 0 && (
                <div className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto border bg-white rounded-lg shadow-xl divide-y">
                  {suggestedProducts.map((item) => (
                    <div
                      key={item.variant_id}
                      onMouseDown={() => {
                        setSelectedProduct(item);
                        setProductSearch(`${item.sku} - ${item.name}`);
                      }}
                      className="p-3 hover:bg-indigo-50 cursor-pointer flex justify-between items-center text-sm"
                    >
                      <div>
                        <span className="font-semibold block text-gray-800">{item.name}</span>
                        <span className="text-xs text-gray-500 font-mono">SKU: {item.sku} | Color: {item.color || "NA"}</span>
                      </div>
                      {item.barcode && (
                        <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600 font-mono">
                          {item.barcode}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="text-sm font-semibold mb-1 block">Reason / Remarks</label>
              <textarea
                data-rules="alphanumeric-spaces-hyphens"
                data-field="reason"
                data-optional="true"
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                rows={1}
                className={inputClass("reason") + " resize-none"}
                placeholder="Damaged item, Audit variance, Shrinkage, etc."
              />
              {errors.reason && <p className="text-red-500 text-sm mt-1">{errors.reason}</p>}
            </div>
          </div>

          <div className="bg-gray-50 p-6 rounded-xl border space-y-6">
            <h3 className="text-md font-bold text-gray-800">Stock Count & Calculation</h3>

            <div className="grid sm:grid-cols-3 gap-6">
              <div>
                <label className="text-sm font-semibold text-gray-600 mb-1 block">Current System Stock</label>
                <div className="w-full mt-2 border rounded-lg p-3 bg-gray-100 font-bold text-lg text-gray-700 flex items-center gap-2">
                  {loadingStock ? (
                    <ArrowPathIcon className="h-5 w-5 animate-spin text-gray-400" />
                  ) : systemStock !== null ? (
                    systemStock
                  ) : (
                    <span className="text-sm font-normal text-gray-400">Select Warehouse, Locator & Product</span>
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1 block">
                  Physical Count Quantity <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  disabled={systemStock === null}
                  value={form.physical_qty}
                  onChange={(e) => setForm({ ...form, physical_qty: e.target.value })}
                  className={`${inputClass("physical_qty")} text-lg font-bold`}
                  placeholder="Enter physical qty"
                />
                {errors.physical_qty && <p className="text-red-500 text-sm mt-1">{errors.physical_qty}</p>}
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-600 mb-1 block">Calculated Variance</label>
                <div className="w-full mt-2 border rounded-lg p-3 bg-gray-100 font-bold text-lg text-gray-700">
                  {varianceInfo ? (
                    <span className={varianceInfo.color}>{varianceInfo.indicator}</span>
                  ) : (
                    <span className="text-sm font-normal text-gray-400">Enter Physical Count</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-4 justify-end border-t pt-4">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-5 py-3 rounded-lg border hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              // disabled={systemStock === null || !form.physical_qty || (varianceInfo && varianceInfo.diff === 0)}
              className="px-5 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Save Stock Adjustment
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
