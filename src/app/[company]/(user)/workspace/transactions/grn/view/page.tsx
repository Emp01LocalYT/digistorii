"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTenant } from "@/context/TenantContext";
import { useReactToPrint } from "react-to-print";
import PrintGRN from "@/components/PrintGRN";

type GrnHeader = {
  id?: number;
  grn_no: string;
  grn_date: string;
  purchase_no: string;
  purchase_id: string;
  supplier_id: string;
  supplier_code: string;
  supplier_name: string;
  supplier_email: string;
  supplier_phone: string;
  supplier_address: string;
  status: string;
  po_status: string;
  user_name?: string;
};

type GrnDetail = {
  id?: number;
  product_id: string;
  product_code?: string;
  product_name?: string;
  description: string;
  uom: string,
  uom_code: string;
  uom_name: string;
  hsn_no: string;
  order_qty: number | string;
  received_qty?: number | string;
  qty: number | string;
};

export default function GRNView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const grnId = searchParams.get("id");
  const { company } = useTenant();
  const [header, setHeader] = useState<GrnHeader | null>(null);
  const [details, setDetails] = useState<GrnDetail[]>([]);
  const [loading, setLoading] = useState(true);

  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: header?.grn_no || "GRN",
  });

  const currency = (n: number) =>
    Number(n || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
    });

  const hasLoggedTenant = useRef(false);
  useEffect(() => {
    if (!company || hasLoggedTenant.current) return;
    hasLoggedTenant.current = true;
    console.log("Tenant:", company);
  }, [company]);

  const hasFetched = useRef(false);
  useEffect(() => {
    if (!grnId || !company || hasFetched.current) return;
    hasFetched.current = true;
    const fetchGRN = async () => {
      try {
        const res = await fetch(`/api/grn/${grnId}`, {
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

    fetchGRN();
  }, [grnId, company]);

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
        GRN record not found
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-10">

      {/* PAGE HEADER */}

      <div className="flex justify-between items-center mb-10">

        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            GRN Details
          </h1>

          <p className="text-gray-500 text-sm">
            Complete supplier grn information
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => router.push(`/${company}/transactions/grn`)}
            className="bg-[var(--color-blue-600)] text-white px-5 py-2 rounded-lg shadow hover:opacity-90 transition"
          >
            Back
          </button>
          <button
            onClick={handlePrint}
            className="bg-[var(--color-blue-600)] text-white px-5 py-2 rounded-lg shadow hover:opacity-90 transition"
          >
            Print / PDF
          </button>

        </div>

      </div>

      {/* TOP CARDS */}

      <div className="grid lg:grid-cols-3 gap-8 mb-8">

        {/* SUPPLIER CARD */}

        <div className="bg-white rounded-2xl shadow-md border p-6">

          <h3 className="text-sm text-gray-500 mb-3">
            Supplier
          </h3>

          <div className="flex items-center gap-4">
            <div>
              <p className="font-semibold text-gray-800">
                {header.supplier_code}-{header.supplier_name}
              </p>
              <p className="text-sm text-gray-500">
                {header.supplier_email}
              </p>
              <p className="text-sm text-gray-500">
                {header.supplier_phone}
              </p>
              <p className="text-sm text-gray-500">
                {header.supplier_address}
              </p>
            </div>

          </div>

        </div>

        {/* INVOICE INFO */}

        <div className="bg-white rounded-2xl shadow-md border p-6">

          <h3 className="text-sm text-gray-500 mb-3">
            Grn Info
          </h3>

          <div className="space-y-2 text-sm">

            <div className="flex justify-between">
              <span>GRN No</span>
              <span className="font-semibold text-indigo-600">
                {header.grn_no}
              </span>
            </div>
            <div className="flex justify-between">
              <span>GRN Date</span>
              <span>{formatDate(header.grn_date)}</span>
            </div>
            <div className="flex justify-between">
              <span>PO No</span>
              <span>{header.purchase_no}</span>
            </div>
            <div className="flex justify-between">
              <span>Status</span>
              <span>{header.po_status}</span>
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
              <th className="p-4 text-center">Order Qty</th>
              <th className="p-4 text-center">Received Qty</th>
              <th className="p-4 text-center">Qty</th>
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
                <td className="p-4">
                  {row.description}
                </td>
                <td className="p-4">
                  {row.uom_code}
                </td>
                <td className="p-4">
                  {row.hsn_no}
                </td>
                <td className="p-4 text-center">
                  {Number(row.order_qty)}
                </td>
                <td className="p-4 text-center">
                  {Number(row.received_qty)}
                </td>
                <td className="p-4 text-center">
                  {Number(row.qty)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: "none" }}>
        <PrintGRN
          ref={printRef}
          header={header}
          details={details}
        />
      </div>

    </div>
  );
}