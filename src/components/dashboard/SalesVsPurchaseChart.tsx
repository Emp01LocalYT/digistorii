"use client";

import React, { useEffect, useState, useRef } from "react";
import { useTenant } from "@/context/TenantContext";

export default function SalesVsPurchaseChart() {
    const { company } = useTenant();
    const loaded = useRef(false);

    const [data, setData] = useState<any>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            if (!company || loaded.current) return;
            loaded.current = true;
            try {
                const res = await fetch("/api/dashboard/sales-vs-purchase", {
                    headers: {
                        "Content-Type": "application/json",
                        "x-tenant": company,
                    },
                });
                const result = await res.json();
                if (result.success) setData(result.data);
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [company]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-32">
                <span className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
                <span className="ml-2 text-sm text-gray-500">
                    Loading sales vs purchases...
                </span>
            </div>
        );
    }

    const total = data.sales + data.purchase;
    const salesPercent = total ? (data.sales / total) * 100 : 0;
    const purchasePercent = total ? (data.purchase / total) * 100 : 0;

    return (
        <div className="rounded-2xl border bg-white p-5">
            <h2 className="text-lg font-semibold mb-4">
                Sales vs Purchase
            </h2>

            <div className="space-y-4">

                {/* Sales */}
                <div>
                    <div className="flex justify-between text-sm">
                        <span>Sales</span>
                        <span className="text-gray-800 dark:text-white font-medium">{data.sales.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-gray-100 h-3 rounded mt-1">
                        <div
                            className="bg-blue-500 h-3 rounded"
                            style={{ width: `${salesPercent}%` }}
                        />
                    </div>
                </div>

                {/* Purchase */}
                <div>
                    <div className="flex justify-between text-sm">
                        <span>Purchase</span>
                        <span className="text-gray-800 dark:text-white font-medium">{data.purchase.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-gray-100 h-3 rounded mt-1">
                        <div
                            className="bg-yellow-500 h-3 rounded"
                            style={{ width: `${purchasePercent}%` }}
                        />
                    </div>
                </div>

            </div>
        </div>
    );
}