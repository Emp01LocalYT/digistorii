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

      <div className="ui-table-card">
            <div className="ui-search-section">
              <div className="ui-search-wrapper">
        <MagnifyingGlassIcon className="ui-search-icon" />

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
            </div>
        <div className="ui-table-scroll">
        <table className="ui-table">
          <thead className="ui-table-head">
            <tr className="ui-table-row">
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
              <th className="ui-table-th-center">Action</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr className="ui-table-row">
                <td colSpan={5} className="ui-loading-row">
                  Loading billing...
                </td>
              </tr>
            ) : paginatedData.length > 0 ? (
              // paginatedData.map((row) => (
              //   <tr key={row.id} className="ui-table-row">
              //     <td className="ui-table-td">{row.sales_no}</td>
              //     <td>{formatDate(row.sales_date)}</td>
              //     <td>{row.customer_name}</td>
              //      <td>
              //       <div className="flex flex-col">
              //         <span className="font-medium">{row.currency_name}</span>
              //         <span className="ui-pagination-info">{row.currency_code}</span>
              //       </div>
              //     </td>
              //     <td className="text-center pr-4">{row.total_amount}</td>
              //     <td className="ui-table-td-center">
              //       <div className="ui-table-actions">

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
                  <tr key={row.id} className="ui-table-row">

                    <td className="ui-table-td">{row.sales_no}</td>

                    <td>{formatDate(row.sales_date)}</td>

                    <td>{row.customer_name}</td>

                    {/* Currency */}
                    {/* <td>
                      <div className="flex flex-col">
                        <span className="font-medium">{row.currency_name}</span>
                        <span className="ui-pagination-info">{row.currency_code}</span>
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
                          <span className="ui-pagination-info">
                            ₹ {overseasAmount.toFixed(2)}  ${row.currency_code}

                          </span>
                        )} */}

                      {/* </div> */}
                    </td>


                    {/* Actions */}
                     <td className="ui-table-td-center">
                          <div className="ui-table-actions">

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

                      </div>
                    </td>

                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="ui-empty-row ui-table-td-center">
                  No Billing found
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
                <label htmlFor="sales-rows-per-page" className="text-sm text-gray-600">
                  Rows per page
                </label>
                <select
                  id="sales-rows-per-page"
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








