"use client";

import React, { useEffect, useState, useRef } from "react";
import { useTenant } from "@/context/TenantContext";
import { useRouter } from "next/navigation";

export default function TopSellingProducts() {
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

        const res = await fetch("/api/dashboard/top-selling-products", {
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
        console.error("Top Selling Products Load Error", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [company]);

  const handleClick = (productId: number) => {
    router.push(
      `/${company}/transactions/sales?product_id=${productId}`
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <span className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
        <span className="ml-2 text-sm text-gray-500">
          Loading top selling products...
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
          <h2 className="text-lg font-bold leading-tight">Top Selling Products</h2>
          <span className="text-sm font-medium opacity-70 tracking-wider">Top 5</span>
        </div>
        
        <div className="text-xs font-semibold text-blue-700 bg-blue-100 px-3 py-1 rounded-full shadow-sm mb-4 text-right">
          Total Sales : {totalAmount.toLocaleString()}
        </div>
      </div>

      {/* Content Section */}
      <div className="p-5">
        <div className="flex justify-between items-center mb-4 text-sm text-gray-400 font-medium tracking-wider">
          <span>Product Details</span>
          <span>Value</span>
        </div>

        {data.map((item) => (
          <div key={item.product_id} className="flex flex-col mb-5 last:mb-0">
            {/* Product Name & Amount */}
            <div className="flex justify-between text-sm mb-1.5">
              <span className="font-bold text-gray-700">{item.product_name}</span>
              <span className="font-bold text-gray-900">
                {Number(item.total_amount).toLocaleString()}
              </span>
            </div>

            {/* Progress Bar - Blue Gradient */}
            <div className="w-full bg-gray-100 rounded-full h-2.5">
              <div
                className="h-2.5 rounded-full bg-gradient-to-r from-blue-500 to-blue-400 shadow-sm transition-all duration-500"
                style={{ width: `${item.percentage}%` }}
              />
            </div>

            {/* Stats Row */}
            <div className="flex justify-between items-center mt-1.5">
              <span className="text-sm text-gray-500 font-medium">
                Sold Qty: <span className="text-gray-700">{item.qty}</span>
              </span>
              {/* <span className="text-sm font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                {item.percentage.toFixed(1)}%
              </span> */}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

//   return (
//     <div className="rounded-2xl border bg-white p-3 shadow-sm">
//       <div className="flex justify-between items-center mb-2">
//         <h2 className="text-lg font-semibold mb-4">
//           Top Selling Products
//         </h2>
//         <div className="text-xs font-semibold text-blue-700 bg-blue-100 px-3 py-1 rounded-full shadow-sm mb-4">
//           Total Sales : {totalAmount.toLocaleString()}
//         </div>
//         <span className="text-sm text-gray-400 mb-4">Top 5</span>
//       </div>

//       {data.map((item) => (
//         <div
//           key={item.product_id}
//           className="flex flex-col mb-4"
//         >
//           {/* Product Name */}
//           <div className="flex justify-between text-sm font-medium">
//             <span>{item.product_name}</span>
//             <span className="text-gray-800 dark:text-white font-medium">
//                {item.total_amount.toLocaleString()}
//             </span>
//           </div>

//           {/* Progress Bar */}
//           <div className="w-full bg-gray-100 rounded-full h-3 mt-1">
//             <div
//               className="h-3 rounded-full bg-blue-500"
//               style={{ width: `${item.percentage}%` }}
//             />
//           </div>

//           {/* Qty */}
//           <div className="text-xs text-gray-500 mt-1 flex justify-between">
//             <span>Sold Qty: {item.qty}</span>
//             <span>{item.percentage.toFixed(1)}%</span>
//           </div>
//         </div>
//       ))}
//     </div>
//   );
// }