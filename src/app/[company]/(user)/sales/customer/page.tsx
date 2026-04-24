"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeftIcon, ChevronRightIcon,  MagnifyingGlassIcon, PencilSquareIcon, PlusIcon } from "@heroicons/react/24/outline";
import { Country, State, City } from "country-state-city";
import { useTenant } from "@/context/TenantContext";
import { apiFetch } from "@/lib/apiFetch";
import { usePagination } from "@/hooks/usePagination";

type Address = {
  id?: number;
  customer_id?: number;
  address_line1: string;
  address_line2: string;
  address_line3: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  is_default: boolean;
};

type Cust = {
  id?: number;
  name: string;
  phone: string;
  email: string;
  address: Address;
  created_at?: string;
};

function getInitialCust(): Cust {
  return {
    name: "",
    phone: "",
    email: "",
    address: {
      address_line1: "",
      address_line2: "",
      address_line3: "",
      city: "",
      state: "",
      pincode: "",
      country: "",
      is_default: true,
    },
  };
}

function normalizeCust(row: any): Cust {
  return {
    id: Number(row?.id) || undefined,
    name: String(row?.name || ""),
    phone: String(row?.phone || ""),
    email: String(row?.email || ""),
    created_at: row?.created_at,
    address: {
      id: row?.address_id !== undefined ? Number(row.address_id) : undefined,
      customer_id: Number(row?.id) || undefined,
      address_line1: String(row?.address_line1 || ""),
      address_line2: String(row?.address_line2 || ""),
      address_line3: String(row?.address_line3 || ""),
      city: String(row?.city || ""),
      state: String(row?.state || ""),
      pincode: String(row?.pincode || ""),
      country: String(row?.country || ""),
      is_default: row?.is_default === true,
    },
  };
}

export default function CustPage() {
  const { company } = useTenant();
  const [custs, setCusts] = useState<Cust[]>([]);
  const [cust, setCust] = useState<Cust>(getInitialCust());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formLoading, setFormLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    if (!company) return;
    let active = true;
    const loadData = async () => {
      try {
        setTableLoading(true);
        const custRes = await apiFetch("/api/customers", company);
        const custData = await custRes.json();

        if (!active) return;
        setCusts(custData.success ? (custData.data || []).map(normalizeCust) : []);
      } catch {
        if (!active) return;
        setCusts([]);
      } finally {
        if (active) setTableLoading(false);
      }
    };
    loadData();
    return () => {
      active = false;
    };
  }, [company]);

  const loadCusts = async () => {
    if (!company) return;
    const res = await apiFetch("/api/customers", company);
    const data = await res.json();
    setCusts(data.success ? (data.data || []).map(normalizeCust) : []);
  };

const validate = () => {
  const next: Record<string, string> = {};

  if (!cust.name.trim()) {
    next.name = "Name is required";
  }

  const phone = cust.phone.trim();

  if (!phone) {
    next.phone = "Phone is required";
  } else if (!/^\d+$/.test(phone)) {
    next.phone = "Phone must contain only numbers";
  } else if (phone.length < 10) {
    next.phone = "Phone number must be at least 10 digits";
  }

  if (cust.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cust.email)) {
    next.email = "Invalid email";
  }

  setErrors(next);
  return Object.keys(next).length === 0;
};

  const saveCustomer = async (keepOpen = false) => {
    if (!validate()) return;
    setFormLoading(true);
    try {
      const payload = {
        name: cust.name,
        phone: cust.phone,
        email: cust.email || null,
        address_line1: cust.address.address_line1,
        address_line2: cust.address.address_line2,
        address_line3: cust.address.address_line3,
        city: cust.address.city,
        state: cust.address.state,
        pincode: cust.address.pincode,
        country: cust.address.country,
        is_default: true,
      };

      const url = cust.id ? `/api/customers/${cust.id}` : "/api/customers";
      const method = cust.id ? "PUT" : "POST";
      const res = await apiFetch(url, company, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Save failed");

      await loadCusts();
      if (keepOpen) {
        setCust(getInitialCust());
        setErrors({});
      } else {
        setCust(getInitialCust());
        setShowForm(false);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveCustomer(false);
  };

  const handleSaveAndAddNext = async () => {
    await saveCustomer(true);
  };

  const inputClass = (field: string) =>
    `w-full mt-2 border rounded-lg p-3 outline-none focus:ring-2 ${errors[field] ? "border-red-500 focus:ring-red-400" : "focus:ring-indigo-500"}`;

  const filteredCusts = useMemo(
    () =>
      custs.filter((s) =>
        `${s.name} ${s.phone} ${s.email}`.toLowerCase().includes(search.toLowerCase())
      ),
    [custs, search]
  );

  const sortedCusts = useMemo(() => {
    if (!sortField) return filteredCusts;
    return [...filteredCusts].sort((a: any, b: any) => {
      const va = String(a[sortField] ?? "").toLowerCase();
      const vb = String(b[sortField] ?? "").toLowerCase();
      if (va < vb) return sortOrder === "asc" ? -1 : 1;
      if (va > vb) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredCusts, sortField, sortOrder]);

  const {
    currentPage,
    itemsPerPage,
    setItemsPerPage,
    totalItems,
    totalPages,
    pageNumbers,
    showingFrom,
    showingTo,
    paginatedData: paginatedCusts,
    goToPage,
    goToPreviousPage,
    goToNextPage,
  } = usePagination({
    data: sortedCusts,
    initialItemsPerPage: 20,
    resetDeps: [search],
  });

  const countryOptions = useMemo(() => Country.getAllCountries(), []);
  const selectedCountry = countryOptions.find((c) => c.name === cust.address.country);
  const stateOptions = selectedCountry ? State.getStatesOfCountry(selectedCountry.isoCode) : [];
  const selectedState = stateOptions.find((s) => s.name === cust.address.state);
  const cityOptions =
    selectedCountry && selectedState
      ? City.getCitiesOfState(selectedCountry.isoCode, selectedState.isoCode)
      : [];
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {formLoading && createPortal(<div className="fixed inset-0 z-[99999] bg-black/20 backdrop-blur-sm flex items-center justify-center"><div className="bg-white p-8 rounded-xl shadow-2xl flex flex-col items-center gap-3"><div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div><p className="text-gray-700 font-semibold text-lg">{cust.id ? "Updating Customer..." : "Saving Customer..."}</p></div></div>, document.body)}
      {tableLoading && createPortal(<div className="fixed inset-0 z-[99999] bg-black/20 backdrop-blur-sm flex items-center justify-center"><div className="bg-white p-8 rounded-xl shadow-2xl flex flex-col items-center gap-3"><div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div><p className="text-gray-700 font-semibold text-lg">Loading customers...</p></div></div>, document.body)}

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{showForm ? "Customer Master" : "Customer List"}</h1>
        {!showForm && <button onClick={() => { setCust(getInitialCust()); setErrors({}); setShowForm(true); }} className="bg-[var(--color-blue-500)] flex items-center gap-2 text-white px-4 py-2 rounded-lg"><PlusIcon className="w-4 h-4" />Add Customer</button>}
      </div>

      {!showForm && (
        <>
          <div className="relative max-w-sm">
            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" />
            <input type="text" placeholder="Search..." className="w-full pl-10 pr-4 py-2 border rounded-lg" onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-8">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-indigo-50 text-gray-600 uppercase text-xs">
                  <tr className="border-t hover:bg-blue-50 transition">
                    <th className="p-4 text-left" onClick={() => setSortField("name")}>Name</th>
                    <th className="p-4 text-left" onClick={() => setSortField("phone")}>Phone</th>
                    <th className="p-4 text-left" onClick={() => setSortField("email")}>Email</th>
                    <th className="p-4 text-left" onClick={() => setSortField("address")}>Address</th>
                    <th className="p-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {tableLoading ? 
                    <tr>
                      <td colSpan={5} className="text-center py-10 text-gray-400 animate-pulse">Loading data...</td>
                    </tr>
                   : paginatedCusts.length > 0 ?  paginatedCusts.map((cus) => 
                      <tr key={cus.id} className="border-t hover:bg-blue-50 transition">
                        <td className="p-4 font-medium text-gray-700">{cus.name || "-"}</td>
                        <td className="p-4">{cus.phone || "-"}</td>
                        <td className="p-4">{cus.email || "-"}</td>
                        <td className="p-4">
                          {cus.address.address_line1
                            ? `${cus.address.address_line1}${cus.address.city ? `, ${cus.address.city}` : ""}${cus.address.state ? `, ${cus.address.state}` : ""}`
                            : "-"}
                        </td>
                        <td className="text-center">
                          <button type="button" onClick={() => { setCust(normalizeCust(cus)); setShowForm(true); }} className="text-indigo-600"><PencilSquareIcon className="w-5 h-5" /></button>
                        </td>
                      </tr>
                    ) :
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-gray-500">No records found.</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <div className="border-t border-gray-200 px-4 py-4 sm:px-6">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm text-gray-700">
                              Showing <span className="font-medium">{showingFrom}</span> to <span className="font-medium">{showingTo}</span> of <span className="font-medium">{totalItems}</span> results
                            </p>
                            <div className="flex items-center gap-2">
                              <label htmlFor="cust-items-per-page" className="text-sm text-gray-600">Rows per page</label>
                              <select
                                id="cust-items-per-page"
                                value={itemsPerPage}
                                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                                className="rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
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
        </>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow space-y-6">
          <h2 className="text-lg font-semibold">{cust.id ? "Update Customer" : "Create Customer"}</h2>

          <div className="grid md:grid-cols-3 gap-6 mt-6">
            <div>
              <label className="text-sm font-semibold mb-1 block">Name <span className="text-red-500">*</span></label>
              <input
                value={cust.name}
                onChange={(e) => setCust({ ...cust, name: e.target.value })}
                className={inputClass("name")}
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="text-sm font-semibold mb-1 block">Phone <span className="text-red-500">*</span></label>
              <input
                value={cust.phone}
                onChange={(e) => setCust({ ...cust, phone: e.target.value })}
                className={inputClass("phone")}
              />
              {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
            </div>

            <div>
              <label className="text-sm font-semibold mb-1 block">Email</label>
              <input
                value={cust.email}
                onChange={(e) => setCust({ ...cust, email: e.target.value })}
                className={inputClass("email")}
              />
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="text-sm font-semibold mb-1 block">Address Line 1</label>
              <input
                value={cust.address.address_line1}
                onChange={(e) =>
                  setCust({
                    ...cust,
                    address: { ...cust.address, address_line1: e.target.value },
                  })
                }
                className={inputClass("address_line1")}
              />
            </div>

            <div>
              <label className="text-sm font-semibold mb-1 block">Address Line 2</label>
              <input
                value={cust.address.address_line2}
                onChange={(e) =>
                  setCust({
                    ...cust,
                    address: { ...cust.address, address_line2: e.target.value },
                  })
                }
                className={inputClass("address_line2")}
              />
            </div>

            <div>
              <label className="text-sm font-semibold mb-1 block">Address Line 3</label>
              <input
                value={cust.address.address_line3}
                onChange={(e) =>
                  setCust({
                    ...cust,
                    address: { ...cust.address, address_line3: e.target.value },
                  })
                }
                className={inputClass("address_line3")}
              />
            </div>

            <div>
              <label className="text-sm font-semibold mb-1 block">Country</label>
              <select
                value={cust.address.country}
                onChange={(e) =>
                  setCust({
                    ...cust,
                    address: { ...cust.address, country: e.target.value, state: "", city: "" },
                  })
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
                value={cust.address.state}
                onChange={(e) =>
                  setCust({
                    ...cust,
                    address: { ...cust.address, state: e.target.value, city: "" },
                  })
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
                value={cust.address.city}
                onChange={(e) =>
                  setCust({
                    ...cust,
                    address: { ...cust.address, city: e.target.value },
                  })
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
                value={cust.address.pincode}
                onChange={(e) =>
                  setCust({
                    ...cust,
                    address: { ...cust.address, pincode: e.target.value },
                  })
                }
                className={inputClass("pincode")}
              />
            </div>
          </div>

          <div className="flex justify-between pt-6 border-t border-gray-100">
            <button 
            type="button" 
            onClick={() => setShowForm(false)} 
            className="bg-gray-300 px-6 py-2 rounded-lg">
              Cancel</button>
              <div className="flex gap-4">
            {!cust.id && (
              <button 
              type="button" 
              onClick={handleSaveAndAddNext} 
              className="bg-gray-300 px-6 py-2 rounded-lg">
                Create & add Another
                </button>
            )}
            <button 
            className="bg-[var(--color-blue-500)] text-white px-6 py-2 rounded-lg">
              {cust.id ? "Update Customer" : "Create Customer"}
              </button></div>
          </div>
        </form>
      )}
    </div>
  );
}
