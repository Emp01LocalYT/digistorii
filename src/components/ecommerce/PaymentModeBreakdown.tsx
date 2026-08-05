"use client";

import dynamic from "next/dynamic";
import React, { useEffect, useState, useRef } from "react";
import { ApexOptions } from "apexcharts";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { CalenderIcon } from "@/icons";
import { useTenant } from "@/context/TenantContext";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

type DateFilter = "today" | "monthly" | "yearly" | "custom";

export default function PaymentModeBreakdown() {
  const { company } = useTenant();
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<DateFilter>("today");
  
  const [data, setData] = useState<{
    totalsByMode: Record<number, { name: string, amount: number }>;
    grandTotal: number;
  }>({
    totalsByMode: {},
    grandTotal: 0
  });

  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const fetchBreakdown = async (selectedFilter: DateFilter) => {
    if (!company) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/dashboard/payment-breakdown?filter=${selectedFilter}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-tenant": company
        }
      });
      const result = await res.json();
      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error("Failed to fetch payment breakdown", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBreakdown(filter);
  }, [company, filter]);

  const modes = Object.values(data.totalsByMode);
  const series = modes.map(m => m.amount);
  const labels = modes.map(m => m.name);

  const colorPalette = ["#465FFF", "#039855", "#F59E0B", "#D92D20", "#8B5CF6", "#14B8A6"];
  const colors = modes.map((_, i) => colorPalette[i % colorPalette.length]);

  const options: ApexOptions = {
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "donut",
      height: 300,
    },
    colors: colors,
    labels: labels,
    plotOptions: {
      pie: {
        donut: {
          size: "75%",
          labels: {
            show: true,
            name: {
              show: true,
              fontSize: "14px",
              fontWeight: 500,
              color: "#64748B"
            },
            value: {
              show: true,
              fontSize: "24px",
              fontWeight: 700,
              color: "#1E293B",
              formatter: function (val) {
                return "₹" + Number(val).toLocaleString();
              }
            },
            total: {
              show: true,
              showAlways: true,
              label: "Total Revenue",
              fontSize: "14px",
              fontWeight: 500,
              color: "#64748B",
              formatter: function (w) {
                return "₹" + data.grandTotal.toLocaleString();
              }
            }
          }
        }
      }
    },
    dataLabels: {
      enabled: false,
    },
    legend: {
      show: false,
    },
    stroke: {
      show: true,
      colors: ["transparent"],
      width: 0
    },
    tooltip: {
      enabled: true,
      y: {
        formatter: (val) => "₹" + val.toLocaleString()
      }
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-default dark:border-gray-800 dark:bg-gray-900 flex flex-col h-full">
      <div className="px-5 pt-5 pb-4 sm:px-6 sm:pt-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Payment Mode Breakdown
            </h3>
            <p className="mt-1 font-normal text-gray-500 text-sm dark:text-gray-400">
              Sales revenue distribution by payment type
            </p>
          </div>
          <div className="relative inline-block">
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <CalenderIcon />
              <span className="hidden sm:inline capitalize">
                {filter === "monthly" ? "This Month" : filter === "yearly" ? "This Year" : "Today"}
              </span>
            </button>
            <Dropdown
              isOpen={isFilterOpen}
              onClose={() => setIsFilterOpen(false)}
              className="w-40 p-2 right-0 top-full mt-1"
            >
              <button
                onClick={() => { setFilter("today"); setIsFilterOpen(false); }}
                className="flex w-full px-3 py-2 text-sm font-medium text-left text-gray-600 rounded-lg hover:bg-gray-100 hover:text-gray-900"
              >
                Today
              </button>
              <button
                onClick={() => { setFilter("monthly"); setIsFilterOpen(false); }}
                className="flex w-full px-3 py-2 text-sm font-medium text-left text-gray-600 rounded-lg hover:bg-gray-100 hover:text-gray-900"
              >
                This Month
              </button>
              <button
                onClick={() => { setFilter("yearly"); setIsFilterOpen(false); }}
                className="flex w-full px-3 py-2 text-sm font-medium text-left text-gray-600 rounded-lg hover:bg-gray-100 hover:text-gray-900"
              >
                This Year
              </button>
            </Dropdown>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-[300px]">
            <span className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
          </div>
        ) : series.length > 0 ? (
          <>
            <div className="relative flex justify-center mt-2 mb-6">
              <div className="w-full max-w-[320px]">
                <ReactApexChart
                  options={options}
                  series={series}
                  type="donut"
                  height={300}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-100 pt-5">
              {modes.map((mode, index) => {
                const percentage = data.grandTotal > 0 
                  ? Math.round((mode.amount / data.grandTotal) * 100) 
                  : 0;
                
                return (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: colors[index] }}
                      ></div>
                      <span className="text-sm font-medium text-gray-700">{mode.name}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-bold text-gray-900">₹{mode.amount.toLocaleString()}</span>
                      <span className="text-xs font-medium text-gray-500">{percentage}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-[300px] text-gray-500">
            <p>No transactions found for {filter}.</p>
          </div>
        )}
      </div>
    </div>
  );
}
