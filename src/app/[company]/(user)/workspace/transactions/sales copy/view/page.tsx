"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTenant } from "@/context/TenantContext";
import { useReactToPrint } from "react-to-print";
// import PrintBillingInvoice from "@/components/PrintBillingInvoice";

type BillingDetail = {
  id?: number;
  product_id: string;
  product_code?: string;
  product_name?: string;
  uom:string;
  rate: number;
  qty: number;
  discount: number;
  tax_percent: number;
  tax_amount: number;
  line_total: number;
};

type BillingHeader = {
  id?: number;
  sales_no: string;
  customer_id: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;
  sales_date: string;
  payment_status: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
};

export default function BillingView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const billId = searchParams.get("id");
  const { company } = useTenant();
  const [header, setHeader] = useState<BillingHeader | null>(null);
  const [details, setDetails] = useState<BillingDetail[]>([]);
  const [loading, setLoading] = useState(true);

  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: header?.sales_no || "Billing",
  });

  const currency = (n: number) =>
    Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });

  useEffect(() => {
    const fetchBilling = async () => {
      if (!billId || !company) return;

      try {
        const res = await fetch(`/api/sales/${billId}`, {
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

    fetchBilling();
  }, [billId, company]);

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
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!header) {
    return (
      <div className="p-10 text-center text-red-500">
        Billing record not found
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-10">

      {/* PAGE HEADER */}
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Billing Details</h1>
          <p className="text-gray-500 text-sm">
            Complete customer billing information
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => router.push(`/${company}/workspace/transactions/sales`)}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg shadow hover:bg-blue-700 transition"
          >
            Back
          </button>
          <button
            onClick={handlePrint}
            className="bg-[var(--color-blue-500)] text-white px-5 py-2 rounded-lg shadow hover:opacity-90 transition"
          >
            Print / PDF
          </button>
        </div>
      </div>

      {/* INVOICE CARD */}
      <div className="grid lg:grid-cols-3 gap-8 mb-8">

        {/* CUSTOMER CARD */}
        <div className="bg-white rounded-2xl shadow-md p-6 border">
          <h3 className="text-sm text-gray-500 mb-3">Customer</h3>

          <div className="flex items-center gap-4">
            <div>
              <p className="font-semibold text-gray-800">
                {header.customer_name}
              </p>
              <p className="text-sm text-gray-500">
                {header.customer_email}
              </p>
              <p className="text-sm text-gray-500">
                {header.customer_phone}
              </p>
              <p className="text-sm text-gray-500">
                {header.customer_address}
              </p>
            </div>
          </div>
        </div>

        {/* INVOICE INFO */}
        <div className="bg-white rounded-2xl shadow-md p-6 border">
          <h3 className="text-sm text-gray-500 mb-3">Billing Info</h3>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Bill No</span>
              <span className="font-semibold text-blue-600">
                {header.sales_no}
              </span>
            </div>

            <div className="flex justify-between">
              <span>Bill Date</span>
              <span>{formatDate(header.sales_date)}</span>
            </div>

            {/* <div className="flex justify-between">
              <span>Status</span>

              <span
                className={`px-2 py-1 text-sm rounded-full ${
                  header.payment_status === "Paid"
                    ? "bg-green-100 text-green-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {header.payment_status}
              </span>
            </div> */}
          </div>
        </div>

        {/* TOTAL CARD */}
        {/* <div className="bg-[var(--color-blue-500)] bg-gradient-to-r to-blue-600 text-white rounded-2xl shadow-lg p-6"> */}
        <div className="bg-white rounded-2xl shadow-md border p-6">
          <h3 className="text-sm opacity-80 font-bold mb-3">Total Amount</h3>

          <p className="text-3xl font-bold mb-2">
            ₹ {currency(header.total_amount)}
          </p>

          <p className="text-sm opacity-80">
            Including taxes & discounts
          </p>
        </div>

      </div>

      {/* PRODUCT TABLE */}
      <div className="bg-white rounded-2xl shadow-md border overflow-hidden mb-10">

        <table className="w-full text-sm">

          <thead className="bg-gray-100 text-gray-600 text-sm">
            <tr>
              <th className="p-4 text-left">S.No</th>
              <th className="p-4 text-left">Service</th>
              <th className="p-4 text-left">UOM</th>
              <th className="p-4 text-right">Unit Price</th>
              <th className="p-4 text-right">Qty</th>
              <th className="p-4 text-right">Amount</th>
              <th className="p-4 text-right">Discount</th>
              <th className="p-4 text-right">Tax %</th>
              <th className="p-4 text-right">Tax Amount</th>
              <th className="p-4 text-right">Total</th>
            </tr>
          </thead>

          <tbody>
            {details.map((row, idx) => (
              <tr
                key={idx}
                className="border-t hover:bg-gray-50 transition"
              >
                <td className="p-4">{idx + 1}</td>
                <td className="p-4">
                  <div className="font-medium">{row.product_name}</div>
                  <div className="text-sm text-gray-400">
                    {row.product_code}
                  </div>
                </td>
                  <td className="p-4">
                  {row.uom}
                </td>
                <td className="p-4 text-right">
                  {/* ₹ {currency(row.rate)} */}
                  {row.rate}
                </td>
                <td className="p-4 text-right">{Number(row.qty)}</td>
                 <td className="p-4 text-right">
                  ₹ {currency(row.qty * row.rate)}
                </td>

                <td className="p-4 text-right">
                  {row.discount}
                </td>

                <td className="p-4 text-right">
                  {row.tax_percent}%
                </td>
                <td className="p-4 text-right">
                  ₹ {currency(row.tax_amount)}
                </td>

                <td className="p-4 text-right font-semibold text-blue-600">
                  ₹ {currency(row.line_total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* TOTAL SUMMARY */}
      <div className="flex justify-end">

        <div className="bg-white rounded-2xl shadow-lg border p-6 w-96">

          <h3 className="font-semibold text-lg mb-4">
            Billing Summary
          </h3>

          <div className="space-y-3 text-sm">

            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>₹ {currency(header.subtotal)}</span>
            </div>

            <div className="flex justify-between">
              <span>Tax</span>
              <span>₹ {currency(header.tax_amount)}</span>
            </div>

            <div className="border-t pt-3 flex justify-between text-lg font-bold text-blue-600">
              <span>Total</span>
              <span>₹ {currency(header.total_amount)}</span>
            </div>

          </div>
        </div>
      </div>

      {/* <div style={{ display: "none" }}>
        <PrintBillingInvoice
          ref={printRef}
          header={header}
          details={details}
        />
      </div> */}
    </div>
  );
}