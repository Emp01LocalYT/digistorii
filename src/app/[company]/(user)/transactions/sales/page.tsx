"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
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
import { usePagination } from "@/hooks/usePagination";

export default function BillingList() {
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const { company } = useTenant();
  const hasLoggedTenant = useRef(false);
  useEffect(() => {
    if (!company || hasLoggedTenant.current) return;
    hasLoggedTenant.current = true;
    console.log("Company:", company);
  }, [company]);

  const hasFetched = useRef(false);
  useEffect(() => {
    const fetchBilling = async () => {
      if (!company || hasFetched.current) return;
      hasFetched.current = true;
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
      `${p.sale_no} ${p.customer_name} ${p.sale_date} ${p.total_amount}`
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [data, search]);

  /* ================= SORT ================= */

  const sortedData = useMemo(() => {
    if (!sortField) return filteredData;

    return [...filteredData].sort((a: any, b: any) => {
      // const valA = a[sortField];
      // const valB = b[sortField];
      let valA;
      let valB;

      if (sortField === "currecny") {
        valA = `${a.currency_code} ${a.currency_name}`.toLowerCase();
        valB = `${b.currency_code} ${b.currency_name}`.toLowerCase();
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
    resetDeps: [search, sortField, sortOrder],
  });

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
          onClick={() => router.push(`/${company}/transactions/sales/add`)}
          className="bg-[var(--color-blue-600)] flex items-center gap-2  text-white px-4 py-2 rounded-lg"
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
                onClick={() => handleSort("sales_date")}><div className="flex items-center gap-1">
                  Bill Date

                  {sortField === "sales_date" && (
                    sortOrder === "asc"
                      ? <ChevronUpIcon className="w-4 h-4 text-blue-600" />
                      : <ChevronDownIcon className="w-4 h-4 text-blue-600" />
                  )}

                </div></th>
              <th
                onClick={() => handleSort("customer_name")}><div className="flex items-center gap-1">
                  Customer

                  {sortField === "customer_name" && (
                    sortOrder === "asc"
                      ? <ChevronUpIcon className="w-4 h-4 text-blue-600" />
                      : <ChevronDownIcon className="w-4 h-4 text-blue-600" />
                  )}

                </div></th>
              {/* <th
                onClick={() => handleSort("currency")}><div className="flex items-center gap-1">
                  Currency

                  {sortField === "currency" && (
                    sortOrder === "asc"
                      ? <ChevronUpIcon className="w-4 h-4 text-blue-600" />
                      : <ChevronDownIcon className="w-4 h-4 text-blue-600" />
                  )}

                </div></th> */}
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
              // paginatedData.map((row) => (
              //   <tr key={row.id} className="border-t hover:bg-blue-50 transition">
              //     <td className="p-3">{row.sales_no}</td>
              //     <td>{formatDate(row.sales_date)}</td>
              //     <td>{row.customer_name}</td>
              //      <td>
              //       <div className="flex flex-col">
              //         <span className="font-medium">{row.currency_name}</span>
              //         <span className="text-sm text-gray-500">{row.currency_code}</span>
              //       </div>
              //     </td>
              //     <td className="text-center pr-4">{row.total_amount}</td>
              //     <td className="text-center">
              //       <div className="flex items-center gap-2">

              //         {/* VIEW */}

              //         <button
              //           onClick={() =>
              //             router.push(`/${company}/transactions/sales/view?id=${row.id}`)
              //           }
              //           className="text-indigo-600"
              //         >
              //           <EyeIcon className="w-5 h-5" />

              //         </button>

              //         {/* EDIT */}

              //         <button
              //           onClick={() =>
              //             router.push(`/${company}/transactions/sales/add?id=${row.id}`)
              //           }
              //           className="text-indigo-600"
              //         >
              //           <PencilSquareIcon className="w-5 h-5" />
              //         </button>

              //       </div>
              //     </td>
              //   </tr>
              // ))
              paginatedData.map((row) => {
                const isOverseas = row.currency_code !== "INR";
                console.log("row.currency_code : ", row.currency_code, " Converstion rate : ", row.conversion_rate);

                const totalAmount = Number(row.total_amount || 0);

                const overseasAmount = isOverseas
                  ? totalAmount * Number(row.conversion_rate || 0)
                  : 0;
                console.log("row.overseasAmount : ", overseasAmount);


                return (
                  <tr key={row.id} className="border-t hover:bg-blue-50 transition">

                    <td className="p-3">{row.sales_no}</td>

                    <td>{formatDate(row.sales_date)}</td>

                    <td>{row.customer_name}</td>

                    {/* Currency */}
                    {/* <td>
                      <div className="flex flex-col">
                        <span className="font-medium">{row.currency_name}</span>
                        <span className="text-sm text-gray-500">{row.currency_code}</span>
                      </div>
                    </td> */}

                    {/* Amount */}
                    <td>
                      {/* <div className="flex flex-col items-end"> */}

                        {/* FIRST LINE */}
                        <span className="font-semibold">
                          {/* {isOverseas
              ? `${totalAmount} ${row.currency_code}`   
              : `₹ ${totalAmount.toFixed(2)}`          
            } */}
                          {totalAmount.toFixed(2)}
                        </span>

                        {/* SECOND LINE */}
                        {/* {isOverseas && (
                          <span className="text-sm text-gray-500">
                            ₹ {overseasAmount.toFixed(2)}  ${row.currency_code}

                          </span>
                        )} */}

                      {/* </div> */}
                    </td>


                    {/* Actions */}
                    <td>
                      {/* <div className="flex items-center gap-2 justify-center"> */}

                        <button
                          onClick={() =>
                            router.push(`/${company}/transactions/sales/view?id=${row.id}`)
                          }
                          className="text-indigo-600"
                        >
                          <EyeIcon className="w-5 h-5" />
                        </button>

                        <button
                          onClick={() =>
                            router.push(`/${company}/transactions/sales/add?id=${row.id}`)
                          }
                          className="text-indigo-600"
                        >
                          <PencilSquareIcon className="w-5 h-5" />
                        </button>

                      {/* </div> */}
                    </td>

                  </tr>
                );
              })
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
          <div className="flex flex-col gap-3 w-full">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{showingFrom}</span> to{" "}
                <span className="font-medium">{showingTo}</span> of{" "}
                <span className="font-medium">{totalItems}</span> results
              </p>
              <div className="flex items-center gap-2">
                <label htmlFor="sales-rows-per-page" className="text-sm text-gray-600">
                  Rows per page
                </label>
                <select
                  id="sales-rows-per-page"
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
