"use client";
 
import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { PlusIcon } from "@/icons";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { createPortal } from "react-dom";
import { ChevronUpIcon, ChevronDownIcon } from "@heroicons/react/24/solid";
import { EyeIcon, PencilSquareIcon } from "@heroicons/react/24/outline";
import { useTenant } from "@/context/TenantContext";
 
export default function PurchaseApprovalList() {
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  // const { company } = useParams();
  const { company } = useTenant();
  console.log("Company:", company);
  // const tenant = typeof window !== "undefined" ? localStorage.getItem("company") || "" : "";
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
 
  const itemsPerPage = 10;
 
  const formatDate = (date: string) => {
    if (!date) return "";
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
 
    return `${day}-${month}-${year}`;
  };
 
  useEffect(() => {
    const fetchPurchases = async () => {
      if (!company) return;
      try {
        setLoading(true);
        const res = await fetch(`/api/purchase-approval`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "x-tenant": company
          },
        });
 
        const result = await res.json();
 
        // Safety Guard: Ensure data is an array before setting state
        if (result.success) {
          // console.log("Fetched Purchases:", result.data);
          setData(result.data);
        } else {
          console.error("API Error Response:", result.error);
          setData([]);
        }
      } catch (error) {
        console.error("Fetch Error:", error);
        setData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchPurchases();
  }, [company]);
 
  /* ================= SEARCH ================= */
 
  const filteredData = useMemo(() => {
    return data.filter((p) =>
      `${p.purchase_no}${p.purchase_date} ${p.req_date}${p.supplier_code} ${p.supplier_name} ${p.total_amount} ${p.reject_reason} ${p.approval_status}`
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [data, search]);
 
  /* ================= SORT ================= */
 
  const sortedData = useMemo(() => {
    if (!sortField) return filteredData;
 
    return [...filteredData].sort((a: any, b: any) => {
      let valA;
      let valB;
 
      if (sortField === "supplier") {
        valA = `${a.supplier_code} ${a.supplier_name}`.toLowerCase();
        valB = `${b.supplier_code} ${b.supplier_name}`.toLowerCase();
      } else {
        valA = a[sortField];
        valB = b[sortField];
      }
 
      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
 
      return 0;
    });
  }, [filteredData, sortField, sortOrder]);
 
  const handleSort = (field: string) => {
    setSortOrder(sortField === field && sortOrder === "asc" ? "desc" : "asc");
    setSortField(field);
  };
 
  /* ================= PAGINATION ================= */
 
  const paginatedData = sortedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
 
  const handlePONavigate = (id: number) => {
    router.push(`/${company}/transactions/purchase-approval/${id}`);
  };
 
  const getStatusBadge = (status: string) => {
    switch (status) {
 
      case "Awaiting for approval":
        return "bg-orange-100 text-orange-700";
 
      case "Rejected":
        return "bg-red-100 text-red-700";
 
      case "Approved":
        return "bg-green-100 text-green-700";
 
      case "Partial":
        return "bg-blue-100 text-blue-700";
 
      default:
        return "bg-gray-100 text-gray-700";
    }
  };
 
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
 
      {loading &&
        createPortal(
          <div className="fixed inset-0 z-[99999] bg-black/20 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-white p-8 rounded-xl shadow-2xl flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-700 font-semibold text-lg">Loading purchases approval...</p>
            </div>
          </div>,
          document.body
        )
      }
 
      <div className="flex justify-between">
        <h1 className="text-2xl font-bold">Purchase Approval List</h1>
      </div>
 
      {/* SEARCH */}
      <div className="relative max-w-sm">
        <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" />
 
        <input
          type="text"
          placeholder="Search purchase approval..."
          className="ui-input"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
        />
      </div>
 
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-8">
        <table className="w-full text-sm">
          <thead className="bg-indigo-50 text-gray-600 text-sm">
            <tr className="border-t hover:bg-blue-50 transition">
              <th
                className="p-3 cursor-pointer select-none"
                onClick={() => handleSort("purchase_no")}
              >
                <div className="flex items-center gap-1">
                  PO No
 
                  {sortField === "purchase_no" && (
                    sortOrder === "asc"
                      ? <ChevronUpIcon className="w-4 h-4 text-blue-600" />
                      : <ChevronDownIcon className="w-4 h-4 text-blue-600" />
                  )}
 
                </div>
              </th>
              <th
                onClick={() => handleSort("purchase_date")}><div className="flex items-center gap-1">
                  PO Date
 
                  {sortField === "purchase_date" && (
                    sortOrder === "asc"
                      ? <ChevronUpIcon className="w-4 h-4 text-blue-600" />
                      : <ChevronDownIcon className="w-4 h-4 text-blue-600" />
                  )}
 
                </div></th>
              <th
                onClick={() => handleSort("req_date")}><div className="flex items-center gap-1">
                  Req Date
 
                  {sortField === "req_date" && (
                    sortOrder === "asc"
                      ? <ChevronUpIcon className="w-4 h-4 text-blue-600" />
                      : <ChevronDownIcon className="w-4 h-4 text-blue-600" />
                  )}
 
                </div></th>
              <th
                onClick={() => handleSort("supplier")}><div className="flex items-center gap-1">
                  Supplier
 
                  {sortField === "supplier" && (
                    sortOrder === "asc"
                      ? <ChevronUpIcon className="w-4 h-4 text-blue-600" />
                      : <ChevronDownIcon className="w-4 h-4 text-blue-600" />
                  )}
 
                </div></th>
              <th
                onClick={() => handleSort("total_amount")}><div className="flex items-center gap-1">
                  Total Amount
 
                  {sortField === "total_amount" && (
                    sortOrder === "asc"
                      ? <ChevronUpIcon className="w-4 h-4 text-blue-600" />
                      : <ChevronDownIcon className="w-4 h-4 text-blue-600" />
                  )}
 
                </div></th>
              <th
                onClick={() => handleSort("reject_reason")}><div className="flex items-center gap-1">
                  Reject Reason
 
                  {sortField === "reject_reason" && (
                    sortOrder === "asc"
                      ? <ChevronUpIcon className="w-4 h-4 text-blue-600" />
                      : <ChevronDownIcon className="w-4 h-4 text-blue-600" />
                  )}
 
                </div></th>
              <th
                onClick={() => handleSort("approval_status")}><div className="flex items-center gap-1">
                  Status
 
                  {sortField === "approval_status" && (
                    sortOrder === "asc"
                      ? <ChevronUpIcon className="w-4 h-4 text-blue-600" />
                      : <ChevronDownIcon className="w-4 h-4 text-blue-600" />
                  )}
 
                </div></th>
            </tr>
 
          </thead>
 
          <tbody>
            {loading ? (
              <tr className="border-t hover:bg-blue-50 transition">
                <td colSpan={5} className="text-center py-10 text-gray-400 animate-pulse">
                  Loading purchases approval...
                </td>
              </tr>
            ) : paginatedData.length > 0 ? (
              paginatedData.map((row) => (
                <tr key={row.id} className="border-t hover:bg-blue-50 transition">
                  <td className="p-3">
                    <button
                      onClick={() => handlePONavigate(row.id)}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      {row.purchase_no}
                    </button>
                  </td>
                  <td>{formatDate(row.purchase_date)}</td>
                  <td>{formatDate(row.req_date)}</td>
                  <td>
                    <div className="flex flex-col">
                      <span className="font-medium">{row.supplier_name}</span>
                      <span className="text-sm text-gray-500">{row.supplier_code}</span>
                    </div>
                  </td>
                  <td className="text-center pr-4">{row.total_amount}</td>
                  <td >{row.reject_reason}</td>
                  <td>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(row.approval_status)}`}
                    >
                      {row.approval_status}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="text-center py-10 text-gray-500">
                  No purchases approval found
                </td>
              </tr>
            )}
          </tbody>
        </table>
 
        {/* PAGINATION */}
        <div className="flex justify-between items-center px-6 py-4 bg-gray-50 border-t">
          <p className="text-sm text-gray-500">
            {/* Showing {filteredData.length} of {filteredData.length} items */}
            Showing {(currentPage - 1) * itemsPerPage + 1}
            -
            {Math.min(currentPage * itemsPerPage, data.length)} of {data.length} items
          </p>
 
          <div className="flex items-center gap-1">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(c => c - 1)}
              className="px-3 py-1 text-sm border rounded bg-white disabled:opacity-50 hover:bg-gray-100"
            >
              Prev
            </button>
 
            {/* Logic to show numbers in between */}
            {Array.from({ length: Math.ceil(filteredData.length / itemsPerPage) }, (_, i) => (
              <button
                key={i + 1}
                onClick={() => setCurrentPage(i + 1)}
                className={`px-3 py-1 text-sm border rounded transition-colors ${currentPage === i + 1
                  ? "bg-[var(--color-blue-500)] text-white border-indigo-600"
                  : "bg-white text-gray-600 hover:bg-gray-100"
                  }`}
              >
                {i + 1}
              </button>
            ))}
 
            <button
              disabled={currentPage >= Math.ceil(filteredData.length / itemsPerPage)}
              onClick={() => setCurrentPage(c => c + 1)}
              className="px-3 py-1 text-sm border rounded bg-white disabled:opacity-50 hover:bg-gray-100"
            >
              Next
            </button>
          </div>
        </div>
 
      </div>
    </div>
  );
}