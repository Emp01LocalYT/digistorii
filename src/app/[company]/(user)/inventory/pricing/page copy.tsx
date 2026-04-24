"use client";

import { useEffect, useMemo, useState } from "react";
import { useTenant } from "@/context/TenantContext";
import { apiFetch } from "@/lib/apiFetch";

type ActivePricingRow = {
  id: string | number;
  sku: string;
  source_type?: "vendor" | "own";
  landed_price: number | string;
  margin_percent: number | string;
  unit_price: number | string;
  active_from: string;
  expires_at?: string | null;
};

type CatalogRow = {
  product_id: number;
  product_name: string;
  sku: string;
  effective_date?: string | null;
};

type EntryRow = {
  product_id: number;
  product_name: string;
  sku: string;
  base_cost: string;
  operational_cost: string;
  margin_percent: string;
};

function asText(value: unknown): string {
  return String(value ?? "").trim();
}

function asDate(value: unknown): string {
  return asText(value).slice(0, 10);
}

function fmtMoney(value: number | string | null): string {
  if (value == null) return "-";
  const n = Number(value);
  if (!Number.isFinite(n)) return asText(value);
  return n.toFixed(2);
}

function todayYyyyMmDd(): string {
  return new Date().toISOString().slice(0, 10);
}

function toNumberOrNull(value: string): number | null {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return n;
}

function calculatePreview(baseCostText: string, operationalCostText: string, marginText: string) {
  const base = toNumberOrNull(baseCostText);
  const operational = toNumberOrNull(operationalCostText || "0");
  const margin = toNumberOrNull(marginText || "0");
  if (base == null || operational == null || margin == null) return { landed: null, selling: null };
  const landed = base + operational;
  if (landed <= 0) return { landed: null, selling: null };
  const selling = landed * (1 + margin / 100);
  if (selling <= 0) return { landed: null, selling: null };
  return {
    landed: Math.round(landed * 100) / 100,
    selling: Math.round(selling * 100) / 100,
  };
}

export default function PricingPage() {
  const { company } = useTenant();

  const [rows, setRows] = useState<ActivePricingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectProductsModalOpen, setSelectProductsModalOpen] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogRows, setCatalogRows] = useState<CatalogRow[]>([]);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [selectedSkuMap, setSelectedSkuMap] = useState<Record<string, boolean>>({});

  const [effectiveDate, setEffectiveDate] = useState(todayYyyyMmDd());
  const [expiresAt, setExpiresAt] = useState("");
  const [entryRows, setEntryRows] = useState<EntryRow[]>([]);

  async function loadPricing() {
    setLoading(true);
    try {
      const response = await apiFetch("/api/pricing", company);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Failed to fetch pricing");
      setRows(payload.pricing || []);
    } catch (error: any) {
      setStatusMessage(error.message || "Failed to fetch pricing");
    } finally {
      setLoading(false);
    }
  }

  async function loadCatalogProducts() {
    setCatalogLoading(true);
    try {
      const response = await apiFetch("/api/pricing?catalog=yes", company);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Failed to fetch products");
      setCatalogRows(payload.products || []);
    } catch (error: any) {
      setStatusMessage(error.message || "Failed to fetch products");
    } finally {
      setCatalogLoading(false);
    }
  }

  useEffect(() => {
    if (!company) return;
    loadPricing();
  }, [company]);

  const filteredCatalog = useMemo(() => {
    const q = catalogSearch.toLowerCase();
    if (!q) return catalogRows;
    return catalogRows.filter((row) => `${row.sku} ${row.product_name}`.toLowerCase().includes(q));
  }, [catalogRows, catalogSearch]);

  const allFilteredSelected =
    filteredCatalog.length > 0 && filteredCatalog.every((row) => selectedSkuMap[row.sku]);

  function toggleSelectAll(checked: boolean, rowsToToggle: CatalogRow[]) {
    if (!checked) {
      setSelectedSkuMap({});
      return;
    }
    const map: Record<string, boolean> = {};
    rowsToToggle.forEach((row) => {
      map[row.sku] = true;
    });
    setSelectedSkuMap(map);
  }

  function openCreateModal() {
    setCreateModalOpen(true);
    setEffectiveDate(todayYyyyMmDd());
    setExpiresAt("");
    setEntryRows([]);
    setSelectedSkuMap({});
    setCatalogSearch("");
  }

  function applySelectedProducts() {
    const selected = catalogRows.filter((row) => selectedSkuMap[row.sku]);
    setEntryRows((prev) => {
      const existing = new Set(prev.map((r) => r.sku));
      const next = [...prev];
      selected.forEach((row) => {
        if (existing.has(row.sku)) return;
        next.push({
          product_id: row.product_id,
          product_name: row.product_name,
          sku: row.sku,
          base_cost: "",
          operational_cost: "0",
          margin_percent: "",
        });
      });
      return next;
    });
    setSelectProductsModalOpen(false);
  }

  function updateRow(sku: string, patch: Partial<EntryRow>) {
    setEntryRows((prev) => prev.map((row) => (row.sku === sku ? { ...row, ...patch } : row)));
  }

  async function savePricingRows(addAnother: boolean) {
    if (!effectiveDate) {
      setStatusMessage("Effective Date is required.");
      return;
    }
    if (effectiveDate < todayYyyyMmDd()) {
      setStatusMessage("Effective Date cannot be in the past.");
      return;
    }
    if (entryRows.length === 0) {
      setStatusMessage("Select at least one product.");
      return;
    }
    const invalidBase = entryRows.find((r) => asText(r.base_cost) === "");
    if (invalidBase) {
      setStatusMessage(`Base Cost is required for SKU ${invalidBase.sku}`);
      return;
    }

    setSaving(true);
    setStatusMessage("");
    try {
      const response = await apiFetch("/api/pricing", company, {
        method: "POST",
        body: JSON.stringify({
          rows: entryRows.map((row) => ({
            sku: row.sku,
            base_cost: row.base_cost,
            operational_cost: asText(row.operational_cost) || "0",
            margin_percent: asText(row.margin_percent) || "0",
            effective_date: effectiveDate,
            expires_at: expiresAt || null,
          })),
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Failed to create pricing");

      setStatusMessage("Pricing created successfully.");
      await loadPricing();

      if (addAnother) {
        setEntryRows([]);
        setSelectedSkuMap({});
      } else {
        setCreateModalOpen(false);
      }
    } catch (error: any) {
      setStatusMessage(error.message || "Failed to create pricing");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Product Pricing</h1>
          <p className="text-sm text-gray-500">Multi-product pricing in one form.</p>
        </div>
        <button
          onClick={openCreateModal}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white"
        >
          + Add Pricing Form
        </button>
      </div>

      {statusMessage ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700">
          {statusMessage}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Landed Price</th>
                <th className="px-4 py-3 font-medium">Margin %</th>
                <th className="px-4 py-3 font-medium">Selling Price</th>
                <th className="px-4 py-3 font-medium">Effective Date</th>
                <th className="px-4 py-3 font-medium">Expires At</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-gray-500" colSpan={7}>
                    Loading...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-gray-500" colSpan={7}>
                    No pricing rows found.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-t border-gray-100">
                    <td className="px-4 py-3">{row.sku}</td>
                    <td className="px-4 py-3">{asText(row.source_type || "-")}</td>
                    <td className="px-4 py-3">{fmtMoney(row.landed_price)}</td>
                    <td className="px-4 py-3">{fmtMoney(row.margin_percent)}</td>
                    <td className="px-4 py-3">{fmtMoney(row.unit_price)}</td>
                    <td className="px-4 py-3">{asDate(row.active_from)}</td>
                    <td className="px-4 py-3">{asDate(row.expires_at) || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {createModalOpen ? (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-7xl rounded-xl bg-white p-5 shadow-xl">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Add Pricing</h2>
                <p className="text-xs text-gray-500">Select multiple products and update row-wise pricing.</p>
              </div>
              <button
                onClick={async () => {
                  setSelectProductsModalOpen(true);
                  if (catalogRows.length === 0) await loadCatalogProducts();
                }}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white"
              >
                Select Products
              </button>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
                  Effective Date
                </label>
                <input
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
                  Expires At (optional)
                </label>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-3 py-2 font-medium">Product ID</th>
                    <th className="px-3 py-2 font-medium">Product Name</th>
                    <th className="px-3 py-2 font-medium">SKU</th>
                    <th className="px-3 py-2 font-medium">Base Cost</th>
                    <th className="px-3 py-2 font-medium">Operational Cost</th>
                    <th className="px-3 py-2 font-medium">Margin</th>
                    <th className="px-3 py-2 font-medium">Landed Price</th>
                    <th className="px-3 py-2 font-medium">Selling Price</th>
                  </tr>
                </thead>
                <tbody>
                  {entryRows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-3 py-6 text-center text-gray-500">
                        No products selected.
                      </td>
                    </tr>
                  ) : (
                    entryRows.map((row) => {
                      const calc = calculatePreview(row.base_cost, row.operational_cost, row.margin_percent);
                      return (
                        <tr key={row.sku} className="border-t border-gray-100">
                          <td className="px-3 py-2">{row.product_id}</td>
                          <td className="px-3 py-2">{row.product_name}</td>
                          <td className="px-3 py-2">{row.sku}</td>
                          <td className="px-3 py-2">
                            <input
                              value={row.base_cost}
                              onChange={(e) => updateRow(row.sku, { base_cost: e.target.value })}
                              className="w-28 rounded border border-gray-300 px-2 py-1"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              value={row.operational_cost}
                              onChange={(e) => updateRow(row.sku, { operational_cost: e.target.value })}
                              className="w-28 rounded border border-gray-300 px-2 py-1"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              value={row.margin_percent}
                              onChange={(e) => updateRow(row.sku, { margin_percent: e.target.value })}
                              className="w-24 rounded border border-gray-300 px-2 py-1"
                            />
                          </td>
                          <td className="px-3 py-2 bg-gray-50">{fmtMoney(calc.landed)}</td>
                          <td className="px-3 py-2 bg-gray-50">{fmtMoney(calc.selling)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => savePricingRows(false)}
                disabled={saving}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {saving ? "Saving..." : "Create"}
              </button>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => savePricingRows(true)}
                disabled={saving}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800 disabled:opacity-60"
              >
                Create & Add New
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {selectProductsModalOpen ? (
        <div className="fixed inset-0 z-[100001] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-6xl rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold">Select Products</h3>
            <div className="mt-3 flex items-center justify-between gap-3">
              <input
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                placeholder="Search by SKU or product name"
                className="w-full max-w-md rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="mt-3 max-h-[420px] overflow-auto rounded-lg border border-gray-200">
              <table className="min-w-full text-left text-sm">
                <thead className="sticky top-0 bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={allFilteredSelected}
                        onChange={(e) => toggleSelectAll(e.target.checked, filteredCatalog)}
                      />
                    </th>
                    <th className="px-3 py-2 font-medium">Product ID</th>
                    <th className="px-3 py-2 font-medium">Product Name</th>
                    <th className="px-3 py-2 font-medium">SKU</th>
                    <th className="px-3 py-2 font-medium">Effective Date</th>
                  </tr>
                </thead>
                <tbody>
                  {catalogLoading ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-gray-500">
                        Loading products...
                      </td>
                    </tr>
                  ) : filteredCatalog.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-gray-500">
                        No products found.
                      </td>
                    </tr>
                  ) : (
                    filteredCatalog.map((row) => (
                      <tr key={row.sku} className="border-t border-gray-100">
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={Boolean(selectedSkuMap[row.sku])}
                            onChange={(e) =>
                              setSelectedSkuMap((prev) => ({ ...prev, [row.sku]: e.target.checked }))
                            }
                          />
                        </td>
                        <td className="px-3 py-2">{row.product_id}</td>
                        <td className="px-3 py-2">{row.product_name}</td>
                        <td className="px-3 py-2">{row.sku}</td>
                        <td className="px-3 py-2">{asDate(row.effective_date) || "-"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setSelectProductsModalOpen(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={applySelectedProducts}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white"
              >
                Add Selected
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
