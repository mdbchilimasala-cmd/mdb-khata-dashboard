import { useMemo } from "react";
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, Tooltip } from "recharts";
import { useUserScopedList } from "../hooks/useUserScopedList";

function StatCard({ title, value }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900 md:p-5">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-2 break-all text-xl font-semibold md:text-2xl">{value}</p>
    </div>
  );
}

export function DashboardPage() {
  const invoices = useUserScopedList("invoices").rows;
  const customers = useUserScopedList("customers").rows;
  const products = useUserScopedList("products").rows;

  const stats = useMemo(() => {
    const totalSales = invoices.reduce((a, b) => a + Number(b.total || 0), 0);
    const pending = customers.reduce((a, b) => a + Number(b.current_balance || 0), 0);
    const alerts = products.filter((p) => Number(p.stock || 0) <= 0).length;
    return { totalSales, pending, alerts };
  }, [invoices, customers, products]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Sales" value={stats.totalSales.toLocaleString("en-IN")} />
        <StatCard title="Total Customers" value={customers.length} />
        <StatCard title="Pending Amount" value={stats.pending.toLocaleString("en-IN")} />
        <StatCard title="Stock Alerts" value={stats.alerts} />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900">
          <h3 className="mb-4 font-medium">Sales Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={invoices}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <Tooltip />
                <Area dataKey="total" stroke="#0f172a" fill="#cbd5e1" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900">
          <h3 className="mb-4 font-medium">Recent Invoices</h3>
          <div className="space-y-2">
            {invoices.slice(-6).reverse().map((i) => (
              <div key={i.id} className="flex items-center justify-between gap-2 rounded border p-2 text-sm dark:border-slate-700">
                <span className="truncate">{i.invoiceNo}</span>
                <span className="shrink-0">{Number(i.grandTotal || 0).toLocaleString("en-IN")}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
