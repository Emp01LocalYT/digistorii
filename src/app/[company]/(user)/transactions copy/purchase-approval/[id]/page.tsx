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
            <span className="text-sm font-semibold">Currency :</span> {data.currency}
          </div>
          <div>
            <span className="text-sm font-semibold">Conversion Rate :</span> {data.conversion_rate}
          </div>
          <div>
            <span className="text-sm font-semibold">Subtotal :</span> {Number(data.subtotal || 0).toFixed(2)}
          </div>
          <div>
            <span className="text-sm font-semibold">Tax :</span> {Number(data.tax_amount || 0).toFixed(2)}
          </div>
          <div>
            <span className="text-sm font-semibold">Total :</span> {Number(data.total_amount || 0).toFixed(2)}
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