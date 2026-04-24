"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { MagnifyingGlassIcon, PencilSquareIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useTenant } from "@/context/TenantContext";
import { apiFetch } from "@/lib/apiFetch";

type Currency = {
  id: number;
  currency_code: string;
  currency_name: string;
};

type CurrencyForm = {
  id: number | null;
  currency_code: string;
  currency_name: string;
};

const pageSize = 10;

function initialForm(): CurrencyForm {
  return { id: null, currency_code: "", currency_name: "" };
}

export default function CurrencyMasterPage() {
  const { company } = useTenant();
  const [items, setItems] = useState<Currency[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [tableLoading, setTableLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showEdit, setShowEdit] = useState(false);
  const [form, setForm] = useState<CurrencyForm>(initialForm());

  const inputClass = (key: string) =>
    `w-full mt-2 border rounded-lg p-3 outline-none focus:ring-2 ${
      errors[key] ? "border-red-500 focus:ring-red-400" : "focus:ring-indigo-500"
    }`;

  async function loadData() {
    if (!company) return;
    try {
      setTableLoading(true);
      const res = await apiFetch("/api/currencies", company);
      const data = await res.json();
      setItems(data.success ? data.data || [] : []);
    } finally {
      setTableLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [company]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter((row) => `${row.currency_code} ${row.currency_name}`.toLowerCase().includes(q));
  }, [items, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setPage(1);
  }, [search]);

  function openEdit(row: Currency) {
    setForm({
      id: row.id,
      currency_code: row.currency_code,
      currency_name: row.currency_name,
    });
    setErrors({});
    setShowEdit(true);
  }

  function closeEdit() {
    setShowEdit(false);
    setForm(initialForm());
    setErrors({});
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!form.currency_name.trim()) next.currency_name = "Currency name is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit() {
    if (!company || !form.id) return;
    if (!validate()) return;
    setSaving(true);
    try {
      const res = await apiFetch(`/api/currencies/${form.id}`, company, {
        method: "PUT",
        body: JSON.stringify({ currency_name: form.currency_name.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Update failed");

      await loadData();
      closeEdit();
    } catch (error: any) {
      alert(error.message || "Update failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {saving &&
        createPortal(
          <div className="fixed inset-0 z-[99999] bg-black/20 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-white p-8 rounded-xl shadow-2xl flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-700 font-semibold text-lg">Saving Currency...</p>
            </div>
          </div>,
          document.body
        )}

      {showEdit &&
        createPortal(
          <div className="fixed inset-0 z-[99998] bg-black/30 backdrop-blur-sm flex items-center justify-center px-4">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Edit Currency</h2>
                <button onClick={closeEdit} className="text-gray-500 hover:text-gray-700">
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void submit();
                }}
                className="space-y-5"
              >
                <div>
                  <label className="text-sm font-semibold mb-1 block">Currency Code</label>
                  <input
                    value={form.currency_code}
                    readOnly
                    className="w-full mt-2 border rounded-lg p-3 bg-gray-100 text-gray-600"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold mb-1 block">
                    Currency Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={form.currency_name}
                    onChange={(e) => setForm({ ...form, currency_name: e.target.value })}
                    className={inputClass("currency_name")}
                  />
                  {errors.currency_name && <p className="text-red-500 text-sm mt-1">{errors.currency_name}</p>}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button type="button" onClick={closeEdit} className="bg-gray-300 px-5 py-2 rounded-lg">
                    Cancel
                  </button>
                  <button className="bg-[var(--color-blue-500)] text-white px-5 py-2 rounded-lg">Update</button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Currency Master</h1>
      </div>

      <div className="relative max-w-sm">
        <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" />
        <input
          type="text"
          placeholder="Search by code or name..."
          className="w-full pl-10 pr-4 py-2 border rounded-lg"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-8">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-indigo-50 text-gray-600 uppercase text-xs">
              <tr className="border-t hover:bg-blue-50 transition">
                <th className="p-4 text-left">ID</th>
                <th className="p-4 text-left">Code</th>
                <th className="p-4 text-left">Currency Name</th>
                <th className="p-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tableLoading ? (
                <tr>
                  <td colSpan={4} className="text-center py-10 text-gray-400 animate-pulse">
                    Loading data...
                  </td>
                </tr>
              ) : paged.length > 0 ? (
                paged.map((row) => (
                  <tr key={row.id} className="border-t hover:bg-blue-50 transition">
                    <td className="p-4">{row.id}</td>
                    <td>{row.currency_code}</td>
                    <td>{row.currency_name}</td>
                    <td className="text-center">
                      <button onClick={() => openEdit(row)} className="text-indigo-600">
                        <PencilSquareIcon className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-gray-500">
                    No records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Page {currentPage} of {totalPages}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            className="px-3 py-1 border rounded-lg text-sm"
            disabled={currentPage === 1}
          >
            Prev
          </button>
          <button
            type="button"
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            className="px-3 py-1 border rounded-lg text-sm"
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
