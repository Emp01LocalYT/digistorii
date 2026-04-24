"use client";

import React, { useEffect, useState, useRef } from "react";
import Badge from "../ui/badge/Badge";
import { ArrowDownIcon, ArrowUpIcon, BoxIconLine, GroupIcon } from "@/icons";
import { useTenant } from "@/context/TenantContext";

export const EcommerceMetrics = () => {
  const { company } = useTenant();
  const loaded = useRef(false);
  const [loading, setLoading] = useState(true);

  const [metrics, setMetrics] = useState({
    customers: 0,
    orders: 0,
    customerGrowth: 0,
    orderGrowth: 0,
  });

  useEffect(() => {
    const loadMetrics = async () => {
      if (!company) return;
      if (loaded.current) return;
      loaded.current = true;
      try {
        setLoading(true);
        const res = await fetch("/api/dashboard/metrics", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "x-tenant": company
          }
        });
        const result = await res.json();
        if (result.success) {
          setMetrics(result.data);
        }
      } catch (error) {
        console.error("Metrics load error", error);
      } finally {
        setLoading(false);
      }
    };
    loadMetrics();
  }, [company]);

  // SHOW LOADER INSTEAD OF EMPTY VALUES
  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <span className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
        <span className="ml-2 text-sm text-gray-500">Loading customer and order metrics...</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6">
      {/* <!-- Metric Item Start --> */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-blue-600 rounded-xl dark:bg-gray-800">
          <GroupIcon className="ize-6 text-white" />
        </div>

        <div className="flex items-end justify-between mt-5">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Customers
            </span>
            <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
              {metrics.customers}
            </h4>
          </div>
          <Badge color={metrics.orderGrowth >= 0 ? "success" : "error"}>
            {metrics.orderGrowth >= 0 ? <ArrowUpIcon /> : <ArrowDownIcon />}
            {Math.abs(metrics.orderGrowth)}%
          </Badge>
        </div>
      </div>
      {/* <!-- Metric Item End --> */}

      {/* <!-- Metric Item Start --> */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-blue-600 rounded-xl dark:bg-gray-800">
          <BoxIconLine className="ize-6 text-white" />
        </div>
        <div className="flex items-end justify-between mt-5">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Orders
            </span>
            <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
              {metrics.orders}
            </h4>
          </div>

          <Badge color={metrics.orderGrowth >= 0 ? "success" : "error"}>
            {metrics.orderGrowth >= 0 ? <ArrowUpIcon /> : <ArrowDownIcon />}
            {Math.abs(metrics.orderGrowth)}%
          </Badge>
        </div>
      </div>
      {/* <!-- Metric Item End --> */}
    </div>
  );
};
