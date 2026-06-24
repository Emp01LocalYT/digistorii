"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useTenant } from "@/context/TenantContext";
import { apiFetch } from "@/lib/apiFetch";
import { Country, State, City } from "country-state-city";
import { useConfirm } from "@/hooks/useConfirm";
import { useNotify } from "@/hooks/useNotify";
import { usePagination } from "@/hooks/usePagination";
type LocationTab = "registered" | "bill" | "ship" | "contact";
type Location = {
  id?: number;
  name: string;
  type: "global" | "local";
  inactive_date: string;
  same_as_registered: boolean;
  same_as_bill_to: boolean;
  description: string;
  registered_address_line_1: string;
  registered_address_line_2: string;
  registered_country: string;
  registered_state: string;
  registered_city: string;
  registered_pincode: string;
  bill_address_line_1: string;
  bill_address_line_2: string;
  bill_country: string;
  bill_state: string;
  bill_city: string;
  bill_pincode: string;
  ship_address_line_1: string;
  ship_address_line_2: string;
  ship_country: string;
  ship_state: string;
  ship_city: string;
  ship_pincode: string;
  landline: string;
  mobile: string;
  fax: string;
  email: string;
  contact_person: string;
};
const tabs: { key: LocationTab; label: string }[] = [
  { key: "registered", label: "Registered Address" },
  { key: "bill", label: "Bill To Address" },
  { key: "ship", label: "Ship To Address" },
  { key: "contact", label: "Contact Details" },
];

function getInitialForm(): Location {
  return {
    name: "",
    type: "global",
    inactive_date: "",
    same_as_registered: false,
    same_as_bill_to: false,
    description: "",
    registered_address_line_1: "",
    registered_address_line_2: "",
    registered_country: "",
    registered_state: "",
    registered_city: "",
    registered_pincode: "",
    bill_address_line_1: "",
    bill_address_line_2: "",
    bill_country: "",
    bill_state: "",
    bill_city: "",
    bill_pincode: "",
    ship_address_line_1: "",
    ship_address_line_2: "",
    ship_country: "",
    ship_state: "",
    ship_city: "",
    ship_pincode: "",
    landline: "",
    mobile: "",
    fax: "",
    email: "",
    contact_person: "",
  };
}

export default function LocationMasterPage() {
  const { company } = useTenant();
  const confirm = useConfirm();
  const notify = useNotify();
  const [items, setItems] = useState<Location[]>([]);
  const [form, setForm] = useState<Location>(getInitialForm());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<LocationTab>("registered");

  const inputClass = (key: string) =>
    `w-full mt-2 border rounded-lg p-3 outline-none focus:ring-2 ${errors[key] ? "border-red-500 focus:ring-red-400" : "focus:ring-indigo-500"}`;

  const checkboxClass = "h-4 w-4 text-indigo-600 border-gray-300 rounded";
    const countryOptions = useMemo(()=> Country.getAllCountries(),[]);
  const selectedRegisteredCountry = countryOptions.find((c) => c.name === form.registered_country);
  const registeredStateOptions = selectedRegisteredCountry ? State.getStatesOfCountry(selectedRegisteredCountry.isoCode) : [];
  const selectedRegisteredState = registeredStateOptions.find((s) => s.name === form.registered_state);
  const registeredCityOptions =
    selectedRegisteredCountry && selectedRegisteredState
      ? City.getCitiesOfState(selectedRegisteredCountry.isoCode, selectedRegisteredState.isoCode)
      : [];
  const selectedBillCountry = countryOptions.find((c) => c.name === form.bill_country);
  const billStateOptions = selectedBillCountry ? State.getStatesOfCountry(selectedBillCountry.isoCode) : [];
  const selectedBillState = billStateOptions.find((s) => s.name === form.bill_state);
  const billCityOptions =
    selectedBillCountry && selectedBillState
      ? City.getCitiesOfState(selectedBillCountry.isoCode, selectedBillState.isoCode)
      : [];
  const selectedShipCountry = countryOptions.find((c) => c.name === form.ship_country);
  const shipStateOptions = selectedShipCountry ? State.getStatesOfCountry(selectedShipCountry.isoCode) : [];
  const selectedShipState = shipStateOptions.find((s) => s.name === form.ship_state);
  const shipCityOptions =
    selectedShipCountry && selectedShipState
      ? City.getCitiesOfState(selectedShipCountry.isoCode, selectedShipState.isoCode)
      : [];
  async function loadData() {
    if (!company) return;
    try {
      setTableLoading(true);
      const res = await apiFetch("/api/locations", company);
      const data = await res.json();
      setItems(data.success ? data.data || [] : []);
    } finally {
      setTableLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [company]);

  function copyRegisteredToBillForm(next: Location): Location {
    return {
      ...next,
      bill_address_line_1: next.registered_address_line_1,
      bill_address_line_2: next.registered_address_line_2,
      bill_country: next.registered_country,
      bill_state: next.registered_state,
      bill_city: next.registered_city,
      bill_pincode: next.registered_pincode,
    };
  }

  function copyBillToShipForm(next: Location): Location {
    return {
      ...next,
      ship_address_line_1: next.bill_address_line_1,
      ship_address_line_2: next.bill_address_line_2,
      ship_country: next.bill_country,
      ship_state: next.bill_state,
      ship_city: next.bill_city,
      ship_pincode: next.bill_pincode,
    };
  }

  function syncAddressFlags(next: Location): Location {
    const withBill = next.same_as_registered ? copyRegisteredToBillForm(next) : next;
    return withBill.same_as_bill_to ? copyBillToShipForm(withBill) : withBill;
  }

  function updateForm(recipe: (prev: Location) => Location) {
    setForm((prev) => syncAddressFlags(recipe(prev)));
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "Name is required";
    if (!form.type) next.type = "Type is required";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = "Invalid email";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(mode: "close" | "add") {
    if (!company) return;
    if (!validate()) return;
    setFormLoading(true);
    try {
      const url = form.id ? `/api/locations/${form.id}` : "/api/locations";
      const method = form.id ? "PUT" : "POST";
      const res = await apiFetch(url, company, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          name: form.name.trim(),
          description: form.description.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Save failed");

      await loadData();
      if (mode === "add" && !form.id) {
        setForm(getInitialForm());
        setErrors({});
        setActiveTab("registered");
        return;
      }
      setShowForm(false);
      setForm(getInitialForm());
      setErrors({});
      setActiveTab("registered");
    } catch (error: any) {
      notify(error?.message || "Save  failed", { severity: "warning" });
    } finally {
      setFormLoading(false);
    }
  }

  async function removeItem(id?: number) {
    if (!company || !id) return;
    const ok = await confirm("Delete this location?", {type: "warning", title: "Delete Confirmation"});
    if (!ok) return;
    try {
      const res = await apiFetch(`/api/locations/${id}`, company, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Delete failed");
      await loadData();
      notify("Location deleted successfully");
    } catch (error: any) {
      notify("Failed to delete location" + (error.message ? `: ${error.message}` : ""), { severity: "error" });
    }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter((row) =>
      `${row.name} ${row.type} ${row.registered_city || ""} ${row.bill_city || ""} ${row.ship_city || ""}`
        .toLowerCase()
        .includes(q)
    );
  }, [items, search]);

  const sortedData = useMemo(() => filtered, [filtered]);

  const {
    currentPage,
    itemsPerPage: rowsPerPage,
    setItemsPerPage: setRowsPerPage,
    totalItems,
    totalPages,
    pageNumbers,
    showingFrom,
    showingTo,
    paginatedData,
    goToPage,
    goToPreviousPage,
    goToNextPage,
  } = usePagination({
    data: sortedData,
    initialItemsPerPage: 10,
    resetDeps: [search],
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {formLoading &&
        createPortal(
          <div className="fixed inset-0 z-[99999] bg-black/20 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-white p-8 rounded-xl shadow-2xl flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-700 font-semibold text-lg">Saving Store Location...</p>
            </div>
          </div>,
          document.body
        )}

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{showForm ? "Store Location Master" : "Store Location List"}</h1>
        {!showForm && (
          <button
            onClick={() => {
              setForm(getInitialForm());
              setErrors({});
              setActiveTab("registered");
              setShowForm(true);
            }}
            className="bg-[var(--color-blue-500)] flex items-center gap-2 text-white px-4 py-2 rounded-lg"
          >
            <PlusIcon className="w-4 h-4" />
            Add Store Location
          </button>
        )}
      </div>

      {!showForm && (
        <>
          <div className="ui-table-card">
            <div className="ui-search-section">
              <div className="ui-search-wrapper">
            <MagnifyingGlassIcon className="ui-search-icon" />
            <input
              type="text"
              placeholder="Search..."
              className="ui-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
            </div>
            <div className="ui-table-scroll">
              <table className="ui-table">
                <thead className="ui-table-head">
                  <tr className="ui-table-row">
                    <th className="ui-table-th">Name</th>
                    <th className="ui-table-th">Type</th>
                    <th className="ui-table-th">City</th>
                    <th className="ui-table-th">Inactive Date</th>
                    <th className="ui-table-th-center">Action</th>
                  </tr>
                </thead>
                <tbody >
                  {tableLoading ? (
                    <tr>
                      <td colSpan={5} className="ui-loading-row">
                        Loading data...
                      </td>
                    </tr>
                  ) : paginatedData.length > 0 ? (
                    paginatedData.map((row) => (
                      <tr key={row.id} className="ui-table-row">
                        <td className="ui-table-td">{row.name}</td>
                        <td className="ui-table-td">{row.type}</td>
                        <td className="ui-table-td">{row.registered_city || row.bill_city || row.ship_city || "-"}</td>
                        <td className="ui-table-td">{row.inactive_date || "-"}</td>
                        <td className="ui-table-td-center">
                          <div className="ui-table-actions">
                            <button
                              onClick={() => {
                                setForm(syncAddressFlags({ ...getInitialForm(), ...row }));
                                setErrors({});
                                setActiveTab("registered");
                                setShowForm(true);
                              }}
                              className="text-indigo-600"
                            >
                              <PencilSquareIcon className="w-5 h-5" />
                            </button>
                            <button onClick={() => removeItem(row.id)} className="text-red-600">
                              <TrashIcon className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="ui-empty-row ui-table-td-center">
                        No records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="ui-pagination-wrapper">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="ui-pagination-info">
                  Showing <span className="font-medium">{showingFrom}</span> to{" "}
                  <span className="font-medium">{showingTo}</span> of{" "}
                  <span className="font-medium">{totalItems}</span> results
                </p>
                <div className="ui-table-actions">
                  <label htmlFor="location-rows-per-page" className="text-sm text-gray-600">
                    Rows per page
                  </label>
                  <select
                    id="location-rows-per-page"
                    value={rowsPerPage}
                    onChange={(e) => setRowsPerPage(Number(e.target.value))}
                    className="ui-pagination-select"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="flex flex-1 justify-between sm:hidden">
                  <button
                    type="button"
                    onClick={goToPreviousPage}
                    disabled={currentPage === 1}
                    className="ui-pagination-icon-btn rounded-md"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={goToNextPage}
                    disabled={currentPage === totalPages}
                    className="ui-pagination-icon-btn rounded-md ml-3"
                  >
                    Next
                  </button>
                </div>

                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-end">
                  <nav aria-label="Pagination" className="ui-pagination-nav">
                    <button
                      type="button"
                      onClick={goToPreviousPage}
                      disabled={currentPage === 1}
                      className="ui-pagination-icon-btn rounded-l-md"
                    >
                      <span className="sr-only">Previous</span>
                      <ChevronLeftIcon className="h-5 w-5" />
                    </button>

                    {pageNumbers.map((page, idx) =>
                      page === "..." ? (
                        <span
                          key={`ellipsis-${idx}`}
                          className="ui-pagination-btn ui-pagination-btn-inactive"
                        >
                          ...
                        </span>
                      ) : (
                        <button
                          key={`page-${page}`}
                          type="button"
                          onClick={() => goToPage(page)}
                          aria-current={currentPage === page ? "page" : undefined}
                          className={`ui-pagination-btn ${
                            currentPage === page
                              ? "ui-pagination-btn-active" : "ui-pagination-btn-inactive"
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
                      className="ui-pagination-icon-btn rounded-r-md"
                    >
                      <span className="sr-only">Next</span>
                      <ChevronRightIcon className="h-5 w-5" />
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {showForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit("close");
          }}
          className="bg-white p-6 rounded-xl shadow space-y-6"
        >
          <h2 className="text-lg font-semibold">{form.id ? "Update Store Location" : "Create  Store Location"}</h2>

          <div className="space-y-4">
            <h3 className="text-md font-semibold text-gray-700">Basic Info</h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <label className="text-sm font-semibold mb-1 block">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={inputClass("name")}
                />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
              </div>
              <div>
                <label className="text-sm font-semibold mb-1 block">
                  Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as Location["type"] })}
                  className={inputClass("type")}
                >
                  <option value="global">Global</option>
                  <option value="local">Local</option>
                </select>
                {errors.type && <p className="text-red-500 text-sm mt-1">{errors.type}</p>}
              </div>
              <div>
                <label className="text-sm font-semibold mb-1 block">Inactive Date</label>
                <input
                  type="date"
                  value={form.inactive_date}
                  onChange={(e) => setForm({ ...form, inactive_date: e.target.value })}
                  className={inputClass("inactive_date")}
                />
              </div>
              <div className="md:col-span-3">
                <label className="text-sm font-semibold mb-1 block">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className={inputClass("description")}
                  rows={3}
                />
              </div>
            </div>
          </div>
          <div className="border-t border-gray-100 pt-4">
            <div className="flex flex-wrap gap-2">{tabs.map((tab) => 
              <button key={tab.key} type="button" 
              onClick={() => setActiveTab(tab.key)} 
              className={`px-4 py-2 rounded-lg text-sm font-medium border ${activeTab === tab.key ? "bg-[var(--color-blue-500)] text-white border-[var(--color-blue-600)]" : "bg-white text-gray-700 border-gray-200"}`}>{tab.label}</button>)}
              </div>
{activeTab === "registered" && (
            <div className="grid md:grid-cols-4 gap-6 mt-6">
              <div className="md:col-span-2">
                <label className="text-sm font-semibold mb-1 block">Address Line 1</label>
                <input
                  value={form.registered_address_line_1}
                  onChange={(e) => updateForm((prev) => ({ ...prev, registered_address_line_1: e.target.value }))}
                  className={inputClass("registered_address_line_1")}
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-semibold mb-1 block">Address Line 2</label>
                <input
                  value={form.registered_address_line_2}
                  onChange={(e) => updateForm((prev) => ({ ...prev, registered_address_line_2: e.target.value }))}
                  className={inputClass("registered_address_line_2")}
                />
              </div>
              <div>
                <label className="text-sm font-semibold mb-1 block">Country</label>
                      <select
        value={form.registered_country}
        onChange={(e) =>
          updateForm((prev) => ({
            ...prev,
            registered_country: e.target.value,
            registered_state: "",
            registered_city: "",
          }))
        }
        className={inputClass("registered_country")}
      >
        <option value="">Select Country</option>
        {countryOptions.map((country) => (
          <option key={country.isoCode} value={country.name}>
            {country.name}
          </option>
        ))}
      </select>
              </div>
              <div>
                <label className="text-sm font-semibold mb-1 block">State</label>
                      <select
        value={form.registered_state}
        onChange={(e) =>
          updateForm((prev) => ({
            ...prev,
            registered_state: e.target.value,
            registered_city: "",
          }))
        }
        className={inputClass("registered_state")}
      >
        <option value="">Select State</option>
        {registeredStateOptions.map((state) => (
          <option key={state.isoCode} value={state.name}>
            {state.name}
          </option>
        ))}
      </select>
              </div>
              <div>
                <label className="text-sm font-semibold mb-1 block">City</label>
                      <select
        value={form.registered_city}
        onChange={(e) =>
          updateForm((prev) => ({ ...prev, registered_city: e.target.value }))
        }
        className={inputClass("registered_city")}
      >
        <option value="">Select City</option>
        {registeredCityOptions.map((city) => (
          <option
            key={`${city.name}-${city.latitude}-${city.longitude}`}
            value={city.name}
          >
            {city.name}
          </option>
        ))}
      </select>
              </div>
              <div>
                <label className="text-sm font-semibold mb-1 block">Pincode</label>
                <input
                  value={form.registered_pincode}
                  onChange={(e) => updateForm((prev) => ({ ...prev, registered_pincode: e.target.value }))}
                  className={inputClass("registered_pincode")}
                />
              </div>
            </div>
)}
{activeTab === "bill" && (
            <div className="grid md:grid-cols-4 gap-6 mt-6">
              <div className="md:col-span-4">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={form.same_as_registered}
                    onChange={(e) => updateForm((prev) => ({ ...prev, same_as_registered: e.target.checked }))}
                    className={checkboxClass}
                  />
                  Same As Registered Address
                </label>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-semibold mb-1 block">Address Line 1</label>
                <input
                  value={form.bill_address_line_1}
                  onChange={(e) => updateForm((prev) => ({ ...prev, bill_address_line_1: e.target.value }))}
                  className={inputClass("bill_address_line_1")}
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-semibold mb-1 block">Address Line 2</label>
                <input
                  value={form.bill_address_line_2}
                  onChange={(e) => updateForm((prev) => ({ ...prev, bill_address_line_2: e.target.value }))}
                  className={inputClass("bill_address_line_2")}
                />
              </div>
              <div>
                <label className="text-sm font-semibold mb-1 block">Country</label>
                <select
                  value={form.bill_country}
                  onChange={(e) =>
                    updateForm((prev) => ({
                      ...prev,
                      bill_country: e.target.value,
                      bill_state: "",
                      bill_city: "",
                    }))
                  }
                  className={inputClass("bill_country")}
                >
                  <option value="">Select Country</option>
                  {countryOptions.map((country) => (
                    <option key={country.isoCode} value={country.name}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold mb-1 block">State</label>
                <select
                  value={form.bill_state}
                  onChange={(e) =>
                    updateForm((prev) => ({
                      ...prev,
                      bill_state: e.target.value,
                      bill_city: "",
                    }))
                  }
                  className={inputClass("bill_state")}
                >
                  <option value="">Select State</option>
                  {billStateOptions.map((state) => (
                    <option key={state.isoCode} value={state.name}>
                      {state.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold mb-1 block">City</label>
                <select
                  value={form.bill_city}
                  onChange={(e) => updateForm((prev) => ({ ...prev, bill_city: e.target.value }))}
                  className={inputClass("bill_city")}
                >
                  <option value="">Select City</option>
                  {billCityOptions.map((city) => (
                    <option
                      key={`${city.name}-${city.latitude}-${city.longitude}`}
                      value={city.name}
                    >
                      {city.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold mb-1 block">Pincode</label>
                <input
                  value={form.bill_pincode}
                  onChange={(e) => updateForm((prev) => ({ ...prev, bill_pincode: e.target.value }))}
                  className={inputClass("bill_pincode")}
                />
              </div>
            </div>
)}
{activeTab === "ship" && (
            <div className="grid md:grid-cols-4 gap-6 mt-6">
              <div className="md:col-span-4">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={form.same_as_bill_to}
                    onChange={(e) => updateForm((prev) => ({ ...prev, same_as_bill_to: e.target.checked }))}
                    className={checkboxClass}
                  />
                  Same As Bill To Address
                </label>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-semibold mb-1 block">Address Line 1</label>
                <input
                  value={form.ship_address_line_1}
                  onChange={(e) => updateForm((prev) => ({ ...prev, ship_address_line_1: e.target.value }))}
                  className={inputClass("ship_address_line_1")}
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-semibold mb-1 block">Address Line 2</label>
                <input
                  value={form.ship_address_line_2}
                  onChange={(e) => updateForm((prev) => ({ ...prev, ship_address_line_2: e.target.value }))}
                  className={inputClass("ship_address_line_2")}
                />
              </div>
              <div>
                <label className="text-sm font-semibold mb-1 block">Country</label>
                <select
                  value={form.ship_country}
                  onChange={(e) =>
                    updateForm((prev) => ({
                      ...prev,
                      ship_country: e.target.value,
                      ship_state: "",
                      ship_city: "",
                    }))
                  }
                  className={inputClass("ship_country")}
                >
                  <option value="">Select Country</option>
                  {countryOptions.map((country) => (
                    <option key={country.isoCode} value={country.name}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold mb-1 block">State</label>
                <select
                  value={form.ship_state}
                  onChange={(e) =>
                    updateForm((prev) => ({
                      ...prev,
                      ship_state: e.target.value,
                      ship_city: "",
                    }))
                  }
                  className={inputClass("ship_state")}
                >
                  <option value="">Select State</option>
                  {shipStateOptions.map((state) => (
                    <option key={state.isoCode} value={state.name}>
                      {state.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold mb-1 block">City</label>
                <select
                  value={form.ship_city}
                  onChange={(e) => updateForm((prev) => ({ ...prev, ship_city: e.target.value }))}
                  className={inputClass("ship_city")}
                >
                  <option value="">Select City</option>
                  {shipCityOptions.map((city) => (
                    <option
                      key={`${city.name}-${city.latitude}-${city.longitude}`}
                      value={city.name}
                    >
                      {city.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold mb-1 block">Pincode</label>
                <input
                  value={form.ship_pincode}
                  onChange={(e) => updateForm((prev) => ({ ...prev, ship_pincode: e.target.value }))}
                  className={inputClass("ship_pincode")}
                />
              </div>
            </div>
)}
{activeTab === "contact" && ( <div className="grid md:grid-cols-5 gap-6 mt-6">
              <div>
                <label className="text-sm font-semibold mb-1 block">Landline</label>
                <input
                  value={form.landline || ""}
                  onChange={(e) => updateForm((prev) => ({ ...prev, landline: e.target.value ?? "" }))}
                  className={inputClass("landline")}
                />
              </div>
              <div>
                <label className="text-sm font-semibold mb-1 block">Mobile</label>
                <input
                  value={form.mobile || ""}
                  onChange={(e) => updateForm((prev) => ({ ...prev, mobile: e.target.value ?? "" }))}
                  className={inputClass("mobile")}
                />
              </div>
              <div>
                <label className="text-sm font-semibold mb-1 block">Fax</label>
                <input
                  value={form.fax || ""}
                  onChange={(e) => updateForm((prev) => ({ ...prev, fax: e.target.value ?? ""}))}
                  className={inputClass("fax")}
                />
              </div>
              <div>
                <label className="text-sm font-semibold mb-1 block">Email</label>
                <input
                  type="email"
                  value={form.email || ""}
                  onChange={(e) => updateForm((prev) => ({ ...prev, email: e.target.value ?? "" }))}
                  className={inputClass("email")}
                />
                {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
              </div>
              <div>
                <label className="text-sm font-semibold mb-1 block">Contact Person</label>
                <input
                  value={form.contact_person}
                  onChange={(e) => updateForm((prev) => ({ ...prev, contact_person: e.target.value }))}
                  className={inputClass("contact_person")}
                />
              </div>
            </div>
          ) }
          </div>


          <div className="ui-form-actions">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setForm(getInitialForm());
                setErrors({});
                setActiveTab("registered");
              }}
              className="ui-btn ui-btn-secondary ui-btn-responsive"
            >
              Cancel
            </button>

            <div className="ui-btn-group">
              {!form.id && (
                <button
                  type="button"
                  onClick={() => void submit("add")}
                  className="ui-btn ui-btn-secondary ui-btn-responsive"
                >
                  Create & Add Another
                </button>
              )}

              <button className="ui-btn ui-btn-primary ui-btn-responsive">
                {form.id ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}






