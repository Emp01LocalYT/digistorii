"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTenant } from "@/context/TenantContext";
import { useUser } from "@/context/CurrentUserContext";
import { createPortal } from "react-dom";

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



  const { company } = useTenant();
  console.log("Company:", company);
  const { user } = useUser();
  console.log("User Name : ", user?.name);


  useEffect(() => {

    if (!id || !company) return;

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
      router.push(`/${company}/transactions/purchase-approval`);
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
      router.push(`/${company}/transactions/purchase-approval`);
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

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* HEADER */}

      <div className="bg-white shadow rounded-xl p-4">

        <h1 className="text-xl font-bold mb-4">
          Purchase Order : {data.purchase_no}
        </h1>

        <div className="grid md:grid-cols-5 text-sm">

          <div>
            <span className="text-sm font-semibold">Supplier :</span> {data.supplier_code} - {data.supplier_name}
          </div>

          <div>
            <span className="text-sm font-semibold">PO Date :</span> {formatDate(data.purchase_date)}
          </div>

          <div>
            <span className="text-sm font-semibold">Req Date :</span> {formatDate(data.req_date)}
          </div>
          <div>
            <span className="text-sm font-semibold">Currency :</span> {data.currency_code || data.currency}
          </div>
          <div>
            <span className="text-sm font-semibold">Conversion Rate :</span> {data.conversion_rate}
          </div>
          <div>
            <span className="text-sm font-semibold">Items Total :</span> {itemsSubtotal.toFixed(2)}
          </div>
          <div>
            <span className="text-sm font-semibold">Product Tax (GST) :</span> {productTax.toFixed(2)}
          </div>
          <div>
            <span className="text-sm font-semibold">Grand Total :</span> {grandTotal.toFixed(2)}
          </div>

          {/* <div>
            <span className="text-sm font-semibold">Status :</span> {data.status}
          </div> */}

          <div className="md:col-span-2">
            <span className="text-sm font-semibold">Approval :</span>
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

        <div className="grid md:grid-cols-2 gap-4 text-sm mt-4">
          <div>
            <span className="text-sm font-semibold">PO Type :</span> {data.po_type || "standard"}
          </div>
          <div>
            <span className="text-sm font-semibold">Item Production Type :</span> {data.item_production_type || "-"}
          </div>
          <div>
            <span className="text-sm font-semibold">Bill To :</span> {data.bill_to_code ? `${data.bill_to_code} - ${data.bill_to_name}` : "-"}
            {data.bill_to_address && (
              <div className="text-xs text-gray-500 mt-1">{data.bill_to_address}</div>
            )}
          </div>
          <div>
            <span className="text-sm font-semibold">Ship To :</span> {data.ship_to_code ? `${data.ship_to_code} - ${data.ship_to_name}` : "-"}
            {data.ship_to_address && (
              <div className="text-xs text-gray-500 mt-1">{data.ship_to_address}</div>
            )}
          </div>
          <div>
            <span className="text-sm font-semibold">Despatch Terms :</span> {data.despatch_terms_name || "-"}
          </div>
          <div>
            <span className="text-sm font-semibold">Payment Terms :</span> {data.payment_terms_name || "-"}
          </div>
          <div>
            <span className="text-sm font-semibold">Freight :</span> {Number(data.freight_charges || 0).toFixed(2)}
          </div>
          <div>
            <span className="text-sm font-semibold">Freight Tax % :</span> {Number(data.freight_tax || 0).toFixed(2)}
          </div>
          <div>
            <span className="text-sm font-semibold">Freight Tax :</span> {Number(data.freight_tax_amount || 0).toFixed(2)}
          </div>
          <div>
            <span className="text-sm font-semibold">Packaging :</span> {Number(data.packaging_amount || 0).toFixed(2)}
          </div>
          <div className="md:col-span-2">
            <span className="text-sm font-semibold">Notes :</span> {data.notes || "-"}
          </div>
          <div className="md:col-span-2">
            <span className="text-sm font-semibold">Attachment :</span>{" "}
            {data.attachment_url ? (
              <a
                href={data.attachment_url}
                target="_blank"
                rel="noreferrer"
                className="text-indigo-600 underline"
              >
                View attachment
              </a>
            ) : (
              "-"
            )}
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
                  <td className="p-2">{item.uom}</td>
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


      <div className="bg-white p-6 rounded-xl shadow">
        <h3 className="text-sm font-semibold text-gray-600 mb-4">Totals</h3>
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
              <span>{freightBase.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Freight Tax</span>
              <span>{freightTaxAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Packaging</span>
              <span>{packagingAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Extra Charges Total</span>
              <span>{extraChargesTotal.toFixed(2)}</span>
            </div>
          </div>
          <div className="border-t pt-3 flex justify-between text-lg font-bold text-indigo-600">
            <span>Grand Total</span>
            <span>{grandTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>


      {/* ACTION BUTTONS */}

      <div className="flex justify-end gap-4">

        <button
          onClick={() => router.push(`/${company}/transactions/purchase-approval`)}
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
