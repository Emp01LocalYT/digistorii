"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
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
import { useRouter, useSearchParams } from "next/navigation";
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

  const handleRenew = (purchaseId: number) => {
    if (!company) return;
    router.push(`/${company}/workspace/transactions/purchase/add?renewFrom=${purchaseId}`);
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
 
        <Link
          href={`/${company}/workspace/transactions/purchase/add`}
          className="bg-[var(--color-blue-600)] flex items-center gap-2  text-white px-4 py-2 rounded-lg"
        >
          <PlusIcon className="w-4 h-4" />
          Add Purchase Order
        </Link>
      </div>
 
      {/* SEARCH */}
 
      <div className="ui-table-card">
            <div className="ui-search-section">
              <div className="ui-search-wrapper">
        <MagnifyingGlassIcon className="ui-search-icon" />
 
        <input
          type="text"
          placeholder="Search purchase..."
          className="ui-input"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
        />
      </div>
            </div>
        <div className="ui-table-scroll">
        <table className="ui-table">
          <thead className="ui-table-head">
            <tr className="ui-table-row">
              <th
                className="ui-table-th"
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
              <th className="ui-table-th"
                onClick={() => handleSort("purchase_date")}><div className="flex items-center gap-1">
                  PO Date
 
                  {sortField === "purchase_date" && (
                    sortOrder === "asc"
                      ? <ChevronUpIcon className="w-4 h-4 text-blue-600" />
                      : <ChevronDownIcon className="w-4 h-4 text-blue-600" />
                  )}
 
                </div></th>
              <th className="ui-table-th"
                onClick={() => handleSort("req_date")}><div className="flex items-center gap-1">
                  Req Date
 
                  {sortField === "req_date" && (
                    sortOrder === "asc"
                      ? <ChevronUpIcon className="w-4 h-4 text-blue-600" />
                      : <ChevronDownIcon className="w-4 h-4 text-blue-600" />
                  )}
 
                </div></th>
              <th
                className="ui-table-th"
                onClick={() => handleSort("supplier")}
              >
                <div className="flex items-center gap-1">
                  Supplier
 
                  {sortField === "supplier" && (
                    sortOrder === "asc"
                      ? <ChevronUpIcon className="w-4 h-4 text-blue-600" />
                      : <ChevronDownIcon className="w-4 h-4 text-blue-600" />
                  )}
 
                </div></th>
              <th className="ui-table-th"
                onClick={() => handleSort("total_amount")}><div className="flex items-center gap-1">
                  Total Amount
 
                  {sortField === "total_amount" && (
                    sortOrder === "asc"
                      ? <ChevronUpIcon className="w-4 h-4 text-blue-600" />
                      : <ChevronDownIcon className="w-4 h-4 text-blue-600" />
                  )}
 
                </div></th>
              <th className="ui-table-th"
                onClick={() => handleSort("reject_reason")}><div className="flex items-center gap-1">
                  Reject Reason
 
                  {sortField === "reject_reason" && (
                    sortOrder === "asc"
                      ? <ChevronUpIcon className="w-4 h-4 text-blue-600" />
                      : <ChevronDownIcon className="w-4 h-4 text-blue-600" />
                  )}
 
                </div></th>
              <th className="ui-table-th"
                onClick={() => handleSort("approval_status")}><div className="flex items-center gap-1">
                  Status
 
                  {sortField === "approval_status" && (
                    sortOrder === "asc"
                      ? <ChevronUpIcon className="w-4 h-4 text-blue-600" />
                      : <ChevronDownIcon className="w-4 h-4 text-blue-600" />
                  )}
 
                </div></th>
              <th className="ui-table-th">Action</th>
            </tr>
          </thead>
 
          <tbody>
            {loading ? (
              <tr className="ui-table-row">
                <td colSpan={5} className="ui-loading-row">
                  Loading purchases...
                </td>
              </tr>
            ) : paginatedData.length > 0 ? (
              paginatedData.map((row) => (
                <tr key={row.id} className="ui-table-row">
                  <td className="ui-table-td">{row.purchase_no}</td>
                  <td className="ui-table-td">{formatDate(row.purchase_date)}</td>
                  <td className="ui-table-td">{formatDate(row.req_date)}</td>
                  {/* <td>{row.supplier_code}-{row.supplier_name}</td>  */}
                  <td className="ui-table-td">
                    <div className="flex flex-col">
                      <span className="font-medium">{row.supplier_name}</span>
                      <span className="ui-pagination-info">{row.supplier_code}</span>
                    </div>
                  </td>
                  <td className="ui-table-td">{row.total_amount}</td>
                  <td className="ui-table-td" >{row.reject_reason}</td>
                  <td className="ui-table-td">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(row.status)}`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="ui-table-td-center">
                    <div className="ui-table-actions">
 
                      {/* VIEW */}
 
                       <Link 
                       href={`/${company}/workspace/transactions/purchase/view?id=${row.id}`}
                        className="text-indigo-600"
                      >
                        <EyeIcon className="w-5 h-5" />
                       </Link>
 
                      {/* EDIT */}
 
                       <Link
                          href={`/${company}/workspace/transactions/purchase/add?id=${row.id}`}
                          className="text-indigo-600"
                        >
                          <PencilSquareIcon className="w-5 h-5" />
                        </Link>
                      {/* {String(row.status || "").toLowerCase() === "rejected" && (
                        <button
                          type="button"
                          onClick={() => handleRenew(Number(row.id))}
                          className="px-2 py-1 rounded bg-[var(--color-blue-600)] text-white text-xs font-semibold hover:opacity-90"
                        >
                          Renew
                        </button>
                      )} */}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="ui-empty-row ui-table-td-center">
                  No purchases found
                </td>
              </tr>
            )}
          </tbody>
        </table>
            </div>

        {/* PAGINATION */}
        <div className="ui-pagination-wrapper">
          <div className="flex flex-col gap-3 w-full">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="ui-pagination-info">
                Showing <span className="font-medium">{showingFrom}</span> to{" "}
                <span className="font-medium">{showingTo}</span> of{" "}
                <span className="font-medium">{totalItems}</span> results
              </p>
              <div className="ui-table-actions">
                <label htmlFor="purchase-rows-per-page" className="text-sm text-gray-600">
                  Rows per page
                </label>
                <select
                  id="purchase-rows-per-page"
                  value={rowsPerPage}
                  onChange={(e) => setRowsPerPage(Number(e.target.value))}
                  className="ui-pagination-select"
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
                  className="ui-pagination-icon-btn rounded-md"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                  className="ui-pagination-icon-btn rounded-md ml-3"
                >
                  Next
                </button>
              </div>

              <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-end">
                <nav aria-label="Pagination" className="ui-pagination-nav">
                  <button
                    type="button"
                    onClick={goToPreviousPage}
                    disabled={currentPage === 1}
                    className="ui-pagination-icon-btn rounded-l-md"
                  >
                    <span className="sr-only">Previous</span>
                    <ChevronLeftIcon className="h-5 w-5" />
                  </button>

                  {pageNumbers.map((page, idx) =>
                    page === "..." ? (
                      <span
                        key={`ellipsis-${idx}`}
                        className="ui-pagination-btn ui-pagination-btn-inactive"
                      >
                        ...
                      </span>
                    ) : (
                      <button
                        key={`page-${page}`}
                        type="button"
                        onClick={() => goToPage(page)}
                        aria-current={currentPage === page ? "page" : undefined}
                        className={`ui-pagination-btn ${
                          currentPage === page
                            ? "ui-pagination-btn-active" : "ui-pagination-btn-inactive"
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
                    className="ui-pagination-icon-btn rounded-r-md"
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
 








