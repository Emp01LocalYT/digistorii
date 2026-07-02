"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTenant } from "@/context/TenantContext";
import { useUser } from "@/context/CurrentUserContext";
import { createPortal } from "react-dom";
import { apiFetch } from "@/lib/apiFetch";

export default function PurchaseApprovalDetail() {


  const router = useRouter();
  const params = useParams();
  const id = params?.id;
  console.log("PurchaseApprovalDetail Id : ", id);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [allUoms, setAllUoms] = useState<any[]>([]);



  const { company } = useTenant();
  const { user } = useUser();
  const hasLoggedId = useRef(false);
  useEffect(() => {
    if (!id || hasLoggedId.current) return;
 
    hasLoggedId.current = true;
    console.log("PurchaseApprovalDetail Id : ", id);
  }, [id]);
 
  const hasLogged = useRef(false);
  useEffect(() => {
    if (!user?.name || hasLogged.current) return;
    hasLogged.current = true;
    console.log("User Name : ", user?.name);
  }, [user?.name]);
 
  const hasLoggedTenant = useRef(false);
 
  useEffect(() => {
    if (!company || hasLoggedTenant.current) return;
 
    hasLoggedTenant.current = true;
 
    console.log("Company:", company);
  }, [company]);


const hasFetched = useRef(false);
  useEffect(() => {
 
    if (!id || !company || hasFetched.current) return;
 
    hasFetched.current = true;
 
    fetch(`/api/purchase-approval/${id}`, {
      headers: {
        "Content-Type": "application/json",
        "x-tenant": company
      }
    })
      .then(res => res.json())
      .then(json => {
        if (json.success) {
          setData(json.data);
        }
      })
      .finally(() => setLoading(false));
 
  }, [id, company]);

  const hasFetchedUoms = useRef(false);
  useEffect(() => {
    if (!company || hasFetchedUoms.current) return;
    hasFetchedUoms.current = true;
    apiFetch("/api/uom", company)
      .then(res => res.json())
      .then(json => {
        if (json.success) {
          setAllUoms(json.data);
        }
      });
  }, [company]);

  /* APPROVE */

  const handleApprove = async () => {

    setLoading(true);

    const res = await fetch(`/api/purchase-approval/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-tenant": company },
      body: JSON.stringify({
        action: "approve",
        user_name: user?.name
      })
    });

    const json = await res.json();

    if (json.success) {
      router.push(`/${company}/workspace/transactions/purchase-approval`);
    }

    setLoading(false);
  };



  /* REJECT SUBMIT */

  const handleRejectSubmit = async () => {

    if (!reason.trim()) {
      setError("Reject reason is required");
      return;
    }

    setLoading(true);
    setError("");

    const res = await fetch(`/api/purchase-approval/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json","x-tenant": company },
      body: JSON.stringify({
        action: "reject",
        reason,
        user_name: user?.name
      })
    });

    const json = await res.json();

    if (json.success) {
      router.push(`/${company}/workspace/transactions/purchase-approval`);
    }
    setLoading(false);
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
    return createPortal(
      <div className="fixed inset-0 z-[99999] bg-black/20 backdrop-blur-sm flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-2xl flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-700 font-semibold text-lg">
            Loading Purchase Approval...
          </p>
        </div>
      </div>,
      document.body
    );
  }
  if (!data) {
    return <p>No data found</p>;
  }
  const totalQty = data.items.reduce(
    (sum: number, r: any) => sum + Number(r.qty || 0),
    0
  );

  const totalAmount = data.items.reduce(
    (sum: number, row: any) => sum + Number(row.line_total || 0),
    0
  );
  const itemsSubtotal = Number(data.subtotal || 0);
  const productTax = Number(data.tax_amount || 0);
  const freightBase = Number(data.freight_charges || 0);
  const freightTaxAmount = Number(data.freight_tax_amount || 0);
  const packagingAmount = Number(data.packaging_amount || 0);
  const extraChargesTotal = freightBase + freightTaxAmount + packagingAmount;
  const grandTotal = Number(data.total_amount || 0);
  const isAwaiting = data.approval_status === "Awaiting for approval";

  const uomMap = allUoms.reduce((acc, uom) => {
    acc[uom.uom_code] = uom.uom_name;
    return acc;
  }, {} as Record<string, string>);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
 <div className="flex justify-between items-center mb-10">

        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            Purchase Approval Details
          </h1>

          <p className="text-gray-500 text-sm">
           Review, approve, or escalate rejection with reason. </p>
        </div>
   {/* ACTION BUTTONS */}

         <div className="flex gap-3">

        <button
          onClick={() => router.push(`/${company}/workspace/transactions/purchase-approval`)}
          className="bg-gray-300 px-6 py-2 rounded hover:bg-gray-400"
        >
          Cancel
        </button>
        {isAwaiting && (
          <>
            <button
              onClick={() => setRejectOpen(true)}
              disabled={!isAwaiting}
              className={`px-6 py-2 rounded text-white
    ${isAwaiting ? "bg-red-600 hover:bg-red-700" : "bg-gray-400 cursor-not-allowed"}
  `}
            >
              Reject
            </button>

            <button
              onClick={handleApprove}
              disabled={!isAwaiting}
              className={`px-6 py-2 rounded text-white
    ${isAwaiting ? "bg-green-600 hover:bg-green-700" : "bg-gray-400 cursor-not-allowed"}
  `}
            >
              Approve
            </button>
          </>
        )}
      </div>
      </div>

      {/* HEADER */}

<div className="grid lg:grid-cols-3 gap-8 mb-8">

  {/* SUPPLIER CARD */}
  <div className="bg-white rounded-2xl shadow-md border p-6 space-y-4">

    <div>
      <h3 className="text-sm text-gray-500 mb-2">Supplier</h3>

      <p className="font-semibold text-gray-800">
        {data.supplier_code} - {data.supplier_name}
      </p>
    </div>

    <div className="grid md:grid-cols-2 gap-6">

      <div>
        <p className="font-semibold text-gray-700">Bill To</p>
        <p className="text-sm text-gray-500 mt-1">
          {data.bill_to_code ? `${data.bill_to_code} - ${data.bill_to_name}` : "-"}
        </p>
        {data.bill_to_address && (
          <p className="text-xs text-gray-500 mt-1">{data.bill_to_address}</p>
        )}
      </div>

      <div>
        <p className="font-semibold text-gray-700">Ship To</p>
        <p className="text-sm text-gray-500 mt-1">
          {data.ship_to_code ? `${data.ship_to_code} - ${data.ship_to_name}` : "-"}
        </p>
        {data.ship_to_address && (
          <p className="text-xs text-gray-500 mt-1">{data.ship_to_address}</p>
        )}
      </div>

    </div>

    <div>
      <p className="font-semibold text-gray-700">Notes</p>
      <p className="text-sm text-gray-500 mt-1">
        {data.notes || "-"}
      </p>
    </div>

    <div>
      <p className="font-semibold text-gray-700">Attachment</p>
      {data.attachment_url ? (
        <a
          href={data.attachment_url}
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

  {/* PO INFO CARD */}
  <div className="bg-white rounded-2xl shadow-md border p-6">

    <h3 className="text-sm text-gray-500 mb-3">
      Purchase Order Info
    </h3>

    <div className="space-y-2 text-sm">

      <div className="flex justify-between">
        <span>PO No</span>
        <span className="font-semibold text-indigo-600">
          {data.purchase_no}
        </span>
      </div>

      <div className="flex justify-between">
        <span>PO Date</span>
        <span>{formatDate(data.purchase_date)}</span>
      </div>

      <div className="flex justify-between">
        <span>Req Date</span>
        <span>{formatDate(data.req_date)}</span>
      </div>

      <div className="flex justify-between">
        <span>Currency</span>
        <span>{data.currency_code || data.currency}</span>
      </div>

      <div className="flex justify-between">
        <span>Conversion Rate</span>
        <span>{data.conversion_rate}</span>
      </div>

      <div className="flex justify-between">
        <span>Despatch Terms</span>
        <span>{data.despatch_terms_name || "-"}</span>
      </div>

      <div className="flex justify-between">
        <span>Payment Terms</span>
        <span>{data.payment_terms_name || "-"}</span>
      </div>

      <div className="flex justify-between">
        <span>PO Type</span>
        <span>{data.po_type || "standard"}</span>
      </div>

      <div className="flex justify-between items-center">
        <span>Approval</span>
        {data.approval_status && (
          <span className={`px-3 py-1 text-xs rounded-full font-semibold whitespace-nowrap
            ${data.approval_status === "Awaiting for approval" ? "bg-orange-100 text-orange-700" : ""}
            ${data.approval_status === "Approved" ? "bg-green-100 text-green-700" : ""}
            ${data.approval_status === "Rejected" ? "bg-red-100 text-red-700" : ""}
            ${data.approval_status === "Partial" ? "bg-blue-100 text-blue-700" : ""}
          `}>
            {data.approval_status}
          </span>
        )}
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
        <span>{itemsSubtotal.toFixed(2)}</span>
      </div>

      <div className="flex justify-between">
        <span>Product Tax (GST)</span>
        <span>{productTax.toFixed(2)}</span>
      </div>

      <div className="border-t pt-3 mt-2 space-y-2">

        <div className="flex justify-between">
          <span>Freight</span>
          <span>{Number(data.freight_charges || 0).toFixed(2)}</span>
        </div>

        <div className="flex justify-between">
          <span>Freight Tax %</span>
          <span>{Number(data.freight_tax || 0).toFixed(2)}</span>
        </div>

        <div className="flex justify-between">
          <span>Freight Tax</span>
          <span>{Number(data.freight_tax_amount || 0).toFixed(2)}</span>
        </div>

        <div className="flex justify-between">
          <span>Packaging</span>
          <span>{Number(data.packaging_amount || 0).toFixed(2)}</span>
        </div>

      </div>

      <div className="border-t pt-3 flex justify-between text-lg font-bold text-indigo-600">
        <span>Grand Total</span>
        <span>{grandTotal.toFixed(2)}</span>
      </div>

    </div>

  </div>

</div>


      {/* ITEM TABLE */}

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <div className="min-h-[420px] max-h-[420px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-indigo-50 text-gray-600 text-sm">
              <tr className="border-t hover:bg-blue-50 transition">
                <th className="p-2 text-left">Product Id</th>
                <th className="p-2 text-left">Product Name</th>
                <th className="p-2 text-left">UOM</th>
                <th className="p-2 text-left">HSN No</th>
                <th className="p-2">Unit Price</th>
                <th className="p-2">Qty</th>
                <th className="p-2">Amount</th>
                <th className="p-2">Tax Group</th>
                <th className="p-2">Tax Amount</th>
                <th className="p-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item: any, i: number) => (
                <tr key={i} className="border-t hover:bg-blue-50 transition">
                  <td className="p-2">{item.product_code}</td>
                  <td className="p-2">{item.product_name}</td>
                  <td className="p-2">{uomMap[item.uom] || item.uom}</td>
                  <td className="p-2">{item.hsn_no}</td>
                  <td className="p-2 text-center">{Number(item.rate)}</td>
                  <td className="p-2 text-center">{Number(item.qty)}</td>
                  <td className="p-2 text-right">{(item.rate * item.qty).toFixed(2)}</td>
                  <td className="p-2 text-center">{item.tax_name}</td>
                  <td className="p-2 text-right">{item.tax_amount}</td>
                  <td className="p-2 text-right">{item.line_total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t bg-gray-50 flex justify-end">
          <div className="flex gap-6 text-sm font-medium text-gray-700">
            <div>Total Items: <span className="font-bold">{data.items.length}</span></div>
            <div>Total Qty: <span className="font-bold">{totalQty}</span></div>
            <div>Total Amount: <span className="font-bold">{totalAmount.toFixed(2)}</span></div>
          </div>
        </div>
      </div>




   

      {/* REJECT POPUP */}
      {rejectOpen &&
        createPortal(
          <div className="fixed inset-0 z-[99999] bg-black/40 flex items-center justify-center">
            <div className="max-w-md w-full bg-white rounded-xl shadow-2xl p-6">

              <h2 className="text-lg font-bold mb-4">
                Reject Purchase Order
              </h2>

              <textarea
                placeholder="Enter reject reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="border w-full p-2 rounded"
              />

              {error && (
                <p className="text-red-500 text-sm mt-2">{error}</p>
              )}

              <div className="flex justify-end gap-3 mt-4">

                <button
                  onClick={() => {
                    setRejectOpen(false);
                    setReason("");
                    setError("");
                  }}
                  className="bg-gray-300 px-6 py-2 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>

                <button
                  onClick={handleRejectSubmit}
                  className="bg-[var(--color-blue-500)] text-white px-6 py-2 rounded hover:opacity-90"
                >
                  Submit
                </button>

              </div>

            </div>
          </div>,
          document.body
        )
      }
    </div>
  );
}
