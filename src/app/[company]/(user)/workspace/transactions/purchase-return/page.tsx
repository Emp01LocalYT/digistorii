"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon } from "@/icons";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { createPortal } from "react-dom";
import { ChevronUpIcon, ChevronDownIcon } from "@heroicons/react/24/solid";
import { useTenant } from "@/context/TenantContext";
import { usePagination } from "@/hooks/usePagination";

export default function PurchaseReturnList() {
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const { company } = useTenant();
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const formatDate = (date: string) => {
    if (!date) return "";
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  const hasFetched = useRef(false);
  useEffect(() => {
    const fetchReturns = async () => {
      if (!company) return;
      if (hasFetched.current) return;
      hasFetched.current = true;
      try {
        setLoading(true);
        const res = await fetch(`/api/purchase-returns`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "x-tenant": company,
          },
        });

        const result = await res.json();
        if (result.success) {
          setData(result.data || []);
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
    fetchReturns();
  }, [company]);

  /* ================= SEARCH ================= */
  const filteredData = useMemo(() => {
    return data.filter((p) => {
      const matchSearch =
        `${p.purchase_return_no} ${p.txn_date} ${p.grn_no} ${p.supplier_code} ${p.supplier_name} ${p.created_by}`
          .toLowerCase()
          .includes(search.toLowerCase());
      return matchSearch;
    });
  }, [data, search]);

  /* ================= SORTING ================= */
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const sortedData = useMemo(() => {
    if (!sortField) return filteredData;

    return [...filteredData].sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortField, sortOrder]);

  /* ================= PAGINATION ================= */
  const {
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    totalItems,
    totalPages,
    showingFrom,
    showingTo,
    paginatedData,
  } = usePagination({
    data: sortedData,
    initialItemsPerPage: 10,
    resetDeps: [search],
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {loading &&
        createPortal(
          <div className="fixed inset-0 z-[99999] bg-black/20 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-white p-8 rounded-xl shadow-2xl flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-700 font-semibold text-lg">Loading returns...</p>
            </div>
          </div>,
          document.body
        )}

      <div className="flex justify-between">
        <div>
          <h1 className="text-2xl font-bold">Purchase Return / RTV</h1>
          <p className="text-sm text-gray-500">
            Manage returns to suppliers against Goods Received Notes (GRN).
          </p>
        </div>

        <button
          onClick={() => router.push(`/${company}/workspace/transactions/purchase-return/add`)}
          className="bg-[var(--color-blue-600)] flex items-center gap-2 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <PlusIcon className="w-4 h-4" />
          Add Purchase Return
        </button>
      </div>

      {/* SEARCH */}
      <div className="ui-table-card">
        <div className="ui-search-section">
          <div className="ui-search-wrapper">
            <MagnifyingGlassIcon className="ui-search-icon" />
            <input
              type="text"
              placeholder="Search purchase returns..."
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
                <th className="p-3 cursor-pointer select-none" onClick={() => handleSort("purchase_return_no")}>
                  <div className="flex items-center gap-1">
                    Return No
                    {sortField === "purchase_return_no" && (
                      sortOrder === "asc" ? <ChevronUpIcon className="w-4 h-4 text-blue-600" /> : <ChevronDownIcon className="w-4 h-4 text-blue-600" />
                    )}
                  </div>
                </th>
                <th className="p-3 cursor-pointer select-none" onClick={() => handleSort("txn_date")}>
                  <div className="flex items-center gap-1">
                    Return Date
                    {sortField === "txn_date" && (
                      sortOrder === "asc" ? <ChevronUpIcon className="w-4 h-4 text-blue-600" /> : <ChevronDownIcon className="w-4 h-4 text-blue-600" />
                    )}
                  </div>
                </th>
                <th className="p-3 cursor-pointer select-none" onClick={() => handleSort("grn_no")}>
                  <div className="flex items-center gap-1">
                    GRN No
                    {sortField === "grn_no" && (
                      sortOrder === "asc" ? <ChevronUpIcon className="w-4 h-4 text-blue-600" /> : <ChevronDownIcon className="w-4 h-4 text-blue-600" />
                    )}
                  </div>
                </th>
                <th className="p-3 cursor-pointer select-none" onClick={() => handleSort("supplier_name")}>
                  <div className="flex items-center gap-1">
                    Supplier
                    {sortField === "supplier_name" && (
                      sortOrder === "asc" ? <ChevronUpIcon className="w-4 h-4 text-blue-600" /> : <ChevronDownIcon className="w-4 h-4 text-blue-600" />
                    )}
                  </div>
                </th>
                <th className="p-3 cursor-pointer select-none" onClick={() => handleSort("refund_amount")}>
                  <div className="flex items-center gap-1">
                    Refund Amount
                    {sortField === "refund_amount" && (
                      sortOrder === "asc" ? <ChevronUpIcon className="w-4 h-4 text-blue-600" /> : <ChevronDownIcon className="w-4 h-4 text-blue-600" />
                    )}
                  </div>
                </th>
                <th className="p-3 cursor-pointer select-none" onClick={() => handleSort("created_by")}>
                  <div className="flex items-center gap-1">
                    Created By
                    {sortField === "created_by" && (
                      sortOrder === "asc" ? <ChevronUpIcon className="w-4 h-4 text-blue-600" /> : <ChevronDownIcon className="w-4 h-4 text-blue-600" />
                    )}
                  </div>
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr className="ui-table-row">
                  <td colSpan={6} className="ui-loading-row text-center p-4">
                    Loading returns...
                  </td>
                </tr>
              ) : paginatedData.length > 0 ? (
                (paginatedData as any[]).map((row: any) => (
                  <tr key={row.id} className="ui-table-row hover:bg-gray-50">
                    <td className="ui-table-td font-medium text-blue-600">{row.purchase_return_no}</td>
                    <td>{formatDate(row.txn_date)}</td>
                    <td>{row.grn_no}</td>
                    <td>
                      <div className="flex flex-col">
                        <span className="font-medium">{row.supplier_name}</span>
                        <span className="text-xs text-gray-500">{row.supplier_code}</span>
                      </div>
                    </td>
                    <td>{formatCurrency(Number(row.refund_amount || 0))}</td>
                    <td>{row.created_by}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="ui-empty-row text-center p-8 text-gray-500">
                    No purchase return record found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        <div className="ui-pagination-wrapper p-4 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Rows per page:</span>
            <select
              className="border border-gray-300 rounded px-2 py-1 text-sm bg-white"
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
            >
              {[5, 10, 20, 50].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>
              {showingFrom}-{showingTo} of {totalItems}
            </span>
            <div className="flex gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
                className="p-1 border border-gray-300 rounded disabled:opacity-50 enabled:hover:bg-gray-100"
              >
                <ChevronLeftIcon className="w-4 h-4" />
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
                className="p-1 border border-gray-300 rounded disabled:opacity-50 enabled:hover:bg-gray-100"
              >
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
