//C:\Users\yanna\template_tailwind\src\app\[company]\masters\supplier\page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeftIcon, ChevronRightIcon, MagnifyingGlassIcon, PencilSquareIcon, PlusIcon } from "@heroicons/react/24/outline";
import { Country, State, City } from "country-state-city";
import { useTenant } from "@/context/TenantContext";
import { apiFetch } from "@/lib/apiFetch";
import { usePagination } from "@/hooks/usePagination";
import { Button, Select } from "antd";
import { PlusOutlined } from "@ant-design/icons";

type Contact = { person: string; phone: string; email: string };
type SupplierTab = "commercial" | "address" |  "bank" | "contact";

type Supplier = {
  id?: number;
  supplier_code: string;
  short_name: string;
  supplier_name: string;
  classification: number;
  introduced_date: string;
  introduced_by: string;
  effective_from: string;
  effective_to: string;
  purchase_hold: boolean;
  qc_required: boolean;
  address_line1: string;
  address_line2: string;
  address_line3: string;
  country: string;
  state: string;
  city: string;
  pincode: string;
  website: string;
  email: string;
  linkedin: string;
  skype: string;
  dispatch_terms: string;
  payment_terms: string;
  currency: string;
  gstin: string;
  cin: string;
  bank_name: string;
  beneficiary_name: string;
  beneficiary_code: string;
  branch: string;
  ifsc_code: string;
  swift_code: string;
  contact_person1: string;
  contact_phone1: string;
  contact_email1: string;
  contact_person2: string;
  contact_phone2: string;
  contact_email2: string;
  contact_person3: string;
  contact_phone3: string;
  contact_email3: string;
  name: string;
  phone: string;
  contacts: Contact[];
};
type DespatchTerm = {
  code: string;
  despatch_name: string;
};
type PaymentTerm = {
  id: number;
  name: string;
};
type Currencies = {
  id: number;
  currency_code: string;
  currency_name:string;
};
const CLASSIFICATION_OPTIONS = [
  { value: 1, label: "Manufacturer" },
  { value: 2, label: "Subcontract" },
  { value: 3, label: "Trader" },
];

const tabs: { key: SupplierTab; label: string }[] = [
  { key: "commercial", label: "Commercial Terms" },
  { key: "address", label: "Address" },
  { key: "bank", label: "Bank Details" },
  { key: "contact", label: "Contact Details" },
];

function getInitialSupplier(): Supplier {
  return {
    supplier_code: "",
    short_name: "",
    supplier_name: "",
    classification: 3,
    introduced_date: "",
    introduced_by: "",
    effective_from: "",
    effective_to: "",
    purchase_hold: false,
    qc_required: false,
    address_line1: "",
    address_line2: "",
    address_line3: "",
    country: "",
    state: "",
    city: "",
    pincode: "",
    website: "",
    email: "",
    linkedin: "",
    skype: "",
    dispatch_terms: "",
    payment_terms: "",
    currency: "",
    gstin: "",
    cin: "",
    bank_name: "",
    beneficiary_name: "",
    beneficiary_code: "",
    branch: "",
    ifsc_code: "",
    swift_code: "",
    contact_person1: "",
    contact_phone1: "",
    contact_email1: "",
    contact_person2: "",
    contact_phone2: "",
    contact_email2: "",
    contact_person3: "",
    contact_phone3: "",
    contact_email3: "",
    name: "",
    phone: "",
    contacts: [
      { person: "", phone: "", email: "" },
      { person: "", phone: "", email: "" },
      { person: "", phone: "", email: "" },
    ],
  };
}

function getNextSupplierCode(existing: Supplier[]) {
  const match = (code?: string) => {
    if (!code) return null;
    const m = code.match(/^VEN(\d{1,})$/i);
    return m ? Number(m[1]) : null;
  };

  const max = existing
    .map((s) => match(s.supplier_code))
    .filter((n): n is number => typeof n === "number" && !Number.isNaN(n))
    .reduce((acc, n) => Math.max(acc, n), 0);

  const next = max + 1;
  return `VEN${String(next).padStart(3, "0")}`;
}

function normalizeSupplier(row: any): Supplier {
  const supplierName = row?.supplier_name || row?.name || "";
  const contacts: Contact[] = [
    { person: row?.contact_person1 || "", phone: row?.contact_phone1 || row?.phone || "", email: row?.contact_email1 || "" },
    { person: row?.contact_person2 || "", phone: row?.contact_phone2 || "", email: row?.contact_email2 || "" },
    { person: row?.contact_person3 || "", phone: row?.contact_phone3 || "", email: row?.contact_email3 || "" },
  ];

  return {
    ...getInitialSupplier(),
    ...row,
    supplier_name: supplierName,
    short_name: row?.short_name || supplierName,
    classification: Number(row?.classification || 3),
    name: row?.name || supplierName,
    phone: row?.phone || contacts[0].phone,
    contacts,
  };
}

export default function SupplierPage() {
  const { company } = useTenant();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [despatchTerms, setDespatchTerms] = useState<DespatchTerm[]>([]);
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerm[]>([]);
  const [currencies, setCurrencies] = useState<Currencies[]>([]);
  const [supplier, setSupplier] = useState<Supplier>(getInitialSupplier());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formLoading, setFormLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [activeTab, setActiveTab] = useState<SupplierTab>("commercial");

  useEffect(() => {
    if (!company) return;
    const run = async () => {
      try {
        setTableLoading(true);
        const res = await apiFetch("/api/suppliers", company);
        const data = await res.json();
        setSuppliers(data.success ? (data.data || []).map(normalizeSupplier) : []);
      } catch {
        setSuppliers([]);
      } finally {
        setTableLoading(false);
      }
    };
    run();
  }, [company]);

  const loadSuppliers = async (): Promise<Supplier[]> => {
    if (!company) return [];
    try {
      const res = await apiFetch("/api/suppliers", company);
      const data = await res.json();
      const nextSuppliers = data.success ? (data.data || []).map(normalizeSupplier) : [];
      setSuppliers(nextSuppliers);
      return nextSuppliers;
    } catch {
      setSuppliers([]);
      return [];
    }
  };

  const loadDespatchTerms = async () => {
    if (!company) return;
    try {
      const res = await apiFetch("/api/despatch-terms", company);
      const data = await res.json();
      setDespatchTerms(data.success ? data.data || [] : []);
    } catch {
      setDespatchTerms([]);
    }
  };

  const loadPaymentTerms = async () => {
    if (!company) return;
    try {
      const res = await apiFetch("/api/payment-terms", company);
      const data = await res.json();
      setPaymentTerms(data.success ? data.data || [] : []);
    } catch {
      setPaymentTerms([]);
    }
  };

   const loadCurrencies = async () => {
    if (!company) return;
    try {
      const res = await apiFetch("/api/currencies", company);
      const data = await res.json();
      setCurrencies(data.success ? data.data || [] : []);
    } catch {
      setCurrencies([]);
    }
  };
  const currenciesOptions = useMemo(() => {
    return currencies
      .map((item) => {
        const label = `${item.currency_code} - ${item.currency_name}`;
        return { value: String(item.id), label };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [currencies]);

  useEffect(() => {
    loadDespatchTerms();
    loadPaymentTerms();
    loadCurrencies();
  }, [company]);

  const validate = () => {
    const next: Record<string, string> = {};
    if (!supplier.short_name.trim()) next.short_name = "Short Name is required";
    if (!supplier.supplier_name.trim()) next.supplier_name = "Supplier Name is required";
    if (!supplier.currency) next.currency = "Currency is required";
    if (![1, 2, 3].includes(Number(supplier.classification))) next.classification = "Classification is required";
    if (supplier.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supplier.email)) next.email = "Invalid email";
    supplier.contacts.forEach((c, i) => {
      if (c.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)) next[`contact_email_${i}`] = "Invalid email";
    });
    setErrors(next);
    return Object.keys(next).length === 0;
  };
const saveSupplier = async (keepOpen = false )=>{ 
  if (!validate()) return;
    setFormLoading(true);
    try {
      const payload = {
        ...supplier,
        name: supplier.supplier_name,
        phone: supplier.contacts[0]?.phone || supplier.phone,
        contact_person1: supplier.contacts[0]?.person || "",
        contact_phone1: supplier.contacts[0]?.phone || "",
        contact_email1: supplier.contacts[0]?.email || "",
        contact_person2: supplier.contacts[1]?.person || "",
        contact_phone2: supplier.contacts[1]?.phone || "",
        contact_email2: supplier.contacts[1]?.email || "",
        contact_person3: supplier.contacts[2]?.person || "",
        contact_phone3: supplier.contacts[2]?.phone || "",
        contact_email3: supplier.contacts[2]?.email || "",
      };

      const url = supplier.id ? `/api/suppliers/${supplier.id}` : "/api/suppliers";
      const method = supplier.id ? "PUT" : "POST";
      const res = await apiFetch(url, company, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Save failed");

      const updatedSuppliers = await loadSuppliers();
      setCurrentPage(1);
      setErrors({});

      if (keepOpen) {
        setSupplier(() => ({
          ...getInitialSupplier(),
          supplier_code: data.next_code || getNextSupplierCode(updatedSuppliers),
        }));
        setActiveTab("commercial");
      } else {
        setSupplier(getInitialSupplier());
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
    await saveSupplier(false);
  };
    const handleSaveAndAddNext = async () => {
      await saveSupplier(true);
    };

  const updateContact = (idx: number, field: keyof Contact, value: string) => {
    const contacts = [...supplier.contacts];
    contacts[idx] = { ...contacts[idx], [field]: value };
    setSupplier({ ...supplier, contacts, phone: idx === 0 && field === "phone" ? value : supplier.phone });
  };

  const inputClass = (field: string) =>
    `w-full mt-2 border rounded-lg p-3 outline-none focus:ring-2 ${errors[field] ? "border-red-500 focus:ring-red-400" : "focus:ring-indigo-500"}`;

  const filteredSuppliers = useMemo(() =>
    suppliers.filter((s) => `${s.supplier_code} ${s.short_name} ${s.supplier_name} ${s.email}`.toLowerCase().includes(search.toLowerCase())),
    [suppliers, search]
  );

  const sortedSuppliers = useMemo(() => {
    if (!sortField) return filteredSuppliers;
    return [...filteredSuppliers].sort((a: any, b: any) => {
      const va = a[sortField] ?? "";
      const vb = b[sortField] ?? "";
      if (va < vb) return sortOrder === "asc" ? -1 : 1;
      if (va > vb) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredSuppliers, sortField, sortOrder]);

  const {
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    totalItems,
    totalPages,
    pageNumbers,
    showingFrom,
    showingTo,
    paginatedData: paginatedSuppliers,
    goToPage,
    goToPreviousPage,
    goToNextPage,
  } = usePagination({
    data: sortedSuppliers,
    initialItemsPerPage: 20,
    resetDeps: [search],
  });

  const countryOptions = useMemo(()=> Country.getAllCountries(),[]);
  const selectedCountry = countryOptions.find((c) => c.name === supplier.country);
  const stateOptions = selectedCountry ? State.getStatesOfCountry(selectedCountry.isoCode) : [];
  const selectedState = stateOptions.find((s) => s.name === supplier.state);
  const cityOptions =
    selectedCountry && selectedState
      ? City.getCitiesOfState(selectedCountry.isoCode, selectedState.isoCode)
      : [];
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {formLoading && createPortal(<div className="fixed inset-0 z-[99999] bg-black/20 backdrop-blur-sm flex items-center justify-center"><div className="bg-white p-8 rounded-xl shadow-2xl flex flex-col items-center gap-3"><div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div><p className="text-gray-700 font-semibold text-lg">{supplier.id ? "Updating Supplier..." : "Saving Supplier..."}</p></div></div>, document.body)}
      {tableLoading && createPortal(<div className="fixed inset-0 z-[99999] bg-black/20 backdrop-blur-sm flex items-center justify-center"><div className="bg-white p-8 rounded-xl shadow-2xl flex flex-col items-center gap-3"><div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div><p className="text-gray-700 font-semibold text-lg">Loading suppliers...</p></div></div>, document.body)}

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{showForm ? "Supplier Master" : "Supplier List"}</h1>
        {!showForm && <button 
        onClick={() => { 
          setSupplier({ 
            ...getInitialSupplier(), 
            supplier_code: getNextSupplierCode(suppliers) });
          setErrors({}); 
          setActiveTab("commercial"); 
          setShowForm(true); }} 
        className="bg-[var(--color-blue-500)] flex items-center gap-2 text-white px-4 py-2 rounded-lg">
          <PlusIcon className="w-4 h-4" />Add Supplier</button>}
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
                    <th className="p-4 text-left" onClick={() => setSortField("supplier_code")}>Code</th><th className="p-4 text-left" onClick={() => setSortField("short_name")}>Short Name</th><th className="p-4 text-left" onClick={() => setSortField("supplier_name")}>Supplier Name</th>
             
                <th className="p-4 text-left" onClick={() => setSortField("city")}>City</th><th className="p-4 text-center">Action</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {tableLoading ? <tr>
                    <td colSpan={6} className="text-center py-10 text-gray-400 animate-pulse">Loading data...</td>
                  </tr> : 
                  paginatedSuppliers.length > 0 ? paginatedSuppliers.map((sup) => 
                  <tr key={sup.id} className="border-t hover:bg-blue-50 transition">
                    <td className="p-4">{sup.supplier_code || "-"}</td><td>{sup.short_name}</td><td>{sup.supplier_name}</td><td>{sup.city || "-"}</td><td className="text-center">
                      <button onClick={() => { setSupplier(normalizeSupplier(sup)); setShowForm(true); }} className="text-indigo-600"><PencilSquareIcon className="w-5 h-5" /></button></td></tr>
                ) : <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-500">No records found.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="border-t border-gray-200 px-4 py-4 sm:px-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{showingFrom}</span> to <span className="font-medium">{showingTo}</span> of <span className="font-medium">{totalItems}</span> results
                </p>
                <div className="flex items-center gap-2">
                  <label htmlFor="supplier-items-per-page" className="text-sm text-gray-600">Rows per page</label>
                  <select
                    id="supplier-items-per-page"
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
          <h2 className="text-lg font-semibold">{supplier.id ? "Update Supplier" : "Create Supplier"}</h2>

          <div className="grid md:grid-cols-4 gap-6">
            <div><label className="text-sm font-semibold mb-1 block">Supplier Code (Auto)</label><input value={supplier.supplier_code} readOnly className="w-full mt-2 border rounded-lg p-3 bg-gray-100 text-gray-600" /></div>
            <div><label className="text-sm font-semibold mb-1 block">Short Name <span className="text-red-500">*</span></label><input value={supplier.short_name} onChange={(e) => setSupplier({ ...supplier, short_name: e.target.value })} className={inputClass("short_name")} />{errors.short_name && <p className="text-red-500 text-sm mt-1">{errors.short_name}</p>}</div>
            <div><label className="text-sm font-semibold mb-1 block">Supplier Name <span className="text-red-500">*</span></label><input value={supplier.supplier_name} onChange={(e) => setSupplier({ ...supplier, supplier_name: e.target.value, name: e.target.value })} className={inputClass("supplier_name")} />{errors.supplier_name && <p className="text-red-500 text-sm mt-1">{errors.supplier_name}</p>}</div>

            <div><label className="text-sm font-semibold mb-1 block">Classification</label><select value={supplier.classification} onChange={(e) => setSupplier({ ...supplier, classification: Number(e.target.value) })} className={inputClass("classification")}>{CLASSIFICATION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
            <div><label className="text-sm font-semibold mb-1 block">Introduced Date</label><input type="date" value={supplier.introduced_date || ''} onChange={(e) => setSupplier({ ...supplier, introduced_date: e.target.value ?? ""  })} className={inputClass("introduced_date")} /></div>
            <div><label className="text-sm font-semibold mb-1 block">Introduced By</label><input value={supplier.introduced_by || ''} onChange={(e) => setSupplier({ ...supplier, introduced_by: e.target.value ?? ""})} className={inputClass("introduced_by")} /></div>

            <div><label className="text-sm font-semibold mb-1 block">Effective From</label><input type="date" value={supplier.effective_from || ''} onChange={(e) => setSupplier({ ...supplier, effective_from: e.target.value ?? ""  })} className={inputClass("effective_from")} /></div>
            <div><label className="text-sm font-semibold mb-1 block">Effective To</label><input type="date" value={supplier.effective_to || ''} onChange={(e) => setSupplier({ ...supplier, effective_to: e.target.value ?? ""  })} className={inputClass("effective_to")} /></div>
            <div className="flex items-end gap-6 pb-2"><label className="inline-flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={supplier.purchase_hold} onChange={(e) => setSupplier({ ...supplier, purchase_hold: e.target.checked })} />Purchase Hold</label>
              {/* <label className="inline-flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" checked={supplier.qc_required} onChange={(e) => setSupplier({ ...supplier, qc_required: e.target.checked })} />QC Required</label> */}
                </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <div className="flex flex-wrap gap-2">{tabs.map((tab) => <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)} className={`px-4 py-2 rounded-lg text-sm font-medium border ${activeTab === tab.key ? "bg-[var(--color-blue-500)] text-white border-[var(--color-blue-600)]" : "bg-white text-gray-700 border-gray-200"}`}>{tab.label}</button>)}</div>

            {activeTab === "commercial" && <div className="grid md:grid-cols-3 gap-6 mt-6">
              <div><label className="text-sm font-semibold mb-1 block">Despatch Terms</label>
            {/* <input value={supplier.dispatch_terms} onChange={(e) => setSupplier({ ...supplier, dispatch_terms: e.target.value })} className={inputClass("dispatch_terms")} /> */}
            <Select 
            showSearch
            placeholder="Select Despatch Term"
            value={supplier.dispatch_terms || undefined}
            onChange={(value) =>
              setSupplier({ ...supplier, dispatch_terms: String(value || "") })
            }
            options={despatchTerms.map((dt) => ({ label: dt.despatch_name, value: dt.code }))}
            optionFilterProp="label"
            className={inputClass("dispatch_terms")}
            />
            </div>
            <div><label className="text-sm font-semibold mb-1 block">Payment Terms</label>
            <Select
            showSearch
            placeholder="Select Payment Term"
            value={supplier.payment_terms || undefined}
            onChange={(value) =>
              setSupplier({ ...supplier, payment_terms: String(value || "") })
            }
            options={paymentTerms.map((pt) => ({ label: pt.name, value: pt.name }))}
            optionFilterProp="label"
            className={inputClass("payment_terms")}
            />
            </div>
            <div><label className="text-sm font-semibold mb-1 block">Currency<span className="text-red-500">*</span></label>
            <Select
            showSearch
            placeholder="Select Currency"
            value={supplier.currency || undefined}
            onChange={(value) =>
              setSupplier({ ...supplier, currency: String(value || "") })
            }
            options={currenciesOptions}
            optionFilterProp="label"
            className={inputClass("currency")}
            
            />{errors.currency && <p className="text-red-500 text-sm mt-1">{errors.currency}</p>}
            </div>
            <div><label className="text-sm font-semibold mb-1 block">GSTIN</label><input value={supplier.gstin} onChange={(e) => setSupplier({ ...supplier, gstin: e.target.value })} className={inputClass("gstin")} /></div>
            <div><label className="text-sm font-semibold mb-1 block">CIN</label><input value={supplier.cin} 
            onChange={(e) => setSupplier({ ...supplier, cin: e.target.value })} className={inputClass("cin")} /></div></div>}

           {activeTab === "address" && (
  <div className="grid md:grid-cols-4 gap-6 mt-6">

    {/* Row 1 */}
    <div>
      <label className="text-sm font-semibold mb-1 block">Address Line 1</label>
      <input
        value={supplier.address_line1}
        onChange={(e) =>
          setSupplier({ ...supplier, address_line1: e.target.value })
        }
        className={inputClass("address_line1")}
      />
    </div>

    <div>
      <label className="text-sm font-semibold mb-1 block">Address Line 2</label>
      <input
        value={supplier.address_line2}
        onChange={(e) =>
          setSupplier({ ...supplier, address_line2: e.target.value })
        }
        className={inputClass("address_line2")}
      />
    </div>

    <div>
      <label className="text-sm font-semibold mb-1 block">Address Line 3</label>
      <input
        value={supplier.address_line3}
        onChange={(e) =>
          setSupplier({ ...supplier, address_line3: e.target.value })
        }
        className={inputClass("address_line3")}
      />
    </div>

    {/* empty space to complete row */}
    <div></div>

    {/* Row 2 */}
        <div>
      <label className="text-sm font-semibold mb-1 block">Country</label>
      <select
        value={supplier.country}
        onChange={(e) =>
          setSupplier({ ...supplier, country: e.target.value, state: "", city: "" })
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
      <label className="text-sm font-semibold mb-1 block">Province / State</label>
      <select
        value={supplier.state}
        onChange={(e) =>
          setSupplier({ ...supplier, state: e.target.value, city: "" })
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
        value={supplier.city}
        onChange={(e) =>
          setSupplier({ ...supplier, city: e.target.value })
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
      <label className="text-sm font-semibold mb-1 block">
        Zipcode / Pincode
      </label>
      <input
        value={supplier.pincode}
        onChange={(e) =>
          setSupplier({ ...supplier, pincode: e.target.value })
        }
        className={inputClass("pincode")}
      />
    </div>

    {/* Row 3 */}
    <div>
      <label className="text-sm font-semibold mb-1 block">Website</label>
      <input
        value={supplier.website || ""}
        onChange={(e) =>
          setSupplier({ ...supplier, website: e.target.value  ?? "" })
        }
        className={inputClass("website")}
      />
    </div>

    <div>
      <label className="text-sm font-semibold mb-1 block">LinkedIn</label>
      <input
        value={supplier.linkedin || ""}
        onChange={(e) =>
          setSupplier({ ...supplier, linkedin: e.target.value  ?? "" })
        }
        className={inputClass("linkedin")}
      />
    </div>

    <div>
      <label className="text-sm font-semibold mb-1 block">Mail</label>
      <input
        value={supplier.email || ""}
        onChange={(e) =>
          setSupplier({ ...supplier, email: e.target.value  ?? "" })
        }
        className={inputClass("email")}
      />
    </div>

    <div>
      <label className="text-sm font-semibold mb-1 block">Skype</label>
      <input
        value={supplier.skype || ""}
        onChange={(e) =>
          setSupplier({ ...supplier, skype: e.target.value  ?? "" })
        }
        className={inputClass("skype")}
      />
    </div>

  </div>
)}


            {activeTab === "bank" && <div className="grid md:grid-cols-3 gap-6 mt-6"><div><label className="text-sm font-semibold mb-1 block">Bank Name</label><input value={supplier.bank_name} onChange={(e) => setSupplier({ ...supplier, bank_name: e.target.value })} className={inputClass("bank_name")} /></div><div><label className="text-sm font-semibold mb-1 block">Beneficiary Name</label><input value={supplier.beneficiary_name} onChange={(e) => setSupplier({ ...supplier, beneficiary_name: e.target.value })} className={inputClass("beneficiary_name")} /></div><div><label className="text-sm font-semibold mb-1 block">Beneficiary Code</label><input value={supplier.beneficiary_code} onChange={(e) => setSupplier({ ...supplier, beneficiary_code: e.target.value })} className={inputClass("beneficiary_code")} /></div><div><label className="text-sm font-semibold mb-1 block">Branch</label><input value={supplier.branch} onChange={(e) => setSupplier({ ...supplier, branch: e.target.value })} className={inputClass("branch")} /></div><div><label className="text-sm font-semibold mb-1 block">IFSC Code</label><input value={supplier.ifsc_code} onChange={(e) => setSupplier({ ...supplier, ifsc_code: e.target.value })} className={inputClass("ifsc_code")} /></div><div><label className="text-sm font-semibold mb-1 block">SWIFT Code</label><input value={supplier.swift_code} onChange={(e) => setSupplier({ ...supplier, swift_code: e.target.value })} className={inputClass("swift_code")} /></div></div>}

   {activeTab === "contact" && (
  <div className="mt-6 space-y-4">
    {supplier.contacts.map((contact, idx) => (
      <div key={idx} className="grid md:grid-cols-3 gap-4">

        <div>
          <label className="text-sm font-semibold mb-1 block">
            {idx + 1}. Contact Person
          </label>
          <input
            value={contact.person}
            onChange={(e) => updateContact(idx, "person", e.target.value)}
            className={inputClass(`contact_person_${idx}`)}
          />
        </div>

        <div>
          <label className="text-sm font-semibold mb-1 block">Phone No</label>
          <input
            value={contact.phone}
            onChange={(e) => updateContact(idx, "phone", e.target.value)}
            className={inputClass(`contact_phone_${idx}`)}
          />
        </div>

        <div>
          <label className="text-sm font-semibold mb-1 block">Mail</label>
          <input
            value={contact.email}
            onChange={(e) => updateContact(idx, "email", e.target.value)}
            className={inputClass(`contact_email_${idx}`)}
          />
          {errors[`contact_email_${idx}`] && (
            <p className="text-red-500 text-sm mt-1">
              {errors[`contact_email_${idx}`]}
            </p>
          )}
        </div>

      </div>
    ))}
  </div>
)}
          </div>

          <div className="flex justify-between pt-6 border-t border-gray-100">
            <button 
            type="button" 
            onClick={() => setShowForm(false)} 
            className="bg-gray-300 px-6 py-2 rounded-lg">
              Cancel
              </button>
              <div className="flex gap-4">
                 {!supplier.id && (
              <button 
              type="button" 
              onClick={handleSaveAndAddNext} 
              className="bg-gray-300 px-6 py-2 rounded-lg">
                Save & Next
                </button>
            )}
            <button 
            className="bg-[var(--color-blue-500)] text-white px-6 py-2 rounded-lg">
              {supplier.id ? "Update Supplier" : "Save Supplier"}
              </button></div>
          </div>
        </form>
      )}
    </div>
  );
}
