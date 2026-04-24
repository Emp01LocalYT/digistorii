"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DocumentDuplicateIcon,
  PencilSquareIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { useTenant } from "@/context/TenantContext";
import ProductLookupModal from "@/components/product/ProductLookupModal";
import { useProductLookup } from "@/hooks/useProductLookup";
import { usePagination } from "@/hooks/usePagination";
import type { ProductLookupItem } from "@/lib/product-lookup";

type Discount = {
  id?: string;
  name: string;
  description?: string;
  discount_type: "percentage" | "fixed";
  value: number;
  coupon_code?: string | null;
  priority: number;
  starts_at?: string | null;
  ends_at?: string | null;
  is_active: boolean;
  created_at?: string;
  variant_count?: number;
};

const initialForm: Discount = {
  name: "",
  description: "",
  discount_type: "percentage",
  value: 0,
  coupon_code: "",
  priority: 1,
  starts_at: "",
  ends_at: "",
  is_active: true,
};

export default function DiscountSchemesPage() {
  const { company } = useTenant();
  const {
    items: lookupItems,
    loading: lookupLoading,
    filters: lookupFilters,
    setFilters: setLookupFilters,
    page: lookupPage,
    setPage: setLookupPage,
    totalPages: lookupTotalPages,
    itemsPerPage: lookupItemsPerPage,
    paginatedItems: lookupPaginatedItems,
    totalCount: lookupTotalCount,
    categoryOptions: lookupCategoryOptions,
    resetFilters: resetLookupFilters,
  } = useProductLookup({ enabled: Boolean(company) });

  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Discount>(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");

  const [selectModalOpen, setSelectModalOpen] = useState(false);
  const [selectedVariantMap, setSelectedVariantMap] = useState<Record<string, boolean>>({});
  const [barcodeValue, setBarcodeValue] = useState("");
  const [barcodeMessage, setBarcodeMessage] = useState("");

  useEffect(() => {
    if (!company) return;
    fetchDiscounts();
  }, [company]);

  const fetchDiscounts = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/discounts", {
        headers: { "x-tenant": company || "" },
      });
      const data = await res.json();
      if (data?.success) {
        setDiscounts(data.data || []);
      }
    } catch (err) {
      console.error("Failed to load discounts", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredDiscounts = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return discounts;
    return discounts.filter((d) =>
      `${d.name} ${d.discount_type} ${d.value} ${d.coupon_code || ""} ${d.priority}`
        .toLowerCase()
        .includes(needle)
    );
  }, [discounts, search]);

  const sortedDiscounts = useMemo(() => filteredDiscounts, [filteredDiscounts]);

  const {
    currentPage,
    itemsPerPage: rowsPerPage,
    setItemsPerPage: setRowsPerPage,
    totalItems,
    totalPages,
    pageNumbers,
    showingFrom,
    showingTo,
    paginatedData: paginatedDiscounts,
    goToPage,
    goToPreviousPage,
    goToNextPage,
  } = usePagination({
    data: sortedDiscounts,
    initialItemsPerPage: 10,
    resetDeps: [search],
  });

  const allFilteredSelected =
    lookupPaginatedItems.length > 0 &&
    lookupPaginatedItems.every((row) => selectedVariantMap[String(row.variant_id)]);

  const toggleSelectAll = (checked: boolean, rows: ProductLookupItem[]) => {
    if (!checked) {
      setSelectedVariantMap((prev) => {
        const next = { ...prev };
        rows.forEach((row) => {
          delete next[String(row.variant_id)];
        });
        return next;
      });
      return;
    }
    setSelectedVariantMap((prev) => {
      const next = { ...prev };
      rows.forEach((row) => {
        next[String(row.variant_id)] = true;
      });
      return next;
    });
  };

  const toggleVariantSelection = (item: ProductLookupItem) => {
    const key = String(item.variant_id);
    setSelectedVariantMap((prev) => {
      if (prev[key]) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: true };
    });
  };

  const selectedVariantIds = useMemo(
    () => Object.keys(selectedVariantMap).map((id) => Number(id)).filter((id) => Number.isFinite(id)),
    [selectedVariantMap]
  );

  const handleBarcodeSubmit = (value?: string) => {
    const barcode = String(value ?? barcodeValue).trim();
    if (!barcode) return;
    const match = lookupItems.find((item) => String(item.barcode || "") === barcode);
    if (!match) {
      setBarcodeMessage(`Barcode "${barcode}" not found.`);
      return;
    }
    setBarcodeMessage("");
    setSelectedVariantMap((prev) => ({ ...prev, [String(match.variant_id)]: true }));
    setBarcodeValue("");
  };

  const resetForm = () => {
    setForm(initialForm);
    setSelectedVariantMap({});
    setErrors({});
    resetLookupFilters();
  };

  const openCreate = () => {
    setShowForm(true);
    resetForm();
  };

  const openEdit = async (discount: Discount) => {
    if (!discount.id) return;
    try {
      setSaving(true);
      const res = await fetch(`/api/discounts/${discount.id}`, {
        headers: { "x-tenant": company || "" },
      });
      const data = await res.json();
      if (!data?.success) {
        throw new Error(data?.error || "Failed to load discount");
      }
      const row = data.data;
      setForm({
        id: row.id,
        name: row.name || "",
        description: row.description || "",
        discount_type: row.discount_type,
        value: Number(row.value || 0),
        coupon_code: row.coupon_code || "",
        priority: Number(row.priority || 1),
        starts_at: row.starts_at ? String(row.starts_at).slice(0, 10) : "",
        ends_at: row.ends_at ? String(row.ends_at).slice(0, 10) : "",
        is_active: Boolean(row.is_active),
      });
      const map: Record<string, boolean> = {};
      (row.variant_ids || []).forEach((id: number) => {
        map[String(id)] = true;
      });
      setSelectedVariantMap(map);
      setErrors({});
      setShowForm(true);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "Discount name is required";
    if (!form.discount_type) next.discount_type = "Discount type is required";
    if (Number(form.value || 0) < 0) next.value = "Discount value must be >= 0";
    if (form.starts_at && form.ends_at && form.starts_at > form.ends_at) {
      next.ends_at = "End date must be after start date";
    }
    if (selectedVariantIds.length === 0) {
      next.variants = "Select at least one variant";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const saveDiscount = async () => {
    if (!validate()) return;
    try {
      setSaving(true);
      const payload = {
        name: form.name,
        description: form.description,
        discount_type: form.discount_type,
        value: form.value,
        coupon_code: form.coupon_code || null,
        priority: form.priority,
        starts_at: form.starts_at || null,
        ends_at: form.ends_at || null,
        is_active: form.is_active,
        variant_ids: selectedVariantIds,
      };
      const isEdit = Boolean(form.id);
      const res = await fetch(isEdit ? `/api/discounts/${form.id}` : "/api/discounts", {
        method: isEdit ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant": company || "",
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data?.success) throw new Error(data?.error || "Failed to save discount");
      await fetchDiscounts();
      setShowForm(false);
      resetForm();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (discount: Discount) => {
    if (!discount.id) return;
    try {
      const res = await fetch(`/api/discounts/${discount.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-tenant": company || "",
        },
        body: JSON.stringify({ is_active: !discount.is_active }),
      });
      const data = await res.json();
      if (!data?.success) throw new Error(data?.error || "Failed to update status");
      setDiscounts((prev) =>
        prev.map((row) => (row.id === discount.id ? { ...row, is_active: !discount.is_active } : row))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const duplicateDiscount = async (discount: Discount) => {
    if (!discount.id) return;
    try {
      setSaving(true);
      const res = await fetch(`/api/discounts/${discount.id}`, {
        headers: { "x-tenant": company || "" },
      });
      const data = await res.json();
      if (!data?.success) throw new Error(data?.error || "Failed to load discount");

      const row = data.data;
      await fetch(`/api/discounts/${discount.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-tenant": company || "",
        },
        body: JSON.stringify({ is_active: false }),
      });

      await fetch("/api/discounts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant": company || "",
        },
        body: JSON.stringify({
          name: `${row.name} (Copy)`,
          description: row.description,
          discount_type: row.discount_type,
          value: row.value,
          coupon_code: null,
          priority: row.priority,
          starts_at: row.starts_at ? String(row.starts_at).slice(0, 10) : null,
          ends_at: row.ends_at ? String(row.ends_at).slice(0, 10) : null,
          is_active: true,
          variant_ids: row.variant_ids || [],
        }),
      });

      await fetchDiscounts();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {saving &&
        createPortal(
          <div className="fixed inset-0 z-[99999] bg-black/20 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-white p-8 rounded-xl shadow-2xl flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-700 font-semibold text-lg">Processing...</p>
            </div>
          </div>,
          document.body
        )}

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{showForm ? "Discount Scheme" : "Discount Schemes"}</h1>
        {!showForm && (
          <button
            onClick={openCreate}
            className="bg-[var(--color-blue-500)] flex items-center gap-2 text-white px-4 py-2 rounded-lg"
          >
            <PlusIcon className="w-4 h-4" />
            Add Discount
          </button>
        )}
      </div>

      {!showForm && (
        <>
          <div className="relative max-w-sm">
            <input
              type="text"
              placeholder="Search discount..."
              className="w-full pl-4 pr-4 py-2 border rounded-lg"
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-indigo-50 text-gray-600 text-sm">
                  <tr className="border-t hover:bg-blue-50 transition">
                    <th className="p-4 text-left">Name</th>
                    <th>Type</th>
                    <th>Value</th>
                    <th>Coupon</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr className="border-t hover:bg-blue-50 transition">
                      <td colSpan={9} className="text-center py-8 text-gray-400">
                        Loading...
                      </td>
                    </tr>
                  ) : paginatedDiscounts.length > 0 ? (
                    paginatedDiscounts.map((d) => (
                      <tr key={d.id} className="border-t hover:bg-blue-50 transition">
                        <td className="p-4 text-left">{d.name}</td>
                        <td className="text-center capitalize">{d.discount_type}</td>
                        <td className="text-center">{Number(d.value || 0).toFixed(2)}</td>
                        <td className="text-center">{d.coupon_code || "-"}</td>
                        <td className="text-center">{d.starts_at ? String(d.starts_at).slice(0, 10) : "-"}</td>
                        <td className="text-center">{d.ends_at ? String(d.ends_at).slice(0, 10) : "-"}</td>
                        <td className="text-center">{d.priority}</td>
                        <td className="text-center">
                          <span
                            className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                              d.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                            }`}
                          >
                            {d.is_active ? "ACTIVE" : "INACTIVE"}
                          </span>
                        </td>
                        <td className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => openEdit(d)} className="text-indigo-600">
                              <PencilSquareIcon className="w-5 h-5" />
                            </button>
                            <button onClick={() => toggleStatus(d)} className="text-gray-700 text-xs">
                              {d.is_active ? "Deactivate" : "Activate"}
                            </button>
                            <button onClick={() => duplicateDiscount(d)} className="text-gray-700">
                              <DocumentDuplicateIcon className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="text-center py-8 text-gray-400">
                        No records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between items-center px-6 py-4 bg-gray-50 border-t">
              <div className="flex flex-col gap-3 w-full">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{showingFrom}</span> to{" "}
                    <span className="font-medium">{showingTo}</span> of{" "}
                    <span className="font-medium">{totalItems}</span> results
                  </p>
                  <div className="flex items-center gap-2">
                    <label htmlFor="discount-rows-per-page" className="text-sm text-gray-600">
                      Rows per page
                    </label>
                    <select
                      id="discount-rows-per-page"
                      value={rowsPerPage}
                      onChange={(e) => setRowsPerPage(Number(e.target.value))}
                      className="rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex flex-1 justify-between sm:hidden">
                    <button
                      type="button"
                      onClick={goToPreviousPage}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      onClick={goToNextPage}
                      disabled={currentPage === totalPages}
                      className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>

                  <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-end">
                    <nav aria-label="Pagination" className="isolate inline-flex -space-x-px rounded-md shadow-sm">
                      <button
                        type="button"
                        onClick={goToPreviousPage}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-500 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <span className="sr-only">Previous</span>
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
                            aria-current={currentPage === page ? "page" : undefined}
                            className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ring-1 ring-inset ring-gray-300 ${
                              currentPage === page
                                ? "z-10 bg-indigo-600 text-white"
                                : "text-gray-900 hover:bg-gray-50"
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
                        <span className="sr-only">Next</span>
                        <ChevronRightIcon className="h-5 w-5" />
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {showForm && (
        <div className="bg-white p-8 rounded-2xl shadow border space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-semibold mb-1 block">
                Discount Name <span className="text-red-500">*</span>
              </label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border p-3 rounded"
              />
              {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}
            </div>

            <div>
              <label className="text-sm font-semibold mb-1 block">Description</label>
              <input
                value={form.description || ""}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full border p-3 rounded"
              />
            </div>

            <div>
              <label className="text-sm font-semibold mb-1 block">
                Discount Type <span className="text-red-500">*</span>
              </label>
              <select
                value={form.discount_type}
                onChange={(e) =>
                  setForm({
                    ...form,
                    discount_type: e.target.value === "fixed" ? "fixed" : "percentage",
                  })
                }
                className="w-full border p-3 rounded"
              >
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed Amount</option>
              </select>
              {errors.discount_type && <p className="text-red-500 text-sm">{errors.discount_type}</p>}
            </div>

            <div>
              <label className="text-sm font-semibold mb-1 block">
                Discount Value <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={form.value === 0 ? "" : form.value}
                onChange={(e) =>
                  setForm({ ...form, value: e.target.value === "" ? 0 : Number(e.target.value) })
                }
                className="w-full border p-3 rounded"
                min="0"
                step="0.01"
              />
              {errors.value && <p className="text-red-500 text-sm">{errors.value}</p>}
            </div>

            <div>
              <label className="text-sm font-semibold mb-1 block">Priority</label>
              <input
                type="number"
                value={form.priority}
                onChange={(e) =>
                  setForm({ ...form, priority: Math.max(1, Number(e.target.value || 1)) })
                }
                className="w-full border p-3 rounded"
                min="1"
              />
            </div>

            <div>
              <label className="text-sm font-semibold mb-1 block">Coupon Code (optional)</label>
              <input
                value={form.coupon_code || ""}
                onChange={(e) => setForm({ ...form, coupon_code: e.target.value })}
                className="w-full border p-3 rounded"
              />
            </div>

            <div>
              <label className="text-sm font-semibold mb-1 block">Start Date</label>
              <input
                type="date"
                value={form.starts_at || ""}
                onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                className="w-full border p-3 rounded"
              />
            </div>

            <div>
              <label className="text-sm font-semibold mb-1 block">End Date</label>
              <input
                type="date"
                value={form.ends_at || ""}
                onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
                className="w-full border p-3 rounded"
              />
              {errors.ends_at && <p className="text-red-500 text-sm">{errors.ends_at}</p>}
            </div>

            <div className="flex items-center gap-2 mt-6">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="w-4 h-4"
              />
              <label className="text-sm font-medium">Active</label>
            </div>
          </div>

          <div className="flex items-center justify-between border-t pt-4">
            <div>
              <p className="text-sm text-gray-600">
                Selected Variants: <span className="font-semibold">{selectedVariantIds.length}</span>
              </p>
              {errors.variants && <p className="text-red-500 text-sm">{errors.variants}</p>}
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectModalOpen(true);
                resetLookupFilters();
              }}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white"
            >
              Select Variants
            </button>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              className="px-6 py-2 rounded-lg border border-gray-300 text-gray-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveDiscount}
              disabled={saving}
              className="bg-[var(--color-blue-500)] text-white px-6 py-2 rounded-lg disabled:opacity-50"
            >
              {form.id ? "Update Discount" : "Create Discount"}
            </button>
          </div>
        </div>
      )}

      {selectModalOpen ? (
        <ProductLookupModal
          open={selectModalOpen}
          onClose={() => setSelectModalOpen(false)}
          onAddSelected={() => setSelectModalOpen(false)}
          items={lookupPaginatedItems}
          loading={lookupLoading}
          filters={lookupFilters}
          onFiltersChange={(next) => {
            setLookupFilters(next);
            setLookupPage(1);
          }}
          categoryOptions={lookupCategoryOptions}
          page={lookupPage}
          totalPages={lookupTotalPages}
          itemsPerPage={lookupItemsPerPage}
          totalCount={lookupTotalCount}
          onPageChange={setLookupPage}
          isSelected={(item) => Boolean(selectedVariantMap[String(item.variant_id)])}
          onToggle={toggleVariantSelection}
          onToggleAll={(checked, pageItems) => toggleSelectAll(checked, pageItems)}
          showBarcodeInput
          barcodeValue={barcodeValue}
          barcodeMessage={barcodeMessage}
          onBarcodeChange={(value) => {
            setBarcodeValue(value);
            setBarcodeMessage("");
          }}
          onBarcodeSubmit={handleBarcodeSubmit}
        />
      ) : null}
    </div>
  );
}
