"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTenant } from "@/context/TenantContext";

type PricingDetail = {
  id: number | string;
  variant_id?: number | string;
  product_name?: string | null;
  product_code?: string | null;
  sku?: string | null;
  category_name?: string | null;
  color?: string | null;
  description?: string | null;
  source_type?: string | null;
  base_cost?: number | string;
  operational_cost?: number | string;
  landed_price?: number | string;
  margin_type?: string | null;
  margin_value?: number | string;
  margin_amount?: number | string;
  tax_percent?: number | string;
  tax_amount?: number | string;
  unit_price?: number | string;
  final_selling_price?: number | string;
  active_from?: string | null;
  expires_at?: string | null;
  is_active?: boolean;
  status?: string;
  created_at?: string | null;
  updated_at?: string | null;
  created_by?: string | null;
};

function asDate(value: unknown): string {
  return String(value ?? "").slice(0, 10);
}

function fmtMoney(value: number | string | null | undefined): string {
  if (value == null || value === "") return "-";
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  return n.toFixed(2);
}

export default function PricingViewPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { company } = useTenant();
  const [loading, setLoading] = useState(true);
  const [pricingHistory, setPricingHistory] = useState<PricingDetail[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!company || !params?.id) return;
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/pricing/${params.id}`, {
          headers: { "x-tenant": company },
        });
        const data = await res.json();
        if (!res.ok || !data?.success) {
          throw new Error(data?.message || "Failed to fetch pricing");
        }
        setPricingHistory(Array.isArray(data.pricing) ? data.pricing : []);
      } catch (err: any) {
        setError(err.message || "Failed to fetch pricing");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [company, params?.id]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error || !pricingHistory.length) {
    return (
      <div className="p-8 text-center text-red-600">
        {error || "Pricing history not found for this variant"}
      </div>
    );
  }

  const product = pricingHistory[0];
  const today = new Date().toISOString().slice(0, 10);

  const getStatusBadge = (row: PricingDetail) => {
    const isActive = row.status === "Active" || row.is_active === true;
    const isExpired = !!row.expires_at && asDate(row.expires_at) < today;
    if (isActive) return "bg-green-100 text-green-700";
    if (isExpired) return "bg-red-100 text-red-700";
    return "bg-gray-100 text-gray-700";
  };

  const getStatusLabel = (row: PricingDetail) => {
    if (row.status === "Active" || row.is_active === true) return "Active";
    if (row.expires_at && asDate(row.expires_at) < today) return "Expired";
    return row.status || "Inactive";
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Variant Pricing History</h1>
          <p className="text-sm text-gray-500">Complete pricing timeline for selected variant</p>
        </div>
        <button
          onClick={() => router.push(`/${company}/workspace/inventory/pricing`)}
          className="rounded-lg bg-[var(--color-blue-500)] px-5 py-2 text-white shadow hover:opacity-90"
        >
          Back
        </button>
      </div>

      <div className="mb-8 rounded-2xl border bg-white p-6 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-gray-500">Product Details</h3>
        <div className="grid gap-2 text-sm text-gray-700 md:grid-cols-2 lg:grid-cols-3">
          <p>
            <span className="font-medium text-gray-500">Product Code:</span> {product.product_code || "-"}
          </p>
          <p>
            <span className="font-medium text-gray-500">Product Name:</span> {product.product_name || "-"}
          </p>
          <p>
            <span className="font-medium text-gray-500">SKU:</span> {product.sku || "-"}
          </p>
          <p>
            <span className="font-medium text-gray-500">Category:</span> {product.category_name || "-"}
          </p>
          <p>
            <span className="font-medium text-gray-500">Color:</span> {product.color || "-"}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full text-sm">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="px-4 py-3 text-right font-semibold">Base Cost</th>
                <th className="px-4 py-3 text-right font-semibold">Operational Cost</th>
                <th className="px-4 py-3 text-right font-semibold">Landed Price</th>
                <th className="px-4 py-3 text-right font-semibold">Margin Amount</th>
                <th className="px-4 py-3 text-right font-semibold">Tax Amount</th>
                <th className="px-4 py-3 text-right font-semibold">Unit Price</th>
                <th className="px-4 py-3 text-right font-semibold">Selling Price</th>
                <th className="px-4 py-3 text-left font-semibold">Effective Date</th>
                <th className="px-4 py-3 text-left font-semibold">Expires At</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {pricingHistory.map((row) => (
                <tr key={String(row.id)} className="border-t">
                  <td className="px-4 py-3 text-right">{fmtMoney(row.base_cost)}</td>
                  <td className="px-4 py-3 text-right">{fmtMoney(row.operational_cost)}</td>
                  <td className="px-4 py-3 text-right">{fmtMoney(row.landed_price)}</td>
                  <td className="px-4 py-3 text-right">{fmtMoney(row.margin_amount)}</td>
                  <td className="px-4 py-3 text-right">{fmtMoney(row.tax_amount)}</td>
                  <td className="px-4 py-3 text-right">{fmtMoney(row.unit_price)}</td>
                  <td className="px-4 py-3 text-right font-semibold">{fmtMoney(row.final_selling_price)}</td>
                  <td className="px-4 py-3">{asDate(row.active_from) || "-"}</td>
                  <td className="px-4 py-3">{asDate(row.expires_at) || "-"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold uppercase ${getStatusBadge(
                        row
                      )}`}
                    >
                      {getStatusLabel(row)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
