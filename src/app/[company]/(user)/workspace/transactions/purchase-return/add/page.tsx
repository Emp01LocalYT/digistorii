"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { createPortal } from "react-dom";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { useTenant } from "@/context/TenantContext";

type ReturnItemInput = {
  grn_line_id: number;
  product_id: number;
  product_code: string;
  product_name: string;
  uom_code: string;
  hsn_no: string;
  received_qty: number;
  already_returned_qty: number;
  available_qty: number;
  return_qty: number;
  unit_price: number;
  warehouse_id: number;
  locator_id: number;
  checked: boolean;
};

export default function PurchaseReturnForm() {
  const router = useRouter();
  const { company } = useTenant();

  const [txnDate, setTxnDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [grnList, setGrnList] = useState<any[]>([]);
  const [grnSearch, setGrnSearch] = useState("");
  const [selectedGrn, setSelectedGrn] = useState<any | null>(null);
  const [isGrnModalOpen, setIsGrnModalOpen] = useState(false);
  const [returnItems, setReturnItems] = useState<ReturnItemInput[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Fetch GRN list for the selection modal
  const fetchGRNs = async () => {
    if (!company) return;
    try {
      setInitialLoading(true);
      const res = await fetch(`/api/grn`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-tenant": company,
        },
      });
      const result = await res.json();
      if (result.success) {
        setGrnList(result.data || []);
      } else {
        setErrorMessage("Failed to load GRNs");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage("Error loading GRN list");
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    fetchGRNs();
  }, [company]);

  // Handle selected GRN items fetch
  const handleSelectGRN = async (grn: any) => {
    setSelectedGrn(grn);
    setIsGrnModalOpen(false);
    setErrorMessage("");
    setReturnItems([]);
    setValidationErrors({});

    try {
      setInitialLoading(true);

      // 1. Fetch GRN detail lines
      const detailsRes = await fetch(`/api/grn/${grn.id}`, {
        headers: { "x-tenant": company || "" },
      });
      const detailsData = await detailsRes.json();
      if (!detailsData.success) {
        throw new Error(detailsData.error || "Failed to load GRN details");
      }

      // 2. Fetch previous return quantities
      const returnsRes = await fetch(
        `/api/purchase-returns/previous-returns?grn_id=${grn.id}`,
        {
          headers: { "x-tenant": company || "" },
        }
      );
      const returnsData = await returnsRes.json();
      if (!returnsData.success) {
        throw new Error(returnsData.error || "Failed to load previous returns");
      }

      const returnedQtyMap = new Map<number, number>();
      if (returnsData.data) {
        returnsData.data.forEach((r: any) => {
          returnedQtyMap.set(Number(r.grn_line_id), Number(r.total_returned_qty));
        });
      }

      // 3. Map to return items structure
      const mapped = detailsData.data.details.map((d: any) => {
        const receivedQty = Number(d.qty || 0);
        const prevReturned = returnedQtyMap.get(Number(d.id)) || 0;
        const availableQty = Math.max(receivedQty - prevReturned, 0);
        const unitPrice = Number(d.unit_price || 0);

        return {
          grn_line_id: Number(d.id),
          product_id: Number(d.product_id),
          product_code: d.product_code || "",
          product_name: d.product_name || "",
          uom_code: d.uom_code || "",
          hsn_no: d.hsn_no || "",
          received_qty: receivedQty,
          already_returned_qty: prevReturned,
          available_qty: availableQty,
          return_qty: 0,
          unit_price: unitPrice,
          warehouse_id: Number(d.warehouse_id),
          locator_id: Number(d.locator_id),
          checked: false,
        };
      });

      setReturnItems(mapped);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load GRN details");
    } finally {
      setInitialLoading(false);
    }
  };

  // Filtered GRN list for the search modal
  const filteredGRNs = useMemo(() => {
    return grnList.filter((g) => {
      return (
        `${g.grn_no} ${g.supplier_name} ${g.purchase_no}`
          .toLowerCase()
          .includes(grnSearch.toLowerCase())
      );
    });
  }, [grnList, grnSearch]);

  // Recalculate automatic refund amount based on checked items
  useEffect(() => {
    const total = returnItems.reduce((sum, item) => {
      if (item.checked && item.return_qty > 0) {
        return sum + item.return_qty * item.unit_price;
      }
      return sum;
    }, 0);
    setRefundAmount(total);
  }, [returnItems]);

  const handleCheckboxChange = (index: number, checked: boolean) => {
    setReturnItems((prev) =>
      prev.map((item, idx) => {
        if (idx === index) {
          const defaultQty = checked ? (item.available_qty > 0 ? 1 : 0) : 0;
          return { ...item, checked, return_qty: defaultQty };
        }
        return item;
      })
    );
    // Clear validation error for this line if unchecked
    if (!checked) {
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next[`qty_${index}`];
        return next;
      });
    }
  };

  const handleQtyChange = (index: number, val: string) => {
    const num = Number(val);
    setReturnItems((prev) =>
      prev.map((item, idx) => {
        if (idx === index) {
          return { ...item, return_qty: isNaN(num) ? 0 : num };
        }
        return item;
      })
    );

    // Validate in-place
    const item = returnItems[index];
    if (num > item.available_qty) {
      setValidationErrors((prev) => ({
        ...prev,
        [`qty_${index}`]: `Cannot return more than available (${item.available_qty})`,
      }));
    } else if (num < 0) {
      setValidationErrors((prev) => ({
        ...prev,
        [`qty_${index}`]: "Qty cannot be negative",
      }));
    } else {
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next[`qty_${index}`];
        return next;
      });
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!selectedGrn) {
      errors.grn = "Please select a GRN";
    }

    if (!txnDate) {
      errors.date = "Please enter return date";
    }

    const checkedItems = returnItems.filter((item) => item.checked);
    if (selectedGrn && checkedItems.length === 0) {
      errors.items = "Please select at least one item to return";
    }

    checkedItems.forEach((item, index) => {
      const idx = returnItems.findIndex((x) => x.grn_line_id === item.grn_line_id);
      if (item.return_qty <= 0) {
        errors[`qty_${idx}`] = "Quantity must be greater than 0";
      } else if (item.return_qty > item.available_qty) {
        errors[`qty_${idx}`] = `Quantity exceeds available limit (${item.available_qty})`;
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!validateForm()) return;

    setLoading(true);
    try {
      const payload = {
        grn_id: selectedGrn.id,
        txn_date: txnDate,
        refund_amount: refundAmount,
        items: returnItems
          .filter((item) => item.checked && item.return_qty > 0)
          .map((item) => ({
            grn_line_id: item.grn_line_id,
            product_id: item.product_id,
            warehouse_id: item.warehouse_id,
            locator_id: item.locator_id,
            return_qty: item.return_qty,
            unit_price: item.unit_price,
          })),
      };

      const res = await fetch("/api/purchase-returns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant": company || "",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to create return");
      }

      router.push(`/${company}/workspace/transactions/purchase-return`);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Error submitting purchase return");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => {
    if (!date) return "";
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {

      case "Approved":
        return "bg-blue-400 text-black";

      case "Awaiting for approval":
        return "bg-yellow-400 text-black";

      case "Completed":
        return "bg-gray-300 text-black";

      case "Partial":
        return "bg-indigo-400 text-black";

      case "Rejected":
        return "bg-red-400 text-black";

      default:
        return "bg-gray-200 text-black";
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {initialLoading &&
        createPortal(
          <div className="fixed inset-0 z-[99999] bg-black/20 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-white p-8 rounded-xl shadow-2xl flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-700 font-semibold text-lg">Loading details...</p>
            </div>
          </div>,
          document.body
        )}

      {loading &&
        createPortal(
          <div className="fixed inset-0 z-[99999] bg-black/20 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-white p-8 rounded-xl shadow-2xl flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-700 font-semibold text-lg">Saving return record...</p>
            </div>
          </div>,
          document.body
        )}

      <div>
        <h1 className="text-2xl font-bold">New Purchase Return (RTV)</h1>
        <p className="text-sm text-gray-500">
          Select an existing GRN to return products and update inventory stock.
        </p>
      </div>

      {errorMessage && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded text-red-700 text-sm font-medium">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* GRN Selection Section */}
        <div className="bg-white p-6 rounded-xl shadow border border-gray-100 grid md:grid-cols-4 gap-6 items-end">
          <div className="md:col-span-2">
            <label className="text-sm font-semibold mb-1 block">
              Reference GRN <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                placeholder="Click Select GRN to choose..."
                className={`ui-input flex-1 bg-gray-50 border ${validationErrors.grn ? "border-red-500" : "border-gray-300"
                  } rounded p-2 text-sm cursor-pointer`}
                onClick={() => setIsGrnModalOpen(true)}
                value={
                  selectedGrn
                    ? `${selectedGrn.grn_no} (PO: ${selectedGrn.purchase_no || "N/A"})`
                    : ""
                }
              />
              <button
                type="button"
                onClick={() => setIsGrnModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium transition"
              >
                Select GRN
              </button>
            </div>
            {validationErrors.grn && (
              <span className="text-red-500 text-xs mt-1 block">{validationErrors.grn}</span>
            )}
          </div>

          <div>
            <label className="text-sm font-semibold mb-1 block">
              Return Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              className="ui-input border border-gray-300 rounded p-2 text-sm w-full"
              value={txnDate}
              onChange={(e) => setTxnDate(e.target.value)}
            />
            {validationErrors.date && (
              <span className="text-red-500 text-xs mt-1 block">{validationErrors.date}</span>
            )}
          </div>

          <div>
            <label className="text-sm font-semibold mb-1 block">Refund Amount (Auto)</label>
            <div className="border border-gray-300 bg-gray-50 rounded p-2 text-sm font-bold text-gray-700">
              {new Intl.NumberFormat("en-IN", {
                style: "currency",
                currency: "INR",
              }).format(refundAmount)}
            </div>
          </div>
        </div>

        {/* Selected GRN Supplier details */}
        {selectedGrn && (
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded text-blue-900 grid md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-semibold text-gray-600 block">Supplier</span>
              <span className="font-medium text-gray-900">{selectedGrn.supplier_name}</span>
              <span className="text-xs text-gray-500 block">Code: {selectedGrn.supplier_code}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-600 block">GRN Date</span>
              <span className="font-medium text-gray-900">{formatDate(selectedGrn.grn_date)}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-600 block">Supplier Contact</span>
              <span className="font-medium text-gray-900">{selectedGrn.supplier_phone || "N/A"}</span>
              <span className="text-xs text-gray-500 block">{selectedGrn.supplier_email || ""}</span>
            </div>
          </div>
        )}

        {/* Item Selection and Input */}
        {selectedGrn && (
          <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
            <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <span className="font-bold text-gray-700">Items Available for Return</span>
              {validationErrors.items && (
                <span className="text-red-500 text-sm font-medium">{validationErrors.items}</span>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-100 text-gray-700 font-semibold border-b border-gray-200">
                    <th className="p-3 w-12 text-center">Select</th>
                    <th className="p-3">Product Name</th>
                    <th className="p-3">SKU / Code</th>
                    <th className="p-3 text-right">Received Qty</th>
                    <th className="p-3 text-right">Returned Qty</th>
                    <th className="p-3 text-right">Available Qty</th>
                    <th className="p-3 text-right">Return Price</th>
                    <th className="p-3 w-40 text-right">Return Qty</th>
                    <th className="p-3 text-right">Total Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {returnItems.map((item, index) => {
                    const hasAvailableStock = item.available_qty > 0;
                    return (
                      <tr
                        key={item.grn_line_id}
                        className={`border-b border-gray-100 hover:bg-gray-50 ${!hasAvailableStock ? "bg-red-50/30 opacity-70" : ""
                          }`}
                      >
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            disabled={!hasAvailableStock}
                            checked={item.checked}
                            onChange={(e) => handleCheckboxChange(index, e.target.checked)}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </td>
                        <td className="p-3 font-medium text-gray-900">{item.product_name}</td>
                        <td className="p-3 text-gray-500">{item.product_code}</td>
                        <td className="p-3 text-right font-semibold text-gray-700">
                          {item.received_qty} {item.uom_code}
                        </td>
                        <td className="p-3 text-right text-gray-500">
                          {item.already_returned_qty} {item.uom_code}
                        </td>
                        <td className="p-3 text-right font-bold text-green-600">
                          {item.available_qty} {item.uom_code}
                        </td>
                        <td className="p-3 text-right">
                          {new Intl.NumberFormat("en-IN", {
                            style: "currency",
                            currency: "INR",
                          }).format(item.unit_price)}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex flex-col items-end">
                            <input
                              type="number"
                              disabled={!item.checked}
                              min={1}
                              max={item.available_qty}
                              step="any"
                              value={item.return_qty === 0 ? "" : item.return_qty}
                              onChange={(e) => handleQtyChange(index, e.target.value)}
                              className={`w-28 text-right border ${validationErrors[`qty_${index}`]
                                ? "border-red-500 bg-red-50"
                                : "border-gray-300"
                                } rounded p-1 text-sm focus:ring-blue-500 focus:border-blue-500`}
                              placeholder="0"
                            />
                            {validationErrors[`qty_${index}`] && (
                              <span className="text-red-500 text-xs mt-1 block max-w-xs text-right leading-tight">
                                {validationErrors[`qty_${index}`]}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-right font-bold text-gray-900">
                          {new Intl.NumberFormat("en-IN", {
                            style: "currency",
                            currency: "INR",
                          }).format((item.checked ? item.return_qty : 0) * item.unit_price)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push(`/${company}/workspace/transactions/purchase-return`)}
            className="border border-gray-300 px-6 py-2 rounded text-sm font-medium hover:bg-gray-100 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded text-sm font-semibold shadow disabled:opacity-50 transition"
          >
            Save Return
          </button>
        </div>
      </form>

      {/* GRN Selection Modal */}
      {isGrnModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[1000] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh]">
              <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-gray-800">Select Goods Received Note</h2>
                  <p className="text-xs text-gray-500">Choose a GRN reference to record returns against.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsGrnModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                >
                  &times;
                </button>
              </div>

              <div className="p-4 border-b border-gray-100">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by GRN number, Supplier, or PO number..."
                    className="w-full border border-gray-300 rounded pl-10 pr-4 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                    value={grnSearch}
                    onChange={(e) => setGrnSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="overflow-y-auto flex-1 p-4">
                {filteredGRNs.length > 0 ? (
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                        <th className="p-3">GRN No</th>
                        <th className="p-3">Date</th>
                        <th className="p-3">PO No</th>
                        <th className="p-3">Supplier</th>
                        <th className="p-3">Status Of GRN</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredGRNs.map((g) => (
                        <tr
                          key={g.id}
                          className="border-b border-gray-100 hover:bg-blue-50 transition cursor-pointer"
                          onClick={() => handleSelectGRN(g)}
                        >
                          <td className="p-3 font-semibold text-blue-600">{g.grn_no}</td>
                          <td className="p-3 text-gray-600">{formatDate(g.grn_date)}</td>
                          <td className="p-3 text-gray-600">{g.purchase_no || "N/A"}</td>
                          <td className="p-3">
                            <div className="flex flex-col">
                              <span className="font-medium text-gray-800">{g.supplier_name}</span>
                              <span className="text-xs text-gray-400">{g.supplier_code}</span>
                            </div>
                          </td>
                          <td className="ui-table-td">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(g.status)}`}
                            >
                              {g.status}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectGRN(g);
                              }}
                              className="bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-200 px-3 py-1 rounded text-xs font-semibold transition"
                            >
                              Select
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-12 text-gray-500">No GRN found matching the search.</div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
