"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import { TrashIcon } from "@heroicons/react/24/outline";
import { useTenant } from "@/context/TenantContext";
import { useUser } from "@/context/CurrentUserContext";

type PurchaseDetail = {
  id?: number;
  product_id: string;
  product_code?: string;
  product_name?: string;
  uom: string,
  hsn_code: string;
  rate: number | string;
  qty: number | string;
  amount: number;
  tax_id?: number | null;
  tax_name?: string;
  tax_percent: number;
  tax_amount: number;
  line_total: number;
};

type PurchaseHeader = {
  id?: number;
  purchase_no: string;
  supplier_id: string;
  req_date: string;
  purchase_date: string;
  status: string;
  approval_status?: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  conversion_rate?: number | "";
  user_name?: string;

};

type Product = {
  id: number;
  product_code: string;
  product_name: string;
  sku: string;
  base_price: number;
  tax_rate: number;
};

type Supplier = {
  id: number;
  supplier_code: string;
  name: string;
  currency: string;
};

type Currency = {
  id: number;
  currency_code: string;
  currency_name: string;
};

export default function PurchaseForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const purchaseId = searchParams.get("id"); // edit id
  const isEdit = Boolean(purchaseId);
  const { company } = useTenant();
  console.log("Tenant:", company);
  const { user } = useUser();
  console.log("User Name : ", user?.name)

  const initialHeader: PurchaseHeader = {
    purchase_no: "",
    supplier_id: "",
    purchase_date: new Date().toISOString().split("T")[0],
    req_date: "",
    status: "Entered",
    subtotal: 0,
    tax_amount: 0,
    total_amount: 0,
    currency: "",
    conversion_rate: "",
    user_name: "",
  };

  const initialDetail: PurchaseDetail = {
    product_id: "",
    uom: "",
    hsn_code: "",
    rate: "",
    qty: "",
    amount: 0,
    tax_id: 0,
    tax_name: "",
    tax_percent: 0,
    tax_amount: 0,
    line_total: 0,
  };

  const [header, setHeader] = useState<PurchaseHeader>(initialHeader);
  const [details, setDetails] = useState<PurchaseDetail[]>([]);
  const isEditable =!header.approval_status || header.approval_status === "Awaiting for approval";
  const [errors, setErrors] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [allTaxes, setAllTaxes] = useState<any[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);
  const [allCurrencies, setAllCurrencies] = useState<Currency[]>([]);
  const [showProductPopup, setShowProductPopup] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [popupError, setPopupError] = useState("");
  const [savedProductIds, setSavedProductIds] = useState<string[]>([]);
  const [popupCurrentPage, setPopupCurrentPage] = useState(1);
  const popupItemsPerPage = 10;

  const filteredProducts = allProducts.filter((p) =>
    p.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.product_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const popupTotalPages = Math.ceil(filteredProducts.length / popupItemsPerPage);

  const paginatedProducts = filteredProducts.slice(
    (popupCurrentPage - 1) * popupItemsPerPage,
    popupCurrentPage * popupItemsPerPage
  );

  const toggleProduct = (id: number) => {
    setSelectedProducts((prev) =>
      prev.includes(id)
        ? prev.filter((p) => p !== id)
        : [...prev, id]
    );
  };
  type ProductRow = {
    product_id: string;
    product_code?: string;
    product_name?: string;
    uom: string;
    hsn_code: string;
    rate: number;
    qty: number;
    amount: number;
    tax_percent: number;
    tax_amount: number;
    line_total: number;
    tax_id?: number | null;
    tax_name?: string;
  };
  const addSelectedProducts = () => {

    if (selectedProducts.length === 0) {
      setPopupError("Please select at least one product to add.");
      return;
    }

    // Combine current details and saved DB records
    const existingIds = [
      ...details.map(d => d.product_id),
      ...savedProductIds  // this should come from DB
    ];

    const rows: ProductRow[] = [];
    const duplicateProducts: string[] = [];

    for (const id of selectedProducts) {

      const p = allProducts.find((x) => x.id === id);
      if (!p) continue;

      if (existingIds.includes(String(p.id))) {
        duplicateProducts.push(p.product_name);
        continue;
      }

      rows.push({
        product_id: String(p.id),
        product_code: p.product_code,
        product_name: p.product_name,
        uom: "",
        hsn_code: "",
        rate: Number(p.base_price || 0),
        qty: 0,
        amount: 0,
        tax_percent: Number(p.tax_rate || 0),
        tax_amount: 0,
        line_total: 0,
        tax_id: null,
        tax_name: "",
      });
    }

    // show validation message
    if (duplicateProducts.length > 0) {
      setPopupError(
        `The following product(s) are already added: ${duplicateProducts.join(", ")}`
      );
      return; // stop execution and keep popup open
    }

    // clear error
    setPopupError("");

    setDetails((prev) => [...prev, ...rows]);

    setErrors((prev: any) => ({
      ...prev,
      details: ""
    }));

    setShowProductPopup(false);
    setSelectedProducts([]);
    setSearchTerm("");
    setPopupCurrentPage(1);
 
  };

  const closePopup = () => {
    setShowProductPopup(false);
    setSearchTerm("");
    setPopupCurrentPage(1);
    setSelectedProducts([]); // reset selection
  };

  useEffect(() => {
    const fetchSuppliers = async () => {
      if (!company) return;

      try {
        const res = await fetch("/api/suppliers", {
          headers: {
            "x-tenant": company
          }
        });

        const data = await res.json();

        if (data.success) {
          console.log("Fetched Suppliers:", data.data);
          setAllSuppliers(data.data);
          
          console.log("Suppliers set in state:", data.data);
        }

      } catch (err) {
        console.error("Supplier fetch error", err);
      }
    };

    fetchSuppliers();
  }, [company]);

  useEffect(() => {
    const fetchCurrencies = async () => {
      if (!company) return;
      try {
        const res = await fetch("/api/currencies", {
          headers: { "x-tenant": company }
        });
        const data = await res.json();
        if (data.success) {
          setAllCurrencies(data.data || []);
        } else {
          setAllCurrencies([]);
        }
      } catch (err) {
        console.error("Currency fetch error", err);
        setAllCurrencies([]);
      }
    };
    fetchCurrencies();
  }, [company]);

  // ------------------------------------------
  // Load Purchase For Edit
  // ------------------------------------------
  useEffect(() => {

    const fetchPurchase = async () => {

      if (!purchaseId || !company) return;
      console.log("Fetching purchase with ID:", purchaseId);
      try {

        const res = await fetch(`/api/purchase/${purchaseId}`, {
          headers: {
            "x-tenant": company,
          },
        });

        const data = await res.json();

        if (data.success) {
          setHeader((prev) => ({
            ...prev,
            ...data.data.header,
          }));
          const fetchedDetails = data.data.details.map((row: any) => ({
            ...row,
            qty: Number(row.qty),
            rate: Number(row.rate),
            amount: Number(row.qty * row.rate),
            tax_percent: Number(row.tax_percent),
            tax_amount: Number(row.tax_amount),
            line_total: Number(row.line_total),
          }));
          setDetails(fetchedDetails);
          setSavedProductIds(fetchedDetails.map((d: any) => String(d.product_id)));
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchPurchase();

  }, [purchaseId, company]);

  useEffect(() => {
    if (user?.name) {
      setHeader((prev) => ({
        ...prev,
        user_name: user.name,
      }));
    }
  }, [user]);

  useEffect(() => {
    const fetchProducts = async () => {
      if (!company) return;
      try {
        setLoadingProducts(true);
        const res = await fetch(`/api/product-lookup?type=products`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "x-tenant": company
          },
        });

        const data = await res.json();

        // Safety Guard: Ensure data is an array before setting state
        if (Array.isArray(data)) {
          console.log("Fetched Products:", data);
          setAllProducts(data);
        } else {
          console.error("API Error Response:", data);
          setAllProducts([]);
        }
      } catch (error) {
        console.error("Fetch Error:", error);
        setAllProducts([]);
      } finally {
        setLoadingProducts(false);
      }
    };
    fetchProducts();
  }, [company]);

  useEffect(() => {
    const fetchTaxes = async () => {
      if (!company) return;
      try {
        const res = await fetch(`/api/product-lookup?type=taxes`, {
          method: "GET",
          headers: { "x-tenant": company }
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          console.log("Fetched Taxes:", data.data);
          setAllTaxes(data.data); // store tax master
        }
      } catch (err) {
        console.error("Failed to fetch taxes", err);
        setAllTaxes([]);
      }
    };
    fetchTaxes();
  }, [company]);

  useEffect(() => {
    const fetchPurchaseNo = async () => {
      try {
        const res = await fetch("/api/purchase/generateNo", { headers: { "x-tenant": company } });
        const data = await res.json();
        if (data.success) setHeader(prev => ({ ...prev, purchase_no: data.purchase_no }));
      } catch (err) {
        console.error("Failed to fetch purchase number", err);
      }
    };
    fetchPurchaseNo();
  }, []);

  const calculateLine = (row: PurchaseDetail) => {
    const qty = Number(row.qty || 0);
    const rate = Number(row.rate || 0);
    const tax = Number(row.tax_percent || 0);

    const gross = qty * rate;
    const taxAmount = (gross * tax) / 100;
    const total = gross + taxAmount;
    return {
      ...row,
      amount: Number(gross.toFixed(2)),
      tax_amount: Number(taxAmount.toFixed(2)),
      line_total: Number(total.toFixed(2)),
    };
  };

  useEffect(() => {
    const subtotal = details.reduce(
      (sum, d) => sum + Number(d.qty) * Number(d.rate),
      0
    );

    const tax = details.reduce(
      (sum, d) => sum + Number(d.tax_amount || 0),
      0
    );

    const total = subtotal + tax;

    setHeader((prev) => ({
      ...prev,
      subtotal: Number(subtotal.toFixed(2)),
      tax_amount: Number(tax.toFixed(2)),
      total_amount: Number(total.toFixed(2)),
    }));
  }, [details]);

  const updateRow = (index: number, field: string, value: any) => {
    const updated = [...details];
    if (field === "product_id") {
      updated[index].product_id = value;

      // Lookup product details
      const selected = allProducts.find((p) => p.id === Number(value) || p.product_code === value);
      console.log("Selected Product:", selected);
      if (selected) {
        updated[index].product_name = selected.product_name;
        updated[index].rate = selected.base_price || 0;
        updated[index].tax_percent = selected.tax_rate || 0;
      } else {
        updated[index].product_name = "";
        updated[index].rate = 0;
        updated[index].tax_percent = 0;
      }
    } else {
      updated[index] = {
        ...updated[index],
        [field]: value === "" ? "" : Number(value)
      };
    }

    updated[index] = calculateLine(updated[index]);
    setDetails(updated);

    // clear validation errors
    setErrors((prev: any) => {
      const newErrors = { ...prev };
      delete newErrors.details;
      delete newErrors[`product_${index}`];
      delete newErrors[`rate_${index}`];
      delete newErrors[`qty_${index}`];
      return newErrors;
    });
  };

  const addRow = () => setDetails([...details, initialDetail]);
  const removeRow = (index: number) => setDetails(details.filter((_, i) => i !== index));

  const validate = () => {
    const newErrors: any = {};
    if (!header.purchase_no.trim()) newErrors.purchase_no = "Purchase No required";
    if (!header.purchase_date) newErrors.purchase_date = "Purchase date required";
    if (!header.req_date) newErrors.req_date = "Req Date required";
    if (header.purchase_date && header.req_date) {
      const poDate = new Date(header.purchase_date);
      const reqDate = new Date(header.req_date);

      if (reqDate <= poDate) {
        newErrors.req_date = "Req Date must be greater than PO Date";
      }
    }
    if (!header.supplier_id) newErrors.supplier_id = "Supplier required";
    if (!header.currency) {
      newErrors.currency = "Currency is required";
    }
    if (header.total_amount <= 0)
      newErrors.total_amount = "Total amount must be greater than 0";

    if (details.length === 0) {
      newErrors.details = "At least one product row is required";
    } else {
      details.forEach((d, index) => {
        if (!d.product_id) newErrors[`product_${index}`] = "Product Id required";
        if (Number(d.rate || 0) <= 0) newErrors[`rate_${index}`] = "Unit price must be > 0";
        if (Number(d.qty || 0) <= 0) newErrors[`qty_${index}`] = "Qty must be > 0";
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setErrorMessage("");
    if (!validate()) return;

    setLoading(true);
    try {
      const url = purchaseId
        ? `/api/purchase/${purchaseId}`
        : "/api/purchase";

      const method = purchaseId ? "PUT" : "POST";
      const res = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          "x-tenant": company,
        },
        body: JSON.stringify({
          header: { ...header, user_name: user?.name },
          details
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to save purchase");
      router.push(`/${company}/transactions/purchase`);
    } catch (err: any) {
      console.error("Save Purchase Error:", err);
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const totalQty = details.reduce((sum, r) => sum + Number(r.qty || 0), 0);
  const totalAmount = details.reduce((sum, row) => sum + Number(row.line_total || 0), 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {loading &&
        createPortal(
          <div className="fixed inset-0 z-[99999] bg-black/20 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-white p-8 rounded-xl shadow-2xl flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-700 font-semibold text-lg">{isEdit ? "Updating Purchase..." : "Saving Purchase..."}</p>
            </div>
          </div>,
          document.body
        )
      }
      {errorMessage && (
        <div className="text-red-600 font-semibold">{errorMessage}</div>
      )}

      <div className="flex items-center justify-between mb-4">

        {/* Left Side - Title */}
        <h1 className="text-2xl font-bold">
          {isEdit ? "Edit Purchase" : "Create Purchase"}
        </h1>

        {header.approval_status && (
    <span className={`px-3 py-1 text-xs rounded-full font-semibold
      ${header.approval_status === "Awaiting for approval" ? "bg-orange-100 text-orange-700" : ""}
      ${header.approval_status === "Approved" ? "bg-green-100 text-green-700" : ""}
      ${header.approval_status === "Rejected" ? "bg-red-100 text-red-700" : ""}
      ${header.approval_status === "Partial" ? "bg-blue-100 text-blue-700" : ""}
    `}>
      {header.approval_status}
    </span>
  )}

        {/* Right Side - Validation */}
        {errors.details && (
          <span className="text-red-500 text-sm font-medium whitespace-nowrap">
            {errors.details}
          </span>
        )}

      </div>


      {/* <form onSubmit={handleSubmit} className="space-y-6"> */}
      <form onSubmit={handleSubmit} className={`space-y-6 ${!isEditable ? "opacity-70" : ""}`}>
        {/* Header */}
        <div className="bg-white p-6 rounded-xl shadow grid md:grid-cols-5 gap-4">

          <div>
            {/* <label className="text-sm font-semibold mb-1 block">Purchase No</label> */}
            <label className="text-sm font-semibold mb-1 block">PO No <span className="text-red-500">*</span></label>
            <input
              value={header.purchase_no}
              onChange={(e) => {
                const value = e.target.value;
                setHeader({ ...header, purchase_no: value });
                if (value) {
                  setErrors((prev: any) => ({
                    ...prev,
                    purchase_no: "",
                  }));
                }
              }}
              className="border p-2 rounded w-full bg-gray-100 text-indigo-600 font-semibold"
              readOnly
            />
            {errors.purchase_no && (
              <p className="text-red-500 text-sm mt-1">{errors.purchase_no}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-semibold mb-1 block">PO Date <span className="text-red-500">*</span></label>
            <input
              type="date"
               disabled={!isEditable}
              value={header.purchase_date}
              min={new Date().toISOString().split("T")[0]}   // prevent past date
              onChange={(e) => {
                const value = e.target.value;
                setHeader({ ...header, purchase_date: value });
                if (value) {
                  setErrors((prev: any) => ({
                    ...prev,
                    purchase_date: "",
                  }));
                }
              }}
              className={`border p-2 rounded w-full ${errors.purchase_date ? "border-red-500" : ""}`}
            />
            {errors.purchase_date && (
              <p className="text-red-500 text-sm mt-1">{errors.purchase_date}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-semibold mb-1 block">Req Date <span className="text-red-500">*</span></label>
            <input
              type="date"
               disabled={!isEditable}
              value={header.req_date}
              min={new Date().toISOString().split("T")[0]}   // prevent past date
              onChange={(e) => {
                const value = e.target.value;
                setHeader({ ...header, req_date: value });
                if (value) {
                  setErrors((prev: any) => ({
                    ...prev,
                    req_date: "",
                  }));
                }
              }}
              className={`border p-2 rounded w-full ${errors.req_date ? "border-red-500" : ""}`}
            />
            {errors.req_date && (
              <p className="text-red-500 text-sm mt-1">{errors.req_date}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-semibold mb-1 block">Supplier Id <span className="text-red-500">*</span></label>
            <select
              value={header.supplier_id ?? ""}
               disabled={!isEditable}
              onChange={(e) => {
                const supplierId = e.target.value;
                const selectedSupplier = allSuppliers.find(
                  (s) => String(s.id) === supplierId
                );
                setHeader({
                  ...header,
                  supplier_id: supplierId,
                  currency: selectedSupplier?.currency || "",
                });
                // clear supplier & currency errors
                setErrors((prev: any) => {
                  const newErrors = { ...prev };
                  delete newErrors.supplier_id;
                  delete newErrors.currency;
                  return newErrors;
                });
              }}
              className={`border p-2 rounded w-full ${errors.supplier_id ? "border-red-500" : ""
                }`}
            >
              <option value="">Select Supplier</option>

              {allSuppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.supplier_code}-{s.name}
                </option>
              ))}
            </select>

            {errors.supplier_id && (
              <p className="text-red-500 text-sm mt-1">{errors.supplier_id}</p>
            )}
          </div>
          <div>
            <label className="text-sm font-semibold mb-1 block">
              Currency <span className="text-red-500">*</span>
            </label>

            {(() => {
              const currencyValue = header.currency;
              const match =
                allCurrencies.find((c) => String(c.id) === String(currencyValue)) ||
                allCurrencies.find((c) => c.currency_code === currencyValue);
              const currencyLabel = match
                ? `${match.currency_code} - ${match.currency_name}`
                : (currencyValue || "");
              return (
            <input
              type="text"
              value={currencyLabel}
              readOnly
              className="border p-2 rounded w-full bg-gray-100"
            />
              );
            })()}

            {errors.currency && (
              <p className="text-red-500 text-sm mt-1">{errors.currency}</p>
            )}
          </div>
          <div>
            <label className="text-sm font-semibold mb-1 block">
              Conversion Rate
            </label>

            <input
              type="number"
              disabled={!isEditable}
              value={header.conversion_rate ?? ""}
              onChange={(e) => {
                const value = e.target.value;
                setHeader({ ...header, conversion_rate: value === "" ? "" : Number(value) });
              }}
              className="border p-2 rounded w-full"
            />
          </div>
          <div>
            <label className="text-sm font-semibold mb-1 block">Subtotal</label>
            <input
              type="text"
              value={Number(header.subtotal || 0).toFixed(2)}
              readOnly
              className="border p-2 rounded w-full bg-gray-100 text-right"
            />
          </div>

          <div>
            <label className="text-sm font-semibold mb-1 block">Tax</label>
            <input
              type="text"
              value={Number(header.tax_amount || 0).toFixed(2)}
              readOnly
              className="border p-2 rounded w-full bg-gray-100 text-right"
            />
          </div>

          <div>
            <label className="text-sm font-semibold mb-1 block font-semibold">Total</label>
            <input
              type="text"
              value={Number(header.total_amount || 0).toFixed(2)}
              readOnly
              className="border p-2 rounded w-full bg-gray-100 text-right"
            />
          </div>
          <div className="flex items-start pt-6">
            {isEditable && (
            <button
              type="button"
              
              onClick={() => {if (!isEditable) return; setShowProductPopup(true);}}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded h-[40px] w-full font-medium"
            >
              Select Items
            </button>
            )}
          </div>
        </div>

        {/* Details Table */}
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <div className="min-h-[420px] max-h-[420px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-indigo-50 text-gray-600 text-sm sticky top-0 z-10 shadow-sm">
                <tr className="border-t hover:bg-blue-50 transition">
                  <th className="p-3 text-sm text-left">Product Id</th>
                  <th className="p-3 text-sm text-left">Product Name</th>
                  <th className="p-3 text-sm">UOM</th>
                  <th className="p-3 text-sm">HSN Code</th>
                  <th className="p-3 text-sm">Unit Price</th>
                  <th className="p-3 text-sm">Qty</th>
                  <th className="p-3 text-sm">Amount</th>
                  <th className="p-3 text-sm">Tax Group</th>
                  <th className="p-3 text-sm">Tax Amt</th>
                  <th className="p-3 text-sm">Total</th>
                  <th className="p-3"></th>
                </tr>
              </thead>

              <tbody>
                {details.map((row, index) => (
                  <tr key={index} className="border-t hover:bg-blue-50 transition">
                    <td className="p-2">
                      <div className="text-gray-700">{row.product_code}</div>
                    </td>
                    <td className="p-2">
                      <div className="text-gray-700">{row.product_name}</div>
                    </td>
                    <td className="p-2">
                      <div className="text-gray-700">{row.uom}</div>
                    </td>
                    <td className="p-2">
                      <div className="text-gray-700">{row.hsn_code}</div>
                    </td>
                    <td className="text-right">
                      <input
                        type="number"
                        disabled={!isEditable}
                        value={row.rate === "" ? "" : row.rate}
                        onChange={(e) => updateRow(index, "rate", e.target.value)}
                        className={`border p-1 rounded w-20 ${errors[`rate_${index}`] ? "border-red-500" : ""
                          }`}
                      />
                      {errors[`rate_${index}`] && (
                        <p className="text-red-500 text-sm mt-1">
                          {errors[`rate_${index}`]}
                        </p>
                      )}
                    </td>
                    <td className="text-right">
                      <input
                        type="number"
                        disabled={!isEditable}
                        value={row.qty === "" ? "" : row.qty}
                        onChange={(e) => updateRow(index, "qty", e.target.value)}
                        className={`border p-1 rounded w-20 ${errors[`qty_${index}`] ? "border-red-500" : ""}`}
                      />
                      {errors[`qty_${index}`] && (
                        <p className="text-red-500 text-sm mt-1">
                          {errors[`qty_${index}`]}
                        </p>
                      )}
                    </td>
                    <td className="text-right">{Number(row.amount || 0).toFixed(2)}</td>
                    <td className="text-center">
                      <select
                        value={row.tax_id ?? ""}   // empty if not selected
                        disabled={!isEditable}
                        onChange={(e) => {
                          const tax = allTaxes.find(t => t.id === Number(e.target.value));
                          const updated = [...details];

                          if (tax) {
                            updated[index].tax_id = tax.id;
                            updated[index].tax_name = tax.tax_name;
                            updated[index].tax_percent = Number(tax.total_percentage || 0);
                          } else {
                            updated[index].tax_id = 0;
                            updated[index].tax_name = "";
                            updated[index].tax_percent = 0;
                          }

                          updated[index] = calculateLine(updated[index]);
                          setDetails(updated);
                        }}
                        className="border p-1 rounded w-25"
                      >
                        <option value="">--Select--</option>   {/* initial empty */}
                        {allTaxes.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.tax_name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="text-right">{Number(row.tax_amount || 0).toFixed(2)}</td>
                    <td className="text-right">{Number(row.line_total || 0).toFixed(2)}</td>
                    <td className="p-2 flex justify-center items-center">
                      {isEditable && (
                      <button type="button" onClick={() => removeRow(index)} className="text-red-600 hover:text-red-800">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t bg-gray-50 flex justify-end">
            <div className="flex gap-6 text-sm font-medium text-gray-700">
              <div>Total Items: <span className="font-bold">{details.length}</span></div>
              <div>Total Qty: <span className="font-bold">{totalQty}</span></div>
              <div>Total Amount: <span className="font-bold">{totalAmount.toFixed(2)}</span></div>
            </div>
          </div>
        </div>

        {/* Totals */}
        {/* <div className="bg-white p-6 rounded-xl shadow flex justify-end">
          <div className="w-80 space-y-2 text-right">
            <div className="flex justify-between"><span>Subtotal</span><span>{Number(header.subtotal || 0).toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Tax</span><span>{Number(header.tax_amount || 0).toFixed(2)}</span></div>
            <div className="flex justify-between font-bold text-lg"><span>Total</span><span>{Number(header.total_amount || 0).toFixed(2)}</span></div>
          </div>
        </div> */}

        {/* Buttons */}
        <div className="flex justify-end gap-4">
          <button type="button" onClick={() => router.push(`/${company}/transactions/purchase`)} className="bg-gray-300 px-6 py-2 rounded hover:bg-gray-400">Cancel</button>
          {isEditable && (
          <button className="bg-[var(--color-blue-500)] text-white px-6 py-2 rounded hover:opacity-90">{isEdit ? "Update Purchase" : "Save Purchase"}</button>
          )}
          </div>

      </form>

      {/* ADD POPUP HERE */}
      {showProductPopup &&
        createPortal(
          <div className="fixed inset-0 z-[99999] bg-black/40 backdrop-blur-sm flex items-center justify-center">

            {/* Popup Container */}
            <div className="w-[950px] h-[650px] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden">

              {/* Header */}
              <div className="flex items-center justify-between px-6 py-3 border-b bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-700">
                  Select Products
                </h2>

                <div>
                  {popupError && (
                    <span className="text-red-500 text-sm">
                      {popupError}
                    </span>
                  )}
                </div>

                <button
                  onClick={closePopup}
                  className="text-gray-500 hover:text-black text-xl"
                >
                  ✕
                </button>
              </div>

              {/* Search */}
              <div className="p-4 border-b bg-white">
                <input
                  type="text"
                  placeholder="Search product code or name..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPopupCurrentPage(1);
                  }}
                  className="w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Table */}
              <div className="bg-white shadow-lg flex-1 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-indigo-50 text-gray-600 text-sm">
                    <tr className="border-t hover:bg-blue-50 transition">
                      <th className="p-3 w-10">
                        <input
                          type="checkbox"
                          checked={selectedProducts.length === paginatedProducts.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedProducts(paginatedProducts.map((p) => p.id));
                            } else {
                              setSelectedProducts([]);
                            }
                          }}
                        />
                      </th>
                      <th className="p-3 text-left">Product Code</th>
                      <th className="p-3 text-left">Product Name</th>
                      <th className="p-3 text-right">Price</th>
                    </tr>
                  </thead>

                  <tbody>

                    {paginatedProducts.map((p) => (
                      <tr
                        key={p.id}
                        className="border-t hover:bg-blue-50 transition"
                      >

                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={selectedProducts.includes(p.id)}
                            onChange={() => toggleProduct(p.id)}
                          />
                        </td>

                        <td className="p-3 font-medium text-gray-700">
                          {p.product_code}
                        </td>

                        <td className="p-3 text-gray-600">
                          {p.product_name}
                        </td>

                        <td className="p-3 text-right font-semibold">
                          {p.base_price}
                        </td>

                      </tr>
                    ))}

                  </tbody>

                </table>

              </div>

              {/* Pagination */}
              <div className="flex justify-between items-center px-6 py-4 bg-gray-50 border-t">

                {/* Left Side Info */}
                <p className="text-sm text-gray-500">
                  Showing {filteredProducts.length} of {filteredProducts.length} items
                </p>

                {/* Pagination */}
                <div className="flex justify-between items-center px-6 py-4 bg-gray-50 border-t">

                  <div className="flex items-center gap-1">
                    <button
                      disabled={popupCurrentPage === 1}
                      onClick={() => setPopupCurrentPage(c => c - 1)}
                      className="px-3 py-1 text-sm border rounded bg-white disabled:opacity-50 hover:bg-gray-100"
                    >
                      Prev
                    </button>

                    {/* Logic to show numbers in between */}
                    {Array.from({ length: Math.ceil(filteredProducts.length / popupItemsPerPage) }, (_, i) => (
                      <button
                        key={i + 1}
                        onClick={() => setPopupCurrentPage(i + 1)}
                        className={`px-3 py-1 text-sm border rounded transition-colors ${popupCurrentPage === i + 1
                          ? "bg-[var(--color-blue-500)] text-white border-indigo-600"
                          : "bg-white text-gray-600 hover:bg-gray-100"
                          }`}
                      >
                        {i + 1}
                      </button>
                    ))}

                    <button
                      disabled={popupCurrentPage >= Math.ceil(filteredProducts.length / popupItemsPerPage)}
                      onClick={() => setPopupCurrentPage(c => c + 1)}
                      className="px-3 py-1 text-sm border rounded bg-white disabled:opacity-50 hover:bg-gray-100"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 px-6 py-3 border-t bg-gray-50">
                <button
                  onClick={closePopup}
                  className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                disabled={!isEditable}
                  onClick={() => {
    if (!isEditable) return;
    addSelectedProducts();
  }}
                  className={`px-4 py-2 rounded-md text-white ${
    !isEditable ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
  }`}
                >
                  Add Selected
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>


  );
}
