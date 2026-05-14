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
type LocationTab = "address" | "contact" | "shipping";
type Location = {
  id?: number;
  name: string;
  type: "global" | "local";
  inactive_date: string;
  same_as_ship_to: boolean;
  description: string;
  number: string;
  building: string;
  street: string;
  locality: string;
  country: string;
  state: string;
  city: string;
  pincode: string;
  landline: string;
  mobile: string;
  fax: string;
  email: string;
  contact_person: string;
  ship_to_location: string;
  ship_to_site: boolean;
  receiving_site: boolean;
  office_site: boolean;
  bill_to_site: boolean;
  internal_site: boolean;
};
const tabs: { key: LocationTab; label: string }[] = [
  {key: "address" , label:"Address"},
  {key: "contact" ,label:"Contact Details"},
  {key: "shipping" ,label:"Shipping"},
]
function getInitialForm(): Location {
  return {
    name: "",
    type: "global",
    inactive_date: "",
    same_as_ship_to: false,
    description: "",
    number: "",
    building: "",
    street: "",
    locality: "",
    country: "",
    state: "",
    city: "",
    pincode: "",
    landline: "",
    mobile: "",
    fax: "",
    email: "",
    contact_person: "",
    ship_to_location: "",
    ship_to_site: false,
    receiving_site: false,
    office_site: false,
    bill_to_site: false,
    internal_site: false,
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
    const [activeTab, setActiveTab] = useState<LocationTab>("address");

  const inputClass = (key: string) =>
    `w-full mt-2 border rounded-lg p-3 outline-none focus:ring-2 ${errors[key] ? "border-red-500 focus:ring-red-400" : "focus:ring-indigo-500"}`;

  const checkboxClass = "h-4 w-4 text-indigo-600 border-gray-300 rounded";
    const countryOptions = useMemo(()=> Country.getAllCountries(),[]);
  const selectedCountry = countryOptions.find((c) => c.name === form.country);
  const stateOptions = selectedCountry ? State.getStatesOfCountry(selectedCountry.isoCode) : [];
  const selectedState = stateOptions.find((s) => s.name === form.state);
  const cityOptions =
    selectedCountry && selectedState
      ? City.getCitiesOfState(selectedCountry.isoCode, selectedState.isoCode)
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
        return;
      }
      setShowForm(false);
      setForm(getInitialForm());
      setErrors({});
      setActiveTab("address");
    } catch (error: any) {
      alert(error.message || "Save failed");
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
    return items.filter((row) => `${row.name} ${row.type} ${row.city || ""}`.toLowerCase().includes(q));
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
              <p className="text-gray-700 font-semibold text-lg">Saving Location...</p>
            </div>
          </div>,
          document.body
        )}

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{showForm ? "Location Master" : "Location List"}</h1>
        {!showForm && (
          <button
            onClick={() => {
              setForm(getInitialForm());
              setErrors({});
              setActiveTab("address");
              setShowForm(true);
            }}
            className="bg-[var(--color-blue-500)] flex items-center gap-2 text-white px-4 py-2 rounded-lg"
          >
            <PlusIcon className="w-4 h-4" />
            Add Location
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
                        <td className="ui-table-td">{row.city || "-"}</td>
                        <td className="ui-table-td">{row.inactive_date || "-"}</td>
                        <td className="ui-table-td-center">
                          <div className="ui-table-actions">
                            <button
                              onClick={() => {
                                setForm({ ...getInitialForm(), ...row });
                                setErrors({});
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
          <h2 className="text-lg font-semibold">{form.id ? "Update Location" : "Create Location"}</h2>

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
{activeTab === "address" && (
            <div className="grid md:grid-cols-4 gap-6 mt-6">
              <div>
                <label className="text-sm font-semibold mb-1 block">Number</label>
                <input
                  value={form.number}
                  onChange={(e) => setForm({ ...form, number: e.target.value })}
                  className={inputClass("number")}
                />
              </div>
              <div>
                <label className="text-sm font-semibold mb-1 block">Building</label>
                <input
                  value={form.building}
                  onChange={(e) => setForm({ ...form, building: e.target.value })}
                  className={inputClass("building")}
                />
              </div>
              <div>
                <label className="text-sm font-semibold mb-1 block">Street</label>
                <input
                  value={form.street}
                  onChange={(e) => setForm({ ...form, street: e.target.value })}
                  className={inputClass("street")}
                />
              </div>
              <div>
                <label className="text-sm font-semibold mb-1 block">Locality</label>
                <input
                  value={form.locality}
                  onChange={(e) => setForm({ ...form, locality: e.target.value })}
                  className={inputClass("locality")}
                />
              </div>
              <div>
                <label className="text-sm font-semibold mb-1 block">Country</label>
                      <select
        value={form.country}
        onChange={(e) =>
          setForm({ ...form, country: e.target.value, state: "", city: "" })
        }
        className={inputClass("country")}
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
        value={form.state}
        onChange={(e) =>
          setForm({ ...form, state: e.target.value, city: "" })
        }
        className={inputClass("state")}
      >
        <option value="">Select State</option>
        {stateOptions.map((state) => (
          <option key={state.isoCode} value={state.name}>
            {state.name}
          </option>
        ))}
      </select>
              </div>
              <div>
                <label className="text-sm font-semibold mb-1 block">City</label>
                      <select
        value={form.city}
        onChange={(e) =>
          setForm({ ...form, city: e.target.value })
        }
        className={inputClass("city")}
      >
        <option value="">Select City</option>
        {cityOptions.map((city) => (
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
                  value={form.pincode}
                  onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                  className={inputClass("pincode")}
                />
              </div>
            </div>
)}
{activeTab === "contact" && ( <div className="grid md:grid-cols-4 gap-6 mt-6">
              <div>
                <label className="text-sm font-semibold mb-1 block">Landline</label>
                <input
                  value={form.landline}
                  onChange={(e) => setForm({ ...form, landline: e.target.value })}
                  className={inputClass("landline")}
                />
              </div>
              <div>
                <label className="text-sm font-semibold mb-1 block">Mobile</label>
                <input
                  value={form.mobile}
                  onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                  className={inputClass("mobile")}
                />
              </div>
              <div>
                <label className="text-sm font-semibold mb-1 block">Fax</label>
                <input
                  value={form.fax}
                  onChange={(e) => setForm({ ...form, fax: e.target.value })}
                  className={inputClass("fax")}
                />
              </div>
              <div>
                <label className="text-sm font-semibold mb-1 block">Email</label>
                <input
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={inputClass("email")}
                />
                {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
              </div>
            </div>
          ) }
</div>
{activeTab === "shipping" && (
   <div className="grid md:grid-cols-3 gap-6">
              <div>
                <label className="text-sm font-semibold mb-1 block">Contact Person</label>
                <input
                  value={form.contact_person}
                  onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
                  className={inputClass("contact_person")}
                />
              </div>
              <div>
                <label className="text-sm font-semibold mb-1 block">Ship To Location</label>
                <input
                  value={form.ship_to_location}
                  onChange={(e) => setForm({ ...form, ship_to_location: e.target.value })}
                  className={inputClass("ship_to_location")}
                />
              </div>
              <div className="flex items-center gap-3 mt-8">
                <input
                  type="checkbox"
                  checked={form.same_as_ship_to}
                  onChange={(e) => setForm({ ...form, same_as_ship_to: e.target.checked })}
                  className={checkboxClass}
                />
                <label className="text-sm font-semibold">Same as Ship To</label>
              </div>
                         
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={form.ship_to_site}
                  onChange={(e) => setForm({ ...form, ship_to_site: e.target.checked })}
                  className={checkboxClass}
                />
                Ship To Site
              </label>
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={form.receiving_site}
                  onChange={(e) => setForm({ ...form, receiving_site: e.target.checked })}
                  className={checkboxClass}
                />
                Receiving Site
              </label>
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={form.office_site}
                  onChange={(e) => setForm({ ...form, office_site: e.target.checked })}
                  className={checkboxClass}
                />
                Office Site
              </label>
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={form.bill_to_site}
                  onChange={(e) => setForm({ ...form, bill_to_site: e.target.checked })}
                  className={checkboxClass}
                />
                Bill To Site
              </label>
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={form.internal_site}
                  onChange={(e) => setForm({ ...form, internal_site: e.target.checked })}
                  className={checkboxClass}
                />
                Internal Site
              </label>
          
            </div>
)}


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






