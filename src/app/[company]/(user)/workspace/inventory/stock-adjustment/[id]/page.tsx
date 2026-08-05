"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { useTenant } from "@/context/TenantContext";
import { apiFetch } from "@/lib/apiFetch";

type StockAdjustmentLineItem = {
  item_id: number;
  system_qty: string | number;
  physical_qty: string | number;
  adjustment_qty: string | number;
  product_name: string;
  sku: string;
  color: string | null;
};

type StockAdjustmentDetails = {
  adjustment_id: number;
  txn_date: string;
  reason: string | null;
  created_by: string;
  created_at: string;
  warehouse_name: string | null;
  locator_name: string | null;
  items: StockAdjustmentLineItem[];
};

export default function StockAdjustmentViewPage() {
  const params = useParams();
  const router = useRouter();
  const { company } = useTenant();
  const id = params.id as string;

  const [details, setDetails] = useState<StockAdjustmentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!company || !id) return;

    const fetchDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/stock-adjustments/${id}`, {
          headers: { "x-tenant": company },
        });
        const data = await res.json();
        if (data.success) {
          setDetails(data.data);
        } else {
          setError(data.error || "Failed to load stock adjustment details");
        }
      } catch (err: any) {
        setError(err.message || "An unexpected error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [company, id]);

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-40 bg-gray-200 rounded-xl"></div>
          <div className="h-64 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6 text-center py-20">
        <div className="text-red-500 text-xl font-medium mb-4">{error}</div>
        <Link
          href={`/${company}/workspace/inventory/stock-adjustment`}
          className="text-indigo-600 hover:text-indigo-800 font-medium"
        >
          &larr; Back to Stock Adjustments
        </Link>
      </div>
    );
  }

  if (!details) return null;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 text-gray-500 hover:text-gray-900 bg-white rounded-full shadow-sm border border-gray-200 transition-colors"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">Stock Adjustment #{details.adjustment_id}</h1>
          <p className="text-sm text-gray-500">
            Recorded on {new Date(details.txn_date).toLocaleDateString()} by {details.created_by}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 mb-1">Date</p>
          <p className="font-semibold text-gray-900">{new Date(details.txn_date).toLocaleDateString()}</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 mb-1">Warehouse</p>
          <p className="font-semibold text-gray-900">{details.warehouse_name || "-"}</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 mb-1">Locator</p>
          <p className="font-semibold text-gray-900">{details.locator_name || "-"}</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 mb-1">Reason</p>
          <p className="font-semibold text-gray-900">{details.reason || "-"}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-800">Adjusted Items</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white text-gray-500 text-xs uppercase font-medium border-b border-gray-200">
              <tr>
                <th className="p-4 text-left">SKU</th>
                <th className="p-4 text-left">Product Name</th>
                <th className="p-4 text-left">Color</th>
                <th className="p-4 text-right">System Qty</th>
                <th className="p-4 text-right">Physical Qty</th>
                <th className="p-4 text-right">Adjustment Qty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {details.items.length > 0 ? (
                details.items.map((item) => (
                  <tr key={item.item_id} className="hover:bg-blue-50 transition">
                    <td className="p-4 font-mono text-gray-700">{item.sku}</td>
                    <td className="p-4 font-medium text-gray-900">{item.product_name}</td>
                    <td className="p-4 text-gray-600">{item.color || "-"}</td>
                    <td className="p-4 text-right text-gray-600">{item.system_qty}</td>
                    <td className="p-4 text-right font-semibold text-gray-900">{item.physical_qty}</td>
                    <td className={`p-4 text-right font-bold ${Number(item.adjustment_qty) > 0 ? "text-green-600" : Number(item.adjustment_qty) < 0 ? "text-red-600" : "text-gray-500"}`}>
                      {Number(item.adjustment_qty) > 0 ? `+${item.adjustment_qty}` : item.adjustment_qty}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                    No items found for this adjustment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
