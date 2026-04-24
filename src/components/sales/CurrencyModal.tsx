"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

type CurrencyModalProps = {
  open: boolean;
  currencies: any[];
  initialLoading: boolean;
  errorMessage?: string;
  onClose: () => void;
  onSelect: (currency: any) => void;
};

const currencysPerPage = 8;

export default function CurrencyModal({
  open,
  currencies,
  initialLoading,
  errorMessage,
  onClose,
  onSelect,
}: CurrencyModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!open) return;
    setSearchTerm("");
    setCurrentPage(1);
  }, [open]);

  const filteredCurrencies = useMemo(() => {
    return currencies.filter((cur) =>
      cur.currency_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cur.currency_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [currencies, searchTerm]);

  const totalPages = Math.ceil(filteredCurrencies.length / currencysPerPage);
  const paginatedCurrencies = filteredCurrencies.slice(
    (currentPage - 1) * currencysPerPage,
    currentPage * currencysPerPage
  );

  const getPageNumbers = () => {
    const pages: number[] = [];
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

    for (let i = start; i <= end; i += 1) {
      pages.push(i);
    }

    return { pages, start, end };
  };

  const { pages, start, end } = getPageNumbers();

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-black/40 backdrop-blur-sm flex items-center justify-center">
      <div className="w-[900px] h-[600px] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-3 border-b bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-700">Select Currency</h2>

          <div className="flex items-center gap-3">
            {errorMessage && (
              <span className="text-red-500 text-sm font-medium">{errorMessage}</span>
            )}

            <button
              onClick={onClose}
              className="text-gray-500 hover:text-black text-xl"
            >
              &times;
            </button>
          </div>
        </div>

        <div className="p-4 border-b bg-white">
          <input
            type="text"
            placeholder="Search Currency Code / Name..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {initialLoading ? (
            <div className="flex justify-center items-center h-full text-gray-500">
              Loading Currencies...
            </div>
          ) : filteredCurrencies.length === 0 ? (
            <div className="flex flex-col justify-center items-center h-full text-gray-400 gap-2">
              <p>No Currencies found</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-indigo-50 text-gray-600 text-sm sticky top-0">
                <tr>
                  <th className="p-3 text-left">Currency Code</th>
                  <th className="p-3 text-left">Currency Name</th>
                </tr>
              </thead>

              <tbody>
                {paginatedCurrencies.map((cr) => (
                  <tr
                    key={cr.id}
                    onClick={() => onSelect(cr)}
                    className="border-t hover:bg-blue-50 cursor-pointer transition"
                  >
                    <td className="p-3 font-medium text-blue-600">{cr.currency_code}</td>
                    <td className="p-3 text-gray-600">{cr.currency_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex justify-between items-center px-6 py-4 bg-gray-50 border-t">
          <p className="text-sm text-gray-500">
            Showing {(currentPage - 1) * currencysPerPage + 1}-
            {Math.min(currentPage * currencysPerPage, filteredCurrencies.length)} of{" "}
            {filteredCurrencies.length} items
          </p>

          <div className="flex items-center gap-1">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="px-3 py-1 text-sm border rounded bg-white disabled:opacity-50 hover:bg-gray-100"
            >
              Prev
            </button>

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

            {pages.map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-1 border rounded ${
                  currentPage === page ? "bg-blue-600 text-white" : "bg-white"
                }`}
              >
                {page}
              </button>
            ))}

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

            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((c) => c + 1)}
              className="px-3 py-1 text-sm border rounded bg-white disabled:opacity-50 hover:bg-gray-100"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
