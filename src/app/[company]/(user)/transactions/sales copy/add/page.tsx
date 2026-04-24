"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useTenant } from "@/context/TenantContext";
import { useUser } from "@/context/CurrentUserContext";

type SalesDetail = {
  id?: number;
  product_id: string;
  product_name?: string;
  uom:string;
  rate: number;
  qty: number;
  amount?: number;
  discount: number;
  tax_percent: number;
  tax_amount: number;
  line_total: number;
};

type SalesHeader = {
  id?: number;
  sales_no: string;
  customer_id: string;
  invoice_date: string;
  sales_date: string;
  status: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  user_name?: string;
};

type Product = {
  id: number;
  product_id?: number;
  variant_id?: number | null;
  product_code: string;
  product_name: string;
  base_price?: number;
  tax_rate?: number;
  discount_amount?: number;
};

type Customer = {
  id: number;
  name: string;
};

export default function SalesForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const salesId = searchParams.get("id"); // edit id
  const isEdit = Boolean(salesId);
  const { company } = useTenant();
  console.log("company:", company); 
  const { user } = useUser();
  console.log("User Name : ", user?.name)
  // const company =
  //   typeof window !== "undefined"
  //     ? localStorage.getItem("company") || ""
  //     : "";

  const initialHeader: SalesHeader = {
    sales_no: "",
    customer_id: "",
    invoice_date: "",
    sales_date: new Date().toISOString().split("T")[0],
    status: "Entered",
    subtotal: 0,
    tax_amount: 0,
    total_amount: 0,
    user_name: "",
  };

  const initialDetail: SalesDetail = {
    product_id: "",
    uom:"KG",
    rate: 0,
    qty: 1,
    discount: 0,
    tax_percent: 0,
    tax_amount: 0,
    line_total: 0,
  };

  const [header, setHeader] = useState<SalesHeader>(initialHeader);
  const [details, setDetails] = useState<SalesDetail[]>([initialDetail]);
  const [errors, setErrors] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [allTaxes, setAllTaxes] = useState<any[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);


  useEffect(() => {
    const fetchCustomers = async () => {
      if (!company) return;

      try {
        const res = await fetch("/api/customers", {
          headers: {
            "x-tenant": company
          }
        });

        const data = await res.json();

        if (data.success) {
          console.log("Fetched Customers:", data.data);
          setAllCustomers(data.data);
        }

      } catch (err) {
        console.error("Customer fetch error", err);
      }
    };

    fetchCustomers();
  }, [company]);

  // ------------------------------------------
  // Load Sales For Edit
  // ------------------------------------------

  useEffect(() => {

    const fetchSales = async () => {

      if (!salesId || !company) return;
      console.log("Fetching sales with ID:", salesId);
      try {

        const res = await fetch(`/api/sales/${salesId}`, {
          headers: {
            "x-tenant": company,
          },
        });

        const data = await res.json();

        if (data.success) {

          setHeader(data.data.header);
          const detailsData = data.data.details.map((row: any) => {

          const amount = row.qty * row.rate;

          return {
            ...row,
            amount
          };

        });
          setDetails(detailsData);

        }

      } catch (err) {
        console.error(err);
      }

    };

    fetchSales();

  }, [salesId, company]);

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
        const rows = Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
            ? data.data
            : Array.isArray(data?.products)
              ? data.products
              : [];

        // Normalize to product-variant rows (prefer variant_id as the selectable id)
        const normalized: Product[] = rows
          .map((row: any) => {
            const variantId = Number(row?.variant_id ?? row?.id);
            const productId = Number(row?.product_id ?? row?.id);
            const productCode = String(row?.product_code || "");
            const productName = String(row?.product_name || row?.name || "");
            const id = Number.isFinite(variantId) && variantId > 0 ? variantId : productId;
            if (!Number.isFinite(id) || id <= 0) return null;
            return {
              id,
              variant_id: Number.isFinite(variantId) ? variantId : null,
              product_id: Number.isFinite(productId) ? productId : undefined,
              product_code: productCode,
              product_name: productName,
              base_price: Number(row?.base_price ?? row?.unit_price ?? 0),
              tax_rate: Number(row?.tax_rate ?? row?.tax_percent ?? 0),
              discount_amount: Number(row?.discount_amount ?? 0),
            };
          })
          .filter((item: any): item is Product => Boolean(item));

        console.log("Fetched Products (normalized):", normalized);
        setAllProducts(normalized);
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
        const res = await fetch(`/api/tax`, {
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

  // const generateSalesNo = () => {
  //   const datePart = new Date().toISOString().split("T")[0].replaceAll("-", "");
  //   console.log("Generated Sales No:", `SAL-${datePart}-XXXX`);
  //   const randomPart = Math.floor(Math.random() * 9000 + 1000);
  //   console.log("Generated Random Part:", randomPart);
  //   return `SAL-${datePart}-${randomPart}`;
  // };

  useEffect(() => {
    const fetchSalesNo = async () => {
      try {
        const res = await fetch("/api/sales/generateNo", { headers: { "x-tenant": company } });
        const data = await res.json();
        if (data.success) setHeader(prev => ({ ...prev, sales_no: data.sales_no }));
      } catch (err) {
        console.error("Failed to fetch sales number", err);
      }
    };
    fetchSalesNo();
  }, []);

  const calculateLine = (row: SalesDetail) => {
    const gross = row.qty * row.rate;
    const afterDiscount = gross - row.discount;
    const taxAmount = (afterDiscount * row.tax_percent) / 100;
    const total = afterDiscount + taxAmount;
    return {
      ...row,
      amount: Number(gross.toFixed(2)),
      tax_amount: Number(taxAmount.toFixed(2)),
      line_total: Number(total.toFixed(2)),
    };
  };

  useEffect(() => {
    const subtotal = details.reduce(
      (sum, d) => sum + Number(d.qty) * Number(d.rate) - Number(d.discount || 0),
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
        // Lookup Tax Master
        // const taxMaster = allTaxes.find((t) => t.id === selected.tax_master_id);
        // console.log("Found Tax Master:", taxMaster);
        //   updated[index].tax_percent = taxMaster ? Number(taxMaster.total_percentage) : 0;
        updated[index].tax_percent = selected.tax_rate || 0;
        updated[index].discount = selected.discount_amount || 0;
      } else {
        updated[index].product_name = "";
        updated[index].rate = 0;
        updated[index].tax_percent = 0;
      }
    } else {
      updated[index] = calculateLine({ ...updated[index], [field]: Number(value) });
    }

    updated[index] = calculateLine(updated[index]);
    setDetails(updated);
  };

  const addRow = () => setDetails([...details, initialDetail]);
  const removeRow = (index: number) => setDetails(details.filter((_, i) => i !== index));

  const validate = () => {
    const newErrors: any = {};
    if (!header.sales_no.trim()) newErrors.sales_no = "Bill No required";
    if (!header.customer_id) newErrors.customer_id = "Customer required";
    if (!header.sales_date) newErrors.sales_date = "Bill date required";
    if (header.total_amount <= 0)
      newErrors.total_amount = "Total amount must be greater than 0";

    if (details.length === 0) {
      newErrors.details = "At least one service row is required";
    } else {
      details.forEach((d, index) => {
        if (!d.product_id) newErrors[`product_${index}`] = "Service Id required";
        if (d.qty <= 0) newErrors[`qty_${index}`] = "Qty must be > 0";
        if (d.rate <= 0) newErrors[`rate_${index}`] = "Rate must be > 0";
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
      const url = salesId
        ? `/api/sales/${salesId}`
        : "/api/sales";

      const method = salesId ? "PUT" : "POST";
      const res = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          "x-tenant": company,
        },
        // body: JSON.stringify({ header, details }),
        body: JSON.stringify({
          header: { ...header, user_name: user?.name },
          details
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to save sales");
      router.push(`/${company}/transactions/sales`);
    } catch (err: any) {
      console.error("Save Sales Error:", err);
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {loading &&
        createPortal(
          <div className="fixed inset-0 z-[99999] bg-black/20 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-white p-8 rounded-xl shadow-2xl flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-700 font-semibold text-lg">{isEdit ? "Updating Billing..." : "Saving Billing..."}</p>
            </div>
          </div>,
          document.body
        )
      }
      {errorMessage && (
        <div className="text-red-600 font-semibold">{errorMessage}</div>
      )}

      <h1 className="text-2xl font-bold">
        {isEdit ? "Edit Billing" : "Create Billing"}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Header */}
        <div className="bg-white p-6 rounded-xl shadow grid md:grid-cols-4 gap-4">

          <div>
            {/* <label className="text-sm font-semibold mb-1 block">Sales No</label> */}
            <label className="text-sm font-semibold mb-1 block">Bill No<span className="text-red-500">*</span></label>
            <input
              value={header.sales_no}
              onChange={(e) => setHeader({ ...header, sales_no: e.target.value })}
              className="border p-2 rounded w-full bg-gray-100 text-indigo-600 font-semibold"
              readOnly
            />
            {errors.sales_no && (
              <p className="text-red-500 text-sm mt-1">{errors.sales_no}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-semibold mb-1 block">Customer Id<span className="text-red-500">*</span></label>
            {/* <input
              value={header.customer_id}
              onChange={(e) => setHeader({ ...header, customer_id: e.target.value })}
              className={`border p-2 rounded w-full ${errors.customer_id ? "border-red-500" : ""}`}
            />
            {errors.customer_id && (
              <p className="text-red-500 text-sm mt-1">{errors.customer_id}</p>
            )} */}
            <select
              value={header.customer_id ?? ""}
              onChange={(e) =>
                setHeader({
                  ...header,
                  customer_id: e.target.value,
                })
              }
              className={`border p-2 rounded w-full ${errors.customer_id ? "border-red-500" : ""}
                }`}
            >
              <option value="">Select Customer</option>

              {allCustomers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {errors.customer_id && (
              <p className="text-red-500 text-sm mt-1">{errors.customer_id}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-semibold mb-1 block">Bill Date<span className="text-red-500">*</span></label>
            <input
              type="date"
              value={header.sales_date}
              min={new Date().toISOString().split("T")[0]}   // prevent past date
              onChange={(e) => setHeader({ ...header, sales_date: e.target.value })}
              className={`border p-2 rounded w-full ${errors.sales_date ? "border-red-500" : ""}`}
            />
            {errors.sales_date && (
              <p className="text-red-500 text-sm mt-1">{errors.sales_date}</p>
            )}
          </div>

        </div>

        {/* Details Table */}
        <div className="bg-white rounded-xl shadow overflow-x-auto">

          {errors.details && (
            <p className="text-red-500 text-sm mt-1 px-4">{errors.details}</p>
          )}

          <table className="w-full text-sm table-auto border-separate border-spacing-0">
            <thead className="bg-gray-50 text-sm">
              <tr>
                <th className="p-3 text-sm text-left">Service Id</th>
                <th className="p-3 text-sm text-left">Service Name</th>
                <th className="p-3 text-sm">UOM</th>
                <th className="p-3 text-sm">Unit Price</th>
                <th className="p-3 text-sm">Qty</th>
                <th className="p-3 text-sm">Amount</th>
                <th className="p-3 text-sm">Discount</th>
                <th className="p-3 text-sm">Tax %</th>
                <th className="p-3 text-sm">Tax Amt</th>
                <th className="p-3 text-sm">Total</th>
                <th className="p-3"></th>
              </tr>
            </thead>

            <tbody>
              {details.map((row, index) => (
                <tr key={index} className="border-t hover:bg-gray-50">

                  <td className="p-2">
                    <select
                      value={row.product_id}
                      onChange={(e) => updateRow(index, "product_id", e.target.value)}
                      className={`border p-1 rounded w-32 ${errors[`product_${index}`] ? "border-red-500" : ""}`}
                    >
                      <option value="">Select Product</option>
                      {allProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.product_code} - {p.product_name}
                        </option>
                      ))}
                    </select>
                    {errors[`product_${index}`] && (
                      <p className="text-red-500 text-sm mt-1">{errors[`product_${index}`]}</p>
                    )}
                  </td>
                  <td className="p-2">
                    <div className="text-gray-700">{row.product_name}</div>
                  </td>
                  <td className="p-2">
                    <div className="text-gray-700">{row.uom}</div>
                  </td>
                  <td className="text-right">
                    <input
                      type="number"
                      // value={Number(row.rate).toFixed(2)}
                      value={Number(row.rate)}
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
                      // value={Number(row.qty).toFixed(2)}
                      value={Number(row.qty)}
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
                  <td className="text-right"><input type="number" value={Number(row.discount || 0)} onChange={(e) => updateRow(index, "discount", e.target.value)} className="border p-1 rounded w-20" /></td>
                  <td className="text-right"><input type="number" value={Number(row.tax_percent)} onChange={(e) => updateRow(index, "tax_percent", e.target.value)} className="border p-1 rounded w-20" /></td>
                  <td className="text-right">{Number(row.tax_amount || 0).toFixed(2)}</td>
                  <td className="text-right">{Number(row.line_total || 0).toFixed(2)}</td>

                  <td className="p-2 flex justify-center items-center">
                    <button type="button" onClick={() => removeRow(index)} className="text-red-600 hover:text-red-800">
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>

          <div className="p-4">
            <button type="button" onClick={addRow} className="flex items-center gap-2 text-indigo-600 hover:underline">
              <PlusIcon className="w-4 h-4" /> Add Row
            </button>
          </div>
        </div>

        {/* Totals */}
        <div className="bg-white p-6 rounded-xl shadow flex justify-end">
          <div className="w-80 space-y-2 text-right">
            <div className="flex justify-between"><span>Subtotal</span><span>{Number(header.subtotal || 0).toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Tax</span><span>{Number(header.tax_amount || 0).toFixed(2)}</span></div>
            <div className="flex justify-between font-bold text-lg"><span>Total</span><span>{Number(header.total_amount || 0).toFixed(2)}</span></div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-4">
          <button type="button" onClick={() => router.push(`/${company}/transactions/sales`)} className="bg-gray-300 px-6 py-2 rounded hover:bg-gray-400">Cancel</button>
          <button className="bg-[var(--color-blue-500)] text-white px-6 py-2 rounded hover:opacity-90">{isEdit ? "Update Billing" : "Save Billing"}</button>
        </div>

      </form>
    </div>
  );
}
