"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { PlusIcon } from "@/icons";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { createPortal } from "react-dom";
import { ChevronUpIcon, ChevronDownIcon } from "@heroicons/react/24/solid";
import { EyeIcon, PencilSquareIcon } from "@heroicons/react/24/outline";
import { useTenant } from "@/context/TenantContext";
import { useReactToPrint } from "react-to-print";
import PrintPurchaseInvoice from "@/components/PrintPurchaseInvoice";

export default function BillingList() {
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  // const { company } = useParams();
  // const tenant = typeof window !== "undefined" ? localStorage.getItem("company") || "" : "";
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const itemsPerPage = 10;

  const { company } = useTenant();
  console.log("company:", company);

  useEffect(() => {
    const fetchBilling = async () => {
      if (!company) return;
      console.log("Fetching billing for company:", company);
      try {
        setLoading(true);
        const res = await fetch(`/api/sales`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "x-tenant": company
          },
        });

        const result = await res.json();

        // Safety Guard: Ensure data is an array before setting state
        if (result.success) {
          console.log("Fetched Billing:", result.data);
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
    fetchBilling();
  }, [company]);

  const formatDate = (date: string) => {
    if (!date) return "";
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();

    return `${day}-${month}-${year}`;
  };

  /* ================= SEARCH ================= */

  const filteredData = useMemo(() => {
    return data.filter((p) =>
      `${p.sale_no} ${p.customer_name} ${p.sale_date}`
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [data, search]);

  /* ================= SORT ================= */

  const sortedData = useMemo(() => {
    if (!sortField) return filteredData;

    return [...filteredData].sort((a: any, b: any) => {
      const valA = a[sortField];
      const valB = b[sortField];

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

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {loading &&
        createPortal(
          <div className="fixed inset-0 z-[99999] bg-black/20 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-white p-8 rounded-xl shadow-2xl flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-700 font-semibold text-lg">Loading billing...</p>
            </div>
          </div>,
          document.body
        )
      }

      <div className="flex justify-between">
        <h1 className="text-2xl font-bold">Billing List</h1>

        <button
          onClick={() => router.push(`/${company}/workspace/transactions/sales/add`)}
          className="bg-[var(--color-blue-500)] flex items-center gap-2  text-white px-4 py-2 rounded-lg"
        >
          <PlusIcon className="w-4 h-4" />
          Add Billing
        </button>
      </div>

      {/* SEARCH */}

      <div className="relative max-w-sm">
        <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" />

        <input
          type="text"
          placeholder="Search billing..."
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
                onClick={() => handleSort("sales_no")}
              >
                <div className="flex items-center gap-1">
                  Bill No

                  {sortField === "sales_no" && (
                    sortOrder === "asc"
                      ? <ChevronUpIcon className="w-4 h-4 text-blue-600" />
                      : <ChevronDownIcon className="w-4 h-4 text-blue-600" />
                  )}

                </div>
              </th>
              <th
                onClick={() => handleSort("customer_name")}><div className="flex items-center gap-1">
                  Customer

                  {sortField === "customer_name" && (
                    sortOrder === "asc"
                      ? <ChevronUpIcon className="w-4 h-4 text-blue-600" />
                      : <ChevronDownIcon className="w-4 h-4 text-blue-600" />
                  )}

                </div></th>
              <th
                onClick={() => handleSort("sales_date")}><div className="flex items-center gap-1">
                  Bill Date

                  {sortField === "sales_date" && (
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
              <th className="p-3 text-left">Action</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr className="border-t hover:bg-blue-50 transition">
                <td colSpan={5} className="text-center py-10 text-gray-400 animate-pulse">
                  Loading billing...
                </td>
              </tr>
            ) : paginatedData.length > 0 ? (
              paginatedData.map((row) => (
                <tr key={row.id} className="border-t hover:bg-blue-50 transition">
                  <td className="p-3">{row.sales_no}</td>
                  <td>{row.customer_name}</td>
                  <td>{formatDate(row.sales_date)}</td>
                  <td className="text-center pr-4">{row.total_amount}</td>
                  <td className="text-center">
                    <div className="flex items-center gap-2">

                      {/* VIEW */}

                      <button
                        onClick={() =>
                          router.push(`/${company}/workspace/transactions/sales/view?id=${row.id}`)
                        }
                        className="text-indigo-600"
                      >
                        <EyeIcon className="w-5 h-5" />

                      </button>

                      {/* EDIT */}

                      <button
                        onClick={() =>
                          router.push(`/${company}/workspace/transactions/sales/add?id=${row.id}`)
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
                  No Billing found
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* PAGINATION */}
        <div className="flex justify-between items-center px-6 py-4 bg-gray-50 border-t">
          <p className="text-sm text-gray-500">
            Showing {filteredData.length} of {filteredData.length} items
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