"use client";
// import type { Metadata } from "next";
import React, { useEffect, useState, useRef } from "react";
import { useTenant } from "@/context/TenantContext";
import { useRouter } from "next/navigation";

// export const metadata: Metadata = {
//   title: "PO - GRN Pending",
//   description: "Pending Purchase Orders for GRN Creation",
// };

export default function PoGrnPendingTable() {
    const { company } = useTenant();
    const router = useRouter();

    const loaded = useRef(false);
    const [loading, setLoading] = useState(true);

    const [data, setData] = useState<any[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    useEffect(() => {
        const loadData = async () => {
            if (!company) return;
            if (loaded.current) return;
            loaded.current = true;

            try {
                setLoading(true);

                const res = await fetch("/api/dashboard/po-grn-pending", {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        "x-tenant": company,
                    },
                });

                const result = await res.json();

                if (result.success) {
                    setData(result.data);
                }
            } catch (err) {
                console.error("PO GRN Pending Load Error", err);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [company]);

    // Row Click → Navigate to GRN
    const handleRowClick = (row: any) => {
        router.push(
            `/${company}/transactions/grn/add?po_id=${row.purchase_id}&po_no=${row.purchase_no}`
        );
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

    const filteredData = data;

    const totalPages = Math.ceil(filteredData.length / itemsPerPage);

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

    const paginatedData = filteredData.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Loader
    if (loading) {
        return (
            <div className="flex items-center justify-center h-32">
                <span className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
                <span className="ml-2 text-sm text-gray-500">
                    Loading PO - GRN pending data...
                </span>
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="text-lg font-semibold mb-4">
                PO - GRN Pending (Pending Purchase Orders for GRN Creation)
            </h2>

            <div className="bg-white rounded-2xl shadow-lg overflow-x-auto">
                <table className="w-full text-sm table-auto">
                    <thead className="bg-indigo-50 text-gray-600 text-sm">
                        <tr className="border-t hover:bg-blue-50 transition">
                            <th className="p-2 whitespace-nowrap">PO No</th>
                            <th className="p-2 whitespace-nowrap">Date</th>
                            <th className="p-2 whitespace-nowrap">Supplier</th>
                            <th className="p-2 whitespace-nowrap">Total Qty</th>
                            <th className="p-2 whitespace-nowrap">Received Qty</th>
                            <th className="p-2 whitespace-nowrap">Pending Qty</th>
                            <th className="p-2 whitespace-nowrap">Status</th>
                        </tr>
                    </thead>

                    <tbody>
                        {data.length === 0 ? (
                            <>
                                {/* Fixed empty rows */}
                                {[...Array(itemsPerPage)].map((_, index) => (
                                    <tr key={index} className="border-t bg-gray-50 h-10">
                                        <td colSpan={7} />
                                    </tr>
                                ))}

                                {/* No data message */}
                                <tr>
                                    <td colSpan={7} className="text-center py-4 text-gray-400 text-sm">
                                        No pending GRN records found
                                    </td>
                                </tr>
                            </>
                        ) : (
                            [...Array(itemsPerPage)].map((_, index) => {
                                const row = paginatedData[index];

                                return (
                                    <tr
                                        key={index}
                                        className={`border-t h-10 ${row ? "hover:bg-blue-50 cursor-pointer transition" : "bg-gray-50"
                                            }`}
                                    >
                                        {/* PO No */}
                                        <td className="px-2 text-blue-600 font-medium whitespace-nowrap">
                                            {row && (
                                                <button
                                                    onClick={() => handleRowClick(row)}
                                                    className="hover:underline"
                                                >
                                                    {row.purchase_no}
                                                </button>
                                            )}
                                        </td>

                                        {/* Date */}
                                        <td className="px-2 whitespace-nowrap">
                                            {row && formatDate(row.purchase_date)}
                                        </td>

                                        {/* Supplier */}
                                        <td className="px-2 whitespace-nowrap">
                                            {row && `${row.supplier_code} - ${row.supplier_name}`}
                                        </td>

                                        {/* Total Qty */}
                                        <td className="px-2 text-right whitespace-nowrap">
                                            {row && row.total_qty}
                                        </td>

                                        {/* Received Qty */}
                                        <td className="px-2 text-right whitespace-nowrap">
                                            {row && row.received_qty}
                                        </td>

                                        {/* Pending Qty */}
                                        <td className="px-2 text-red-600 font-medium text-right whitespace-nowrap">
                                            {row && row.pending_qty}
                                        </td>

                                        {/* Status */}
                                        <td className="px-2 text-center whitespace-nowrap">
                                            {row && (
                                                <span
                                                    className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(
                                                        row.po_status
                                                    )}`}
                                                >
                                                    {row.po_status}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
                {/* PAGINATION HERE */}
                <div className="flex justify-between items-center px-6 py-4 bg-gray-50 border-t">

                    <p className="text-sm text-gray-500">
                        Showing {(currentPage - 1) * itemsPerPage + 1}
                        -
                        {Math.min(currentPage * itemsPerPage, filteredData.length)} of {filteredData.length} items
                    </p>

                    <div className="flex items-center gap-1">

                        {/* PREV */}
                        <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(c => c - 1)}
                            className="px-3 py-1 text-sm border rounded bg-white disabled:opacity-50"
                        >
                            Prev
                        </button>

                        {/* First Page */}
                        {start > 1 && (
                            <>
                                <button
                                    onClick={() => setCurrentPage(1)}
                                    className="px-3 py-1 border rounded"
                                >
                                    1
                                </button>
                                {start > 2 && <span className="px-2">...</span>}
                            </>
                        )}

                        {/* Middle Pages */}
                        {pages.map((page) => (
                            <button
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                className={`px-3 py-1 border rounded ${currentPage === page
                                    ? "bg-[var(--color-blue-600)] text-white"
                                    : "bg-white text-gray-600 hover:bg-gray-100"
                                    }`}
                            >
                                {page}
                            </button>
                        ))}

                        {/* Last Page */}
                        {end < totalPages && (
                            <>
                                {end < totalPages - 1 && <span className="px-2">...</span>}
                                <button
                                    onClick={() => setCurrentPage(totalPages)}
                                    className="px-3 py-1 border rounded"
                                >
                                    {totalPages}
                                </button>
                            </>
                        )}

                        {/* NEXT */}
                        <button
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(c => c + 1)}
                            className="px-3 py-1 text-sm border rounded bg-white disabled:opacity-50"
                        >
                            Next
                        </button>

                    </div>
                </div>
            </div>
        </div>
    );
}