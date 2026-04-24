"use client";

import React, { useEffect, useState, useRef } from "react";
import { useTenant } from "@/context/TenantContext";
import { useRouter } from "next/navigation";


export default function PoStatusWise() {
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
                const res = await fetch("/api/dashboard/po-status-wise", {
                    headers: {
                        "Content-Type": "application/json",
                        "x-tenant": company,
                    },
                });

                const result = await res.json();
                if (result.success) setData(result.data);
            } catch (err) {
                console.error("PO GRN Pending Load Error", err);
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [company]);

    const getColor = (status: string) => {
        switch (status) {
            case "Approved":
                return "bg-blue-400";
            case "Awaiting for approval":
                return "bg-yellow-400";
            case "Completed":
                return "bg-gray-300";
            case "Partial":
                return "bg-indigo-400";
            case "Rejected":
                return "bg-red-400";
            default:
                return "bg-gray-200";
        }
    };

    const handleClick = (status: string) => {
        router.push(
            `/${company}/transactions/purchase?status=${encodeURIComponent(status)}`
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-32">
                <span className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
                <span className="ml-2 text-sm text-gray-500">
                    Loading PO status wise data...
                </span>
            </div>
        );
    }

    return (
        <div className="rounded-2xl border bg-white p-5">
            <h2 className="text-lg font-semibold mb-4">PO Status wise</h2>

            {data.map((item, i) => (
                <div
                    key={i}
                    className="flex items-center justify-between mb-3 cursor-pointer"
                    onClick={() => handleClick(item.status)}
                >
                    <span className="text-sm text-blue-600 hover:underline">
                        {item.status}
                    </span>

                    <div className="flex-1 mx-3 bg-gray-100 rounded-full h-3">
                        <div
                            className={`h-3 rounded-full ${getColor(item.status)}`}
                            style={{ width: `${item.percentage}%` }}
                        />
                    </div>

                    <span className="text-sm">{item.count}</span>
                </div>
            ))}
        </div>
    );
}