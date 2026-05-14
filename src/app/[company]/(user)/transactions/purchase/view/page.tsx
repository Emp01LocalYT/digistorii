"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTenant } from "@/context/TenantContext";
import { useReactToPrint } from "react-to-print";
import PrintPurchaseInvoice from "@/components/PrintPurchaseInvoice";

type PurchaseDetail = {
  id?: number;
  product_id: string;
  product_code?: string;
  product_name?: string;
  description: string;
  uom: string;
  uom_code: string;
  uom_name:string;
  hsn_no: string;
  rate: number;
  qty: number;
  tax_id: number | null;
  tax_name: string;
  tax_percent: number;
  tax_amount: number;
  line_total: number;
};

type PurchaseHeader = {
  id?: number;
  po_type?: string;
  purchase_no: string;
  ref_no:string,
  supplier_id: string;
  supplier_code: string;
  supplier_name?: string;
  supplier_email?: string;
  supplier_phone?: string;
  supplier_address?: string;
  bill_to?: string;
  ship_to?: string;
  bill_to_code?: string;
  bill_to_name?: string;
  bill_to_address?: string;
  ship_to_code?: string;
  ship_to_name?: string;
  ship_to_address?: string;
  despatch_terms?: string;
  despatch_terms_name?: string;
  payment_terms?: string;
  payment_terms_name?: string;
  freight_charges?: number;
  freight_tax?: number;
  freight_tax_amount?: number;
  packaging_amount?: number;
  notes?: string;
  attachment_url?: string;
  purchase_date: string;
  req_date: string;
  currency: string;
  currency_code?: string;
  conversion_rate?: number | "";
  status: string;
  approval_status?: string;
  renewed_from_po_id?: number | null;
  renewed_from_purchase_no?: string | null;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
};

export default function PurchaseView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const purchaseId = searchParams.get("id");
  const { company } = useTenant();
  const [header, setHeader] = useState<PurchaseHeader | null>(null);
  const [details, setDetails] = useState<PurchaseDetail[]>([]);
  const [loading, setLoading] = useState(true);

  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: header?.purchase_no || "Purchase",
  });

  const currency = (n: number) =>
    Number(n || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
    });
  const itemsSubtotal = Number(header?.subtotal || 0);
  const productTax = Number(header?.tax_amount || 0);
  const freightBase = Number(header?.freight_charges || 0);
  const freightTaxAmount = Number(header?.freight_tax_amount || 0);
  const packagingAmount = Number(header?.packaging_amount || 0);
  const extraChargesTotal = freightBase + freightTaxAmount + packagingAmount;
  const grandTotal = Number(header?.total_amount || 0);

  useEffect(() => {
    const fetchPurchase = async () => {
      if (!purchaseId || !company) return;

      try {
        const res = await fetch(`/api/purchase/${purchaseId}`, {
          headers: { "x-tenant": company },
        });

        const data = await res.json();

        if (data.success) {
          setHeader(data.data.header);
          setDetails(data.data.details);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPurchase();
  }, [purchaseId, company]);

  const handleRenew = () => {
    if (!purchaseId || !company) return;
    router.push(`/${company}/transactions/purchase/add?renewFrom=${purchaseId}`);
  };

  const formatDate = (date: string) => {
    if (!date) return "";
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();

    return `${day}-${month}-${year}`;
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!header) {
    return (
      <div className="p-10 text-center text-red-500">
        Purchase record not found
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-10">

      {/* PAGE HEADER */}

      <div className="flex justify-between items-center mb-10">

        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            Purchase Details
          </h1>

          <p className="text-gray-500 text-sm">
            Complete supplier purchase information
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => router.push(`/${company}/transactions/purchase`)}
            className="bg-[var(--color-blue-500)] text-white px-5 py-2 rounded-lg shadow hover:opacity-90 transition"
          >
            Back
          </button>
          <button
            onClick={handlePrint}
            className="bg-[var(--color-blue-500)] text-white px-5 py-2 rounded-lg shadow hover:opacity-90 transition"
          >
            Print / PDF
          </button>
          {String(header.status || "").toLowerCase() === "rejected" && (
            <button
              type="button"
              onClick={handleRenew}
              className="bg-[var(--color-blue-600)] text-white px-5 py-2 rounded-lg shadow hover:opacity-90 transition"
            >
              Renew
            </button>
          )}

        </div>

      </div>
      {header.renewed_from_po_id && (
        <div className="mb-6 text-sm text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2 inline-block">
          Renewed from PO: {header.renewed_from_purchase_no || header.renewed_from_po_id}
        </div>
      )}

      {/* TOP CARDS */}

      <div className="grid lg:grid-cols-3 gap-8 mb-8">

        {/* SUPPLIER CARD */}

<div className="bg-white rounded-2xl shadow-md border p-6 space-y-2">

  {/* Supplier */}
  <div>
    <h3 className="text-sm text-gray-500 mb-3">Supplier</h3>

    <p className="font-semibold text-gray-800">
      {header.supplier_code}-{header.supplier_name}
    </p>
      <p className="text-sm text-gray-500">{header.ref_no}</p>
    <p className="text-sm text-gray-500">{header.supplier_email}</p>
    <p className="text-sm text-gray-500">{header.supplier_phone}</p>
  </div>

  {/* Bill To & Ship To */}
  <div className="grid md:grid-cols-2 gap-6">

    <div>
      <p className="font-semibold text-gray-700">Bill To</p>
      <p className="text-sm text-gray-500 mt-1">
        {header.bill_to_address || "-"}
      </p>
    </div>

    <div>
      <p className="font-semibold text-gray-700">Ship To</p>
      <p className="text-sm text-gray-500 mt-1">
        {header.ship_to_address || "-"}
      </p>
    </div>

  </div>

  {/* Notes */}
  <div>
    <p className="font-semibold text-gray-700">Notes</p>
    <p className="text-sm text-gray-500 mt-1">
      {header.notes || "-"}
    </p>
  </div>

  {/* Attachment */}
  <div>
    <p className="font-semibold text-gray-700">Attachment</p>
    {header.attachment_url ? (
      <a
        href={header.attachment_url}
        target="_blank"
        rel="noreferrer"
        className="text-indigo-600 underline text-sm mt-1 inline-block"
      >
        View attachment
      </a>
    ) : (
      <p className="text-sm text-gray-500 mt-1">-</p>
    )}
  </div>

</div>
        {/* INVOICE INFO */}

        <div className="bg-white rounded-2xl shadow-md border p-6">

          <h3 className="text-sm text-gray-500 mb-3">
            Supplier Info
          </h3>

          <div className="space-y-2 text-sm">

            <div className="flex justify-between">
              <span>PO No</span>
              <span className="font-semibold text-indigo-600">
                {header.purchase_no}
              </span>
            </div>
            <div className="flex justify-between">
              <span>PO Date</span>
              <span>{formatDate(header.purchase_date)}</span>
            </div>
            <div className="flex justify-between">
              <span>Req Date</span>
              <span>{formatDate(header.req_date)}</span>
            </div>
            <div className="flex justify-between">
              <span>Currency</span>
              <span>{header.currency_code || header.currency}</span>
            </div>
            <div className="flex justify-between">
            <span>Despatch Terms:</span> {header.despatch_terms_name || header.despatch_terms || "-"}
          </div>
          <div className="flex justify-between">
            <span>Payment Terms:</span> {header.payment_terms_name || header.payment_terms || "-"}
          </div>
          </div>
        </div>

        {/* TOTAL CARD */}
        <div className="bg-white rounded-2xl shadow-md border p-6">
          <h3 className="text-sm opacity-80 font-bold mb-3">
            Total Purchase
          </h3>
          <div className="text-sm text-gray-700 space-y-2">
            <div className="flex justify-between">
              <span>Items Total</span>
              <span>₹ {currency(itemsSubtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Product Tax (GST)</span>
              <span>₹ {currency(productTax)}</span>
            </div>
            <div className="border-t pt-3 mt-2 space-y-2">
              <div className="flex justify-between">
                <span>Freight</span>
                <span>₹ {currency(freightBase)}</span>
              </div>
              <div className="flex justify-between">
                <span>Freight Tax</span>
                <span>₹ {currency(freightTaxAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Packaging</span>
                <span>₹ {currency(packagingAmount)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Extra Charges Total</span>
                <span>₹ {currency(extraChargesTotal)}</span>
              </div>
            </div>
            <div className="border-t pt-3 flex justify-between text-lg font-bold text-indigo-600">
              <span>Grand Total</span>
              <span>₹ {currency(grandTotal)}</span>
            </div>
          </div>
        </div>

      </div>

      {/* PRODUCT TABLE */}
      <div className="bg-white rounded-2xl shadow-md border overflow-hidden mb-10">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-gray-600 text-sm">
            <tr>
              <th className="p-3">S.No</th>
              <th className="p-4 text-left">Product</th>
              <th className="p-4 text-left">Description</th>
              <th className="p-4 text-left">UOM</th>
              <th className="p-4 text-left">HSN No</th>
              <th className="p-4 text-right">Unit Price</th>
              <th className="p-4 text-right">Qty</th>
              <th className="p-4 text-right">Amount</th>
              <th className="p-4 text-center">Tax Group</th>
              <th className="p-4 text-right">Tax Amount</th>
              <th className="p-4 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {details.map((row, index) => (
              <tr
                key={index}
                className="border-t hover:bg-gray-50 transition"
              >
                <td className="p-3 text-center">
                  {index + 1}
                </td>
                <td className="p-4">
                  <div className="font-medium">
                    {row.product_name}
                  </div>
                  <div className="text-sm text-gray-400">
                    {row.product_code}
                  </div>
                </td>
                <td className="p-4">{row.description}</td>
                <td className="p-4">
                  {row.uom_code}
                </td>
                <td className="p-4">
                  {row.hsn_no}
                </td>
                <td className="p-4 text-right">
                  {row.rate}
                </td>
                <td className="p-4 text-right">
                  {Number(row.qty)}
                </td>
                <td className="p-4 text-right">
                  ₹ {currency(row.qty * row.rate)}
                </td>
                <td className="p-4 text-center">
                  {row.tax_name}
                </td>
                <td className="p-4 text-right">
                  ₹ {currency(row.tax_amount)}
                </td>
                <td className="p-4 text-right font-semibold text-indigo-600">
                  ₹ {currency(row.line_total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>


      {/* ORDER SUMMARY */}
      {/* <div className="flex justify-end">
        <div className="bg-white rounded-2xl shadow-lg border p-6 w-96">
          <h3 className="font-semibold text-lg mb-4">
            Purchase Summary
          </h3>
          <div className="space-y-3 text-sm text-gray-700">
            <div className="flex justify-between">
              <span>Items Total</span>
              <span>₹ {currency(itemsSubtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Product Tax (GST)</span>
              <span>₹ {currency(productTax)}</span>
            </div>
             <div className="flex justify-between ">
                <span>Extra Charges Total</span>
                <span>₹ {currency(extraChargesTotal)}</span>
              </div>
            <div className="border-t pt-3 flex justify-between text-lg font-bold text-indigo-600">
              <span>Grand Total</span>
              <span>₹ {currency(grandTotal)}</span>
            </div>
          </div>
        </div>
      </div> */}

      <div style={{ display: "none" }}>
        <PrintPurchaseInvoice
          ref={printRef}
          header={header}
          details={details}
        />
      </div>

    </div>
  );
}



