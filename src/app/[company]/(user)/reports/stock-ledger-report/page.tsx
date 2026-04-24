"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTenant } from "@/context/TenantContext";
import { useCompanySettings } from "@/context/CompanySettingsContext";

type ReportRow = {
  txn_date: string;
  txn_type: string;
  document_no: string;
  warehouse_name: string | null;
  locator_name: string | null;
  product_name: string | null;
  sku: string | null;
  qty_in: number;
  qty_out: number;
};

export default function StockLedgerReport() {
  const { company } = useTenant();
  const { settings } = useCompanySettings();

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [data, setData] = useState<ReportRow[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<string | null>("txn_date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const itemsPerPage = 10;

  const formatDate = (date: string) => {
    if (!date) return "";
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const hasSettingsFetched = useRef(false);
  useEffect(() => {
    if (!company || hasSettingsFetched.current) return;
    hasSettingsFetched.current = true;
    if (settings?.financialYearStart && settings?.financialYearEnd) {
      setFromDate(settings.financialYearStart);
      setToDate(settings.financialYearEnd);
    }
  }, [settings, company]);

  const isFetchingReport = useRef(false);
  const loadReport = async () => {
    if (!company || isFetchingReport.current) return;
    setMessage("");
    setData([]);
    setCurrentPage(1);

    if (!fromDate || !toDate) {
      setMessage("From Date and To Date required");
      return;
    }
    if (new Date(fromDate) > new Date(toDate)) {
      setMessage("From Date cannot be greater than To Date");
      return;
    }
    try {
      isFetchingReport.current = true;
      setLoading(true);
      const res = await fetch(
        `/api/reports/stock-ledger?from=${fromDate}&to=${toDate}`,
        { headers: { "x-tenant": company } }
      );
      const result = await res.json();
      if (!result.success) {
        setMessage(result.message || "Failed to load report");
        return;
      }
      if (!result.data || result.data.length === 0) {
        setMessage("No data available");
        return;
      }
      setData(result.data);
    } catch {
      setMessage("Server error while loading report");
    } finally {
      setLoading(false);
      isFetchingReport.current = false;
    }
  };

  const totalPages = Math.ceil(data.length / itemsPerPage);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, currentPage + 2);

    if (currentPage <= 3) {
      start = 1;
      end = Math.min(totalPages, maxVisible);
    }

    if (currentPage > totalPages - 3) {
      start = Math.max(1, totalPages - maxVisible + 1);
      end = totalPages;
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return { pages, start, end };
  };

  const { pages, start, end } = getPageNumbers();

  const handleSort = (field: string) => {
    setSortOrder(sortField === field && sortOrder === "asc" ? "desc" : "asc");
    setSortField(field);
    setCurrentPage(1);
  };

  const sortedData = useMemo(() => {
    if (!sortField) return data;
    return [...data].sort((a: any, b: any) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (sortField === "txn_date") {
        valA = new Date(a.txn_date).getTime();
        valB = new Date(b.txn_date).getTime();
      }
      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [data, sortField, sortOrder]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = currentPage * itemsPerPage;
    return sortedData.slice(start, end);
  }, [sortedData, currentPage]);

  const totalIn = data.reduce((sum, row) => sum + Number(row.qty_in || 0), 0);
  const totalOut = data.reduce((sum, row) => sum + Number(row.qty_out || 0), 0);
  const pageIn = paginatedData.reduce((sum, row) => sum + Number(row.qty_in || 0), 0);
  const pageOut = paginatedData.reduce((sum, row) => sum + Number(row.qty_out || 0), 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {loading &&
        createPortal(
          <div className="fixed inset-0 z-[99999] bg-black/20 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-white p-8 rounded-xl shadow-2xl flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-700 font-semibold text-lg">
                Loading report...
              </p>
            </div>
          </div>,
          document.body
        )
      }

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Stock Ledger Report</h1>
        {message && <div className="text-red-500 font-medium">{message}</div>}
      </div>

      <div className="bg-white p-6 rounded-xl shadow grid md:grid-cols-5 gap-4">
        <div>
          <label className="text-sm font-medium block mb-1">From Date</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="border p-2 rounded w-full"
          />
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">To Date</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="border p-2 rounded w-full"
          />
        </div>

        <div className="flex items-end">
          <button
            onClick={loadReport}
            disabled={loading}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700"
          >
            {loading ? "Loading..." : "Search"}
          </button>
        </div>
      </div>

      {data.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-indigo-50 text-gray-600 text-sm">
              <tr className="border-t hover:bg-blue-50 transition">
                <th className="p-3 text-left" onClick={() => handleSort("txn_date")}>Date</th>
                <th className="p-3 text-left" onClick={() => handleSort("txn_type")}>Document Type</th>
                <th className="p-3 text-left" onClick={() => handleSort("document_no")}>Document Number</th>
                <th className="p-3 text-left" onClick={() => handleSort("warehouse_name")}>Warehouse</th>
                <th className="p-3 text-left" onClick={() => handleSort("locator_name")}>Locator</th>
                <th className="p-3 text-left" onClick={() => handleSort("product_name")}>Product</th>
                <th className="p-3 text-right" onClick={() => handleSort("qty_in")}>Qty In</th>
                <th className="p-3 text-right" onClick={() => handleSort("qty_out")}>Qty Out</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((row, index) => (
                <tr key={index} className="border-t hover:bg-blue-50 transition">
                  <td className="p-3">{formatDate(row.txn_date)}</td>
                  <td className="p-3">{row.txn_type}</td>
                  <td className="p-3">{row.document_no}</td>
                  <td className="p-3">{row.warehouse_name || "-"}</td>
                  <td className="p-3">{row.locator_name || "-"}</td>
                  <td className="p-3">
                    <div className="flex flex-col">
                      <span className="font-medium">{row.product_name || "-"}</span>
                      <span className="text-gray-500 text-sm">{row.sku || ""}</span>
                    </div>
                  </td>
                  <td className="p-3 text-right">{Number(row.qty_in || 0)}</td>
                  <td className="p-3 text-right">{Number(row.qty_out || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
            <p className="text-sm text-gray-500">
              Showing {(currentPage - 1) * itemsPerPage + 1}-
              {Math.min(currentPage * itemsPerPage, data.length)} of {data.length} items
            </p>
            <div className="flex gap-6 text-sm font-medium text-gray-700">
              <div>Page In: <span className="font-bold">{pageIn}</span></div>
              <div>Page Out: <span className="font-bold">{pageOut}</span></div>
              <div>Total In: <span className="font-bold">{totalIn}</span></div>
              <div>Total Out: <span className="font-bold">{totalOut}</span></div>
            </div>
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(c => c - 1)}
                className="px-3 py-1 text-sm border rounded bg-white disabled:opacity-50 hover:bg-gray-100"
              >
                Prev
              </button>

              {start > 1 && (
                <>
                  <button onClick={() => setCurrentPage(1)} className="px-3 py-1 border rounded">1</button>
                  {start > 2 && <span className="px-2">...</span>}
                </>
              )}

              {pages.map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1 border rounded ${
                    currentPage === page
                      ? "bg-[var(--color-blue-600)] text-white"
                      : "bg-white text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {page}
                </button>
              ))}

              {end < totalPages && (
                <>
                  {end < totalPages - 1 && <span className="px-2">...</span>}
                  <button onClick={() => setCurrentPage(totalPages)} className="px-3 py-1 border rounded">
                    {totalPages}
                  </button>
                </>
              )}

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(c => c + 1)}
                className="px-3 py-1 text-sm border rounded bg-white disabled:opacity-50 hover:bg-gray-100"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
