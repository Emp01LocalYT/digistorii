"use client";
 
import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { PlusIcon } from "@/icons";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/outline";
import { createPortal } from "react-dom";
import { ChevronUpIcon, ChevronDownIcon } from "@heroicons/react/24/solid";
import { useTenant } from "@/context/TenantContext";
import { useSearchParams } from "next/navigation";
import { usePagination } from "@/hooks/usePagination";
 
export default function PurchaseList() {
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  // const { company } = useParams();
  const { company } = useTenant();
 
  // const tenant = typeof window !== "undefined" ? localStorage.getItem("company") || "" : "";
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const hasLoggedTenant = useRef(false);
  const hasFetched = useRef(false);

  const searchParams = useSearchParams();
  const statusFilter = searchParams.get("status");
 
  const formatDate = (date: string) => {
    if (!date) return "";
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
 
    return `${day}-${month}-${year}`;
  };
 
 
  useEffect(() => {
    if (!company || hasLoggedTenant.current) return;
 
    hasLoggedTenant.current = true;
 
    console.log("Company:", company);
  }, [company]);
 
  useEffect(() => {
    const fetchPurchases = async () => {
      if (!company || hasFetched.current) return;
      hasFetched.current = true;
      try {
        setLoading(true);
        const res = await fetch(`/api/purchase`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "x-tenant": company
          },
        });
 
        const result = await res.json();
 
        // Safety Guard: Ensure data is an array before setting state
        if (result.success) {
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
 
  // const filteredData = useMemo(() => {
  //   return data.filter((p) =>
  //     `${p.purchase_no}${p.purchase_date} ${p.req_date}${p.supplier_code} ${p.supplier_name} ${p.total_amount} ${p.reject_reason} ${p.approval_status}`
  //       .toLowerCase()
  //       .includes(search.toLowerCase())
  //   );
  // }, [data, search]);
  const filteredData = useMemo(() => {
    return data.filter((p) => {
      const matchSearch =
        `${p.purchase_no}${p.purchase_date}${p.req_date}${p.supplier_code}${p.supplier_name}${p.total_amount}${p.reject_reason}${p.status}`
          .toLowerCase()
          .includes(search.toLowerCase());
 
      const matchStatus = statusFilter
        ? p.status === statusFilter
        : true;
 
      return matchSearch && matchStatus;
    });
  }, [data, search, statusFilter]);
 
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

  const {
    currentPage,
    setCurrentPage,
    itemsPerPage: rowsPerPage,
    setItemsPerPage: setRowsPerPage,
    totalItems,
    totalPages,
    pageNumbers,
    showingFrom,
    showingTo,
    paginatedData,
    goToPage,
    goToPreviousPage,
    goToNextPage,
  } = usePagination({
    data: sortedData,
    initialItemsPerPage: 10,
    resetDeps: [search, statusFilter],
  });
 
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
 
      {loading &&
        createPortal(
          <div className="fixed inset-0 z-[99999] bg-black/20 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-white p-8 rounded-xl shadow-2xl flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-700 font-semibold text-lg">Loading purchases...</p>
            </div>
          </div>,
          document.body
        )
      }
 
      <div className="flex justify-between">
        <h1 className="text-2xl font-bold">Purchase List</h1>
 
        <button
          onClick={() => router.push(`/${company}/transactions/purchase/add`)}
          className="bg-[var(--color-blue-600)] flex items-center gap-2  text-white px-4 py-2 rounded-lg"
        >
          <PlusIcon className="w-4 h-4" />
          Add Purchase Order
        </button>
      </div>
 
      {/* SEARCH */}
 
      <div className="relative max-w-sm">
        <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" />
 
        <input
          type="text"
          placeholder="Search purchase..."
          className="w-full pl-10 pr-4 py-2 border rounded-lg"
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
              <th className="p-3 text-left">Action</th>
            </tr>
          </thead>
 
          <tbody>
            {loading ? (
              <tr className="border-t hover:bg-blue-50 transition">
                <td colSpan={5} className="text-center py-10 text-gray-400 animate-pulse">
                  Loading purchases...
                </td>
              </tr>
            ) : paginatedData.length > 0 ? (
              paginatedData.map((row) => (
                <tr key={row.id} className="border-t hover:bg-blue-50 transition">
                  <td className="p-3">{row.purchase_no}</td>
                  <td>{formatDate(row.purchase_date)}</td>
                  <td>{formatDate(row.req_date)}</td>
                  {/* <td>{row.supplier_code}-{row.supplier_name}</td>  */}
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
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(row.status)}`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="text-center">
                    <div className="flex items-center gap-2">
 
                      {/* VIEW */}
 
                      <button
                        onClick={() =>
                          router.push(`/${company}/transactions/purchase/view?id=${row.id}`)
                        }
                        className="text-indigo-600"
                      >
                        <EyeIcon className="w-5 h-5" />
 
                      </button>
 
                      {/* EDIT */}
 
                      <button
                        onClick={() =>
                          router.push(`/${company}/transactions/purchase/add?id=${row.id}`)
                        }
                        className="text-indigo-600"
                      >
                        <PencilSquareIcon className="w-5 h-5" />
                      </button>
 
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="text-center py-10 text-gray-500">
                  No purchases found
                </td>
              </tr>
            )}
          </tbody>
        </table>
 
        {/* PAGINATION */}
        <div className="flex justify-between items-center px-6 py-4 bg-gray-50 border-t">
          <div className="flex flex-col gap-3 w-full">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{showingFrom}</span> to{" "}
                <span className="font-medium">{showingTo}</span> of{" "}
                <span className="font-medium">{totalItems}</span> results
              </p>
              <div className="flex items-center gap-2">
                <label htmlFor="purchase-rows-per-page" className="text-sm text-gray-600">
                  Rows per page
                </label>
                <select
                  id="purchase-rows-per-page"
                  value={rowsPerPage}
                  onChange={(e) => setRowsPerPage(Number(e.target.value))}
                  className="rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex flex-1 justify-between sm:hidden">
                <button
                  type="button"
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                  className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>

              <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-end">
                <nav aria-label="Pagination" className="isolate inline-flex -space-x-px rounded-md shadow-sm">
                  <button
                    type="button"
                    onClick={goToPreviousPage}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-500 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="sr-only">Previous</span>
                    <ChevronLeftIcon className="h-5 w-5" />
                  </button>

                  {pageNumbers.map((page, idx) =>
                    page === "..." ? (
                      <span
                        key={`ellipsis-${idx}`}
                        className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300"
                      >
                        ...
                      </span>
                    ) : (
                      <button
                        key={`page-${page}`}
                        type="button"
                        onClick={() => goToPage(page)}
                        aria-current={currentPage === page ? "page" : undefined}
                        className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ring-1 ring-inset ring-gray-300 ${
                          currentPage === page
                            ? "z-10 bg-indigo-600 text-white"
                            : "text-gray-900 hover:bg-gray-50"
                        }`}
                      >
                        {page}
                      </button>
                    )
                  )}

                  <button
                    type="button"
                    onClick={goToNextPage}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-500 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="sr-only">Next</span>
                    <ChevronRightIcon className="h-5 w-5" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        </div>
 
      </div>
    </div>
  );
}
 
