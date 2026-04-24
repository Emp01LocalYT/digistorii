"use client";

import { memo, useMemo } from "react";

type PurchaseHistoryRow = {
  id: number;
  sales_no: string;
  dateLabel: string;
  items_count: number;
  amount: number;
};

type MonthlySpendRow = {
  month: string;
  total: number;
};

type Props = {
  history: PurchaseHistoryRow[];
  monthly: MonthlySpendRow[];
};

function CustomerAnalyticsPanel({ history, monthly }: Props) {
  const maxMonthlySpend = useMemo(() => {
    const max = monthly.reduce((acc, row) => Math.max(acc, row.total), 0);
    return max > 0 ? max : 1;
  }, [monthly]);

  return (
    <div className="bg-white p-4 rounded-xl shadow space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Customer Analytics
        </div>
        <div className="text-[10px] text-gray-400">Last 10 bills</div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="p-2 text-left">Date</th>
              <th className="p-2 text-left">Bill No</th>
              <th className="p-2 text-right">Items</th>
              <th className="p-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {history.length === 0 && (
              <tr>
                <td className="p-3 text-xs text-gray-400" colSpan={4}>
                  No recent purchases found.
                </td>
              </tr>
            )}
            {history.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="p-2">{row.dateLabel}</td>
                <td className="p-2 font-medium text-gray-700">{row.sales_no}</td>
                <td className="p-2 text-right">{row.items_count}</td>
                <td className="p-2 text-right">{Number(row.amount || 0).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border rounded-lg p-3">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-2">
          Monthly Spending
        </div>
        <div className="flex items-end gap-2 h-24">
          {monthly.length === 0 && (
            <div className="text-xs text-gray-400">No data yet.</div>
          )}
          {monthly.map((row) => (
            <div key={row.month} className="flex flex-col items-center flex-1 min-w-[20px]">
              <div
                className="w-full rounded bg-blue-500/80"
                style={{
                  height: `${Math.max(6, (row.total / maxMonthlySpend) * 80)}px`,
                }}
              />
              <div className="text-[9px] text-gray-500 mt-1">{row.month}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default memo(CustomerAnalyticsPanel);
