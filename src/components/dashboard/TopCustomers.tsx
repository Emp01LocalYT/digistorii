"use client";

import React, { useEffect, useState, useRef } from "react";
import { useTenant } from "@/context/TenantContext";

export default function TopCustomers() {
    const { company } = useTenant();
    const loaded = useRef(false);

    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            if (!company || loaded.current) return;
            loaded.current = true;
            try {
                const res = await fetch("/api/dashboard/top-customers", {
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
                    Loading Top Customers...
                </span>
            </div>
        );
    }

    const totalAmount = data.reduce(
        (sum, item) => sum + Number(item.total_amount || 0),
        0
    );

    return (
    <div className="rounded-2xl border bg-white p-3 shadow-sm">
      <div className="flex justify-between items-center mb-2">
        <div className="flex flex-col">
          <h2 className="text-lg font-bold leading-tight">Customers</h2>
          <span className="text-sm font-medium opacity-70 tracking-wider">Top 5</span>
        </div>
        
        <div className="text-xs font-semibold text-blue-700 bg-blue-100 px-3 py-1 rounded-full shadow-sm mb-4 text-right">
          Total Sales : {totalAmount.toLocaleString()}
        </div>
      </div>

      {/* COMPACT LIST SECTION */}
      <div className="p-4">
        <div className="space-y-3">
          {[...Array(5)].map((_, index) => {
            const item = data[index];

            return (
              <div key={index} className="flex flex-col">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-400 w-4">#{index + 1}</span>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                        item ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-300"
                      }`}>
                      {item?.customer_name?.charAt(0) || "-"}
                    </div>
                    <span className={`text-sm font-semibold truncate max-w-[130px] ${
                        item ? "text-gray-700" : "text-gray-200"
                      }`}>
                      {item?.customer_name || "No data"}
                    </span>
                  </div>
                  <span className={`text-sm font-bold ${item ? "text-gray-900" : "text-gray-200"}`}>
                    {item ? item.total_amount.toLocaleString() : "—"}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-400"
                    style={{ width: item ? `${item.percentage}%` : "0%" }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {data.length === 0 && (
          <p className="text-sm text-gray-400 text-center mt-4 tracking-tighter">
            No customer data available
          </p>
        )}
      </div>
    </div>
  );
}

//     return (
//         <div className="rounded-2xl border bg-white p-3 shadow-sm">
//             {/* Header */}
//             <div className="flex justify-between items-center mb-2">
//                 <h2 className="text-lg font-semibold mb-4">Customers</h2>
//                 <div className="text-xs font-semibold text-blue-700 bg-blue-100 px-3 py-1 rounded-full shadow-sm mb-4">
//                     Total Sales : {totalAmount.toLocaleString()}
//                 </div>
//                 <span className="text-sm text-gray-400 mb-4">Top 5</span>
//             </div>

//             {/* List */}
//             <div className="space-y-2">
//                 {[...Array(5)].map((_, index) => {
//                     const item = data[index];

//                     return (
//                         <div
//                             key={index}
//                             className="p-2 rounded hover:bg-gray-50 transition"
//                         >
//                             <div className="flex items-center justify-between">
//                                 {/* LEFT */}
//                                 <div className="flex items-center gap-2">
//                                     <span className="text-sm font-semibold text-gray-400 w-4">
//                                         #{index + 1}
//                                     </span>

//                                     <div
//                                         className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-semibold ${item
//                                             ? "bg-blue-100 text-blue-600"
//                                             : "bg-gray-100 text-gray-300"
//                                             }`}
//                                     >
//                                         {item?.customer_name?.charAt(0) || "-"}
//                                     </div>

//                                     <span
//                                         className={`text-sm truncate max-w-[120px] ${item ? "text-gray-700" : "text-gray-300"
//                                             }`}
//                                     >
//                                         {item?.customer_name || "No data"}
//                                     </span>
//                                 </div>

//                                 {/* RIGHT */}
//                                 <span
//                                     className={`text-sm font-medium ${item ? "text-gray-800" : "text-gray-300"
//                                         }`}
//                                 >
//                                     {item
//                                         ? ` ${item.total_amount.toLocaleString()}`
//                                         : "—"}
//                                 </span>
//                             </div>

//                             {/* Progress */}
//                             <div className="w-full bg-gray-100 h-1 rounded mt-1">
//                                 <div
//                                     className={`h-1 rounded ${item ? "bg-blue-500" : "bg-gray-200"
//                                         }`}
//                                     style={{
//                                         width: item ? `${item.percentage}%` : "0%",
//                                     }}
//                                 />
//                             </div>
//                         </div>
//                     );
//                 })}
//             </div>

//             {/* No Data Message */}
//             {data.length === 0 && (
//                 <p className="text-sm text-gray-400 text-center mt-2">
//                     No customer data available
//                 </p>
//             )}
//         </div>
//     );
// }