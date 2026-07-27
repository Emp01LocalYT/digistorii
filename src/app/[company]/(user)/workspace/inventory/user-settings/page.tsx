"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { PlusIcon } from "@heroicons/react/24/outline";
import { useTenant } from "@/context/TenantContext";
import { apiFetch } from "@/lib/apiFetch";

type UserOption = {
  id: number;
  name: string;
  email?: string;
  responsibility_name?: string;
  is_active?: boolean;
};

type WarehouseOption = {
  id: number;
  name: string;
};

type LocatorOption = {
  id: number;
  locator_name?: string;
  name?: string;
  warehouse_id?: number;
};

type UserSetting = {
  id?: number;
  user_id: string;
  user_name?: string;
  default_warehouse_id: string;
  default_locator_id: string;
  branch_name: string;
  warehouse_name?: string;
  locator_name?: string;
};

function getInitialForm(): UserSetting {
  return {
    user_id: "",
    default_warehouse_id: "",
    default_locator_id: "",
    branch_name: "",
  };
}

export default function UserSettingsPage() {
  const { company } = useTenant();
  const [items, setItems] = useState<UserSetting[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [locators, setLocators] = useState<LocatorOption[]>([]);
  const [form, setForm] = useState<UserSetting>(getInitialForm());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showForm, setShowForm] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  const filteredLocators = useMemo(() => {
    if (!form.default_warehouse_id) return locators;
    return locators.filter(
      (l) => String(l.warehouse_id || "") === String(form.default_warehouse_id)
    );
  }, [locators, form.default_warehouse_id]);

  const inputClass = (key: string) =>
    `w-full mt-2 border rounded-lg p-3 outline-none focus:ring-2 ${errors[key] ? "border-red-500 focus:ring-red-400" : "focus:ring-indigo-500"}`;

  async function loadOptions() {
    if (!company) return;
    const [usersRes, whRes, locRes] = await Promise.all([
      apiFetch("/api/tenant-users", company),
      apiFetch("/api/warehouses", company),
      apiFetch("/api/locators", company),
    ]);
    const usersData = await usersRes.json();
    const whData = await whRes.json();
    const locData = await locRes.json();
    setUsers(usersData.success ? usersData.data || [] : []);
    setWarehouses(whData.success ? whData.data || [] : []);
    setLocators(locData.success ? locData.data || [] : []);
  }

  async function loadData() {
    if (!company) return;
    try {
      setTableLoading(true);
      const res = await apiFetch("/api/user-settings", company);
      const data = await res.json();
      setItems(data.success ? data.data || [] : []);
    } finally {
      setTableLoading(false);
    }
  }

  useEffect(() => {
    void loadOptions();
    void loadData();
  }, [company]);

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!form.user_id) next.user_id = "User is required";
    if (!form.default_warehouse_id) next.default_warehouse_id = "Warehouse is required";
    if (!form.default_locator_id) next.default_locator_id = "Locator is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit() {
    if (!company) return;
    if (!validate()) return;
    setFormLoading(true);
    try {
      const url = form.id ? `/api/user-settings/${form.id}` : "/api/user-settings";
      const method = form.id ? "PUT" : "POST";
      const res = await apiFetch(url, company, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: Number(form.user_id),
          default_warehouse_id: form.default_warehouse_id
            ? Number(form.default_warehouse_id)
            : null,
          default_locator_id: form.default_locator_id
            ? Number(form.default_locator_id)
            : null,
          branch_name: form.branch_name.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Save failed");
      await loadData();
      setShowForm(false);
      setForm(getInitialForm());
      setErrors({});
    } catch (error: any) {
      setErrors((prev) => ({ ...prev, form: error.message || "Save failed" }));
    } finally {
      setFormLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {formLoading &&
        createPortal(
          <div className="fixed inset-0 z-[99999] bg-black/20 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-white p-8 rounded-xl shadow-2xl flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-700 font-semibold text-lg">Saving Settings...</p>
            </div>
          </div>,
          document.body
        )}

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">{showForm ? "User Settings" : "User Settings List"}</h1>
          <p className="text-sm text-gray-500">Manage team member preferences and system access settings.</p>
        </div>
        {!showForm && (
          <button
            onClick={() => {
              setForm(getInitialForm());
              setErrors({});
              setShowForm(true);
            }}
            className="bg-[var(--color-blue-500)] flex items-center gap-2 text-white px-4 py-2 rounded-lg"
          >
            <PlusIcon className="w-4 h-4" />
            Add Settings
          </button>
        )}
      </div>

      {!showForm && (
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-8">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-indigo-50 text-gray-600 uppercase text-xs">
                <tr className="border-t">
                  <th className="p-4 text-left">User</th>
                  <th className="p-4 text-left">Warehouse</th>
                  <th className="p-4 text-left">Locator</th>
                  <th className="p-4 text-left">Branch</th>
                  <th className="p-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tableLoading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-gray-400 animate-pulse">
                      Loading data...
                    </td>
                  </tr>
                ) : items.length > 0 ? (
                  items.map((row) => (
                    <tr key={row.id} className="border-t hover:bg-blue-50 transition">
                      <td className="p-4">{row.user_name || row.user_id}</td>
                      <td>{row.warehouse_name || "-"}</td>
                      <td>{row.locator_name || "-"}</td>
                      <td>{row.branch_name || "-"}</td>
                      <td className="text-center">
                        <button
                          onClick={() => {
                            setForm({
                              id: row.id,
                              user_id: String(row.user_id),
                              default_warehouse_id: row.default_warehouse_id
                                ? String(row.default_warehouse_id)
                                : "",
                              default_locator_id: row.default_locator_id
                                ? String(row.default_locator_id)
                                : "",
                              branch_name: row.branch_name || "",
                              user_name: row.user_name,
                              warehouse_name: row.warehouse_name,
                              locator_name: row.locator_name,
                            });
                            setErrors({});
                            setShowForm(true);
                          }}
                          className="text-indigo-600"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                      No settings found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          className="bg-white p-6 rounded-xl shadow space-y-6"
        >
          <h2 className="text-lg font-semibold">{form.id ? "Update Settings" : "Create Settings"}</h2>
          {errors.form && <p className="text-red-600 text-sm">{errors.form}</p>}

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-semibold mb-1 block">
                User <span className="text-red-500">*</span>
              </label>
              <select
                value={form.user_id}
                onChange={(e) => setForm({ ...form, user_id: e.target.value })}
                className={inputClass("user_id")}
              >
                <option value="">Select User</option>
                {users.map((u) => (
                  <option key={u.id} value={String(u.id)}>
                    {u.name}
                  </option>
                ))}
              </select>
              {errors.user_id && <p className="text-red-500 text-sm mt-1">{errors.user_id}</p>}
            </div>

            <div>
              <label className="text-sm font-semibold mb-1 block">
                Warehouse <span className="text-red-500">*</span>
              </label>
              <select
                value={form.default_warehouse_id}
                onChange={(e) =>
                  setForm({ ...form, default_warehouse_id: e.target.value, default_locator_id: "" })
                }
                className={inputClass("default_warehouse_id")}
              >
                <option value="">Select Warehouse</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={String(w.id)}>
                    {w.name}
                  </option>
                ))}
              </select>
              {errors.default_warehouse_id && (
                <p className="text-red-500 text-sm mt-1">{errors.default_warehouse_id}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-semibold mb-1 block">
                Locator <span className="text-red-500">*</span>
              </label>
              <select
                value={form.default_locator_id}
                onChange={(e) => setForm({ ...form, default_locator_id: e.target.value })}
                className={inputClass("default_locator_id")}
              >
                <option value="">Select Locator</option>
                {filteredLocators.map((l) => (
                  <option key={l.id} value={String(l.id)}>
                    {l.locator_name || l.name || l.id}
                  </option>
                ))}
              </select>
              {errors.default_locator_id && (
                <p className="text-red-500 text-sm mt-1">{errors.default_locator_id}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-semibold mb-1 block">Branch Name</label>
              <input
                value={form.branch_name}
                onChange={(e) => setForm({ ...form, branch_name: e.target.value })}
                className={inputClass("branch_name")}
              />
            </div>
          </div>

          <div className="ui-form-actions">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setForm(getInitialForm());
                setErrors({});
              }}
              className="ui-btn ui-btn-secondary ui-btn-responsive"
            >
              Cancel
            </button>
            <button className="ui-btn ui-btn-primary ui-btn-responsive">
              {form.id ? "Update" : "Create"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
