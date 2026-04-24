"use client";

import React, { useEffect, useState, useRef } from "react";
import { useTenant } from "@/context/TenantContext";
import { useRouter } from "next/navigation";

export default function GrnStatusWise() {
    const { company } = useTenant();
    const router = useRouter();
    const loaded = useRef(false);

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any[]>([]);

    useEffect(() => {
        const load = async () => {
            if (!company) return;
            if (loaded.current) return;

            loaded.current = true;

            try {
                setLoading(true);

                const res = await fetch("/api/dashboard/grn-status-wise", {
                    headers: {
                        "Content-Type": "application/json",
                        "x-tenant": company,
                    },
                });

                const result = await res.json();

                if (result.success) setData(result.data);
            } catch (err) {
                console.error("GRN Status Load Error", err);
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [company]);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "Completed":
                return "bg-gray-300";
            case "Partial":
                return "bg-indigo-400";
            case "Pending":
                return "bg-blue-400";
            default:
                return "bg-gray-200";
        }
    };

    const handleClick = (status: string) => {
        router.push(
            `/${company}/transactions/grn?status=${encodeURIComponent(status)}`
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-32">
                <span className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
                <span className="ml-2 text-sm text-gray-500">
                    Loading GRN status Overview...
                </span>
            </div>
        );
    }

    return (
        <div className="rounded-2xl border bg-white p-5">
            <h2 className="text-lg font-semibold mb-4">GRN Status Overview</h2>

            {data.map((item, i) => (
                <div
                    key={i}
                    onClick={() => handleClick(item.status)}
                    className="flex items-center justify-between mb-3 cursor-pointer"
                >
                    {/* STATUS */}
                    <span className="text-sm text-blue-600 hover:underline">
                        {item.status}
                    </span>

                    {/* PROGRESS BAR */}
                    <div className="flex-1 mx-3 bg-gray-100 rounded-full h-3 relative overflow-hidden">
                        <div
                            className={`h-3 rounded-full ${getStatusBadge(item.status)} transition-all duration-500`}
                            style={{
                                width: `${Math.min(item.completion_percentage, 100)}%`,
                            }}
                        />

                        {/* Percentage text inside bar */}
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-gray-700">
                            {item.completion_percentage}%
                        </span>
                    </div>

                    {/* VALUE DISPLAY */}
                    <div className="flex justify-between text-xs text-gray-600 mt-1">
                        <span>
                            Received: <b>{item.total_grn_qty}</b> / Ordered: <b>{item.total_purchase_qty}</b>
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
}