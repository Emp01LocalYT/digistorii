const modules = [
  {
    title: "Inventory Manager",
    description:
      "Upload products in bulk with Excel, edit stock levels, and keep catalog details in sync.",
    action: "Upload Product Sheet",
  },
  {
    title: "Pricing Control",
    description:
      "Define price lists, set product-level discounts, and manage seasonal pricing rules.",
    action: "Update Price Rules",
  },
  {
    title: "Invoices",
    description:
      "Generate invoices, track payment status, and resend documents to customers instantly.",
    action: "Create Invoice",
  },
  {
    title: "Customers",
    description:
      "View customer profiles, purchase history, due balances, and communication notes.",
    action: "Open Customer Book",
  },
];

const salesRows = [
  { period: "Today", orders: "36", revenue: "$2,480", growth: "+12.4%" },
  { period: "This Week", orders: "211", revenue: "$15,320", growth: "+9.1%" },
  { period: "This Month", orders: "842", revenue: "$58,900", growth: "+16.7%" },
];

export default function AdminPlatform() {
  return (
    <section className="max-w-7xl mx-auto px-6 py-14">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
              Private Login App
            </p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900">
              AdminPlatform.html
            </h2>
            <p className="mt-3 max-w-2xl text-slate-600">
              Owner management dashboard for inventory, pricing, invoices,
              customers, and sales reporting with centralized data updates.
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              Security
            </p>
            <p className="mt-1 text-sm font-medium text-emerald-900">
              Role-based login with owner-only access
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total Products</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">1,284</p>
          <p className="mt-2 text-sm text-emerald-600">+73 this month</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Pending Invoices</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">47</p>
          <p className="mt-2 text-sm text-amber-600">$12,920 pending</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Active Customers</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">2,340</p>
          <p className="mt-2 text-sm text-blue-600">112 new this month</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Monthly Revenue</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">$58.9K</p>
          <p className="mt-2 text-sm text-emerald-600">+16.7% vs last month</p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xl font-semibold text-slate-900">
              Sales Dashboard
            </h3>
            <button className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Export Report
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-left">
              <thead>
                <tr className="border-b border-slate-200 text-sm text-slate-500">
                  <th className="pb-3 font-medium">Period</th>
                  <th className="pb-3 font-medium">Orders</th>
                  <th className="pb-3 font-medium">Revenue</th>
                  <th className="pb-3 font-medium">Growth</th>
                </tr>
              </thead>
              <tbody>
                {salesRows.map((row) => (
                  <tr key={row.period} className="border-b border-slate-100">
                    <td className="py-3 font-medium text-slate-900">{row.period}</td>
                    <td className="py-3 text-slate-700">{row.orders}</td>
                    <td className="py-3 text-slate-700">{row.revenue}</td>
                    <td className="py-3 font-semibold text-emerald-600">{row.growth}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-semibold text-slate-900">Data Center</h3>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            All product, customer, invoice, and sales records are written to a
            central database and immediately available across the platform.
          </p>
          <ul className="mt-4 space-y-3 text-sm text-slate-700">
            <li className="rounded-lg bg-slate-50 px-3 py-2">
              Real-time stock and pricing sync
            </li>
            <li className="rounded-lg bg-slate-50 px-3 py-2">
              Unified billing and customer history
            </li>
            <li className="rounded-lg bg-slate-50 px-3 py-2">
              Centralized analytics snapshots
            </li>
          </ul>
        </div>
      </div>

      <div className="mt-8">
        <h3 className="text-2xl font-bold text-slate-900">Owner Modules</h3>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          {modules.map((module) => (
            <article
              key={module.title}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h4 className="text-lg font-semibold text-slate-900">{module.title}</h4>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {module.description}
              </p>
              <button className="mt-5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
                {module.action}
              </button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
