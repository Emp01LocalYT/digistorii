"use client";

import { useEffect, useState } from "react";
import { useTenant } from "@/context/TenantContext";
import { apiFetch } from "@/lib/apiFetch";

type Responsibility = {
  id?: number;
  responsibility_name: string;
  dashboard_access: boolean;
  purchase_access: boolean;
  inventory_access: boolean;
  sales_access: boolean;
  sales_billing_access: boolean;
  reports_access: boolean;
  settings_access: boolean;
  is_system?: boolean;
};

const accessFields: Array<{ key: keyof Responsibility; label: string }> = [
  { key: "dashboard_access", label: "Dashboard" },
  { key: "purchase_access", label: "Purchase" },
  { key: "inventory_access", label: "Inventory" },
  { key: "sales_access", label: "Sales" },
  { key: "sales_billing_access", label: "Sales Billing" },
  { key: "reports_access", label: "Reports" },
  { key: "settings_access", label: "Settings" },
];

function getDefaultForm(): Responsibility {
  return {
    responsibility_name: "",
    dashboard_access: true,
    purchase_access: false,
    inventory_access: false,
    sales_access: false,
    sales_billing_access: false,
    reports_access: false,
    settings_access: false,
    is_system: false,
  };
}

export default function UserResponsibilitiesPage() {
  const { company } = useTenant();
  const [items, setItems] = useState<Responsibility[]>([]);
  const [form, setForm] = useState<Responsibility>(getDefaultForm());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadData() {
    if (!company) return;
    try {
      setLoading(true);
      setError("");
      const res = await apiFetch("/api/user-responsibilities", company);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to load responsibilities");
      }
      setItems(Array.isArray(data.data) ? data.data : []);
    } catch (err: any) {
      setError(err.message || "Failed to load responsibilities");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [company]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!company) return;
    if (!form.responsibility_name.trim()) {
      setError("Responsibility name is required");
      return;
    }

    try {
      setSaving(true);
      setError("");
      const url = form.id ? `/api/user-responsibilities/${form.id}` : "/api/user-responsibilities";
      const method = form.id ? "PUT" : "POST";
      const res = await apiFetch(url, company, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          responsibility_name: form.responsibility_name.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Unable to save responsibility");
      }
      setForm(getDefaultForm());
      await loadData();
    } catch (err: any) {
      setError(err.message || "Unable to save responsibility");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">User Responsibilities</h1>
        <p className="text-sm text-gray-600">
          Create or update responsibility-based access profiles for this company.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[380px,1fr]">
        <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">
              Responsibility Name
            </label>
            <input
              value={form.responsibility_name}
              onChange={(e) => setForm((prev) => ({ ...prev, responsibility_name: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid gap-3">
            {accessFields.map((field) => (
              <label key={String(field.key)} className="inline-flex items-center gap-3 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={Boolean(form[field.key])}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, [field.key]: e.target.checked }))
                  }
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600"
                />
                {field.label}
              </label>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? "Saving..." : form.id ? "Update" : "Create"}
            </button>
            <button
              type="button"
              onClick={() => setForm(getDefaultForm())}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700"
            >
              Reset
            </button>
          </div>
        </form>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          {loading ? (
            <div className="text-sm text-gray-500">Loading responsibilities...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-600">
                    <th className="px-3 py-2 font-semibold">Responsibility Name</th>
                    {accessFields.map((field) => (
                      <th key={field.label} className="px-3 py-2 font-semibold">
                        {field.label}
                      </th>
                    ))}
                    <th className="px-3 py-2 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-gray-100">
                      <td className="px-3 py-2 font-medium text-gray-900">{item.responsibility_name}</td>
                      {accessFields.map((field) => (
                        <td key={`${item.id}-${field.label}`} className="px-3 py-2 text-gray-600">
                          {item[field.key] ? "Yes" : "No"}
                        </td>
                      ))}
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => setForm(item)}
                          className="text-sm font-semibold text-blue-600"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!items.length && (
                    <tr>
                      <td colSpan={accessFields.length + 2} className="px-3 py-6 text-center text-gray-500">
                        No responsibilities found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
