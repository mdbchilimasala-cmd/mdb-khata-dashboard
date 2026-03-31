import { useMemo, useState } from "react";
import { useUserScopedList } from "../hooks/useUserScopedList";
import { saveRecord } from "../services/firebase/db";

const initial = { name: "", mobile: "", address: "", gst_no: "", opening_balance: 0 };
const money = (v) => Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function CustomersPage() {
  const { uid, rows } = useUserScopedList("customers");
  const [form, setForm] = useState(initial);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const filteredCustomers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((c) => {
      const match = !q || `${c.name} ${c.mobile} ${c.address || ""}`.toLowerCase().includes(q);
      const bal = Number(c.current_balance || 0);
      if (status === "pending") return match && bal > 0;
      if (status === "clear") return match && bal <= 0;
      return match;
    });
  }, [rows, query, status]);
  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedCustomers = useMemo(
    () => filteredCustomers.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filteredCustomers, currentPage],
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/60 dark:bg-slate-900 dark:ring-slate-700">
        <h2 className="mb-4 text-lg font-semibold">Add Customer</h2>
        <div className="space-y-2">
          {Object.keys(initial).map((k) => (
            <input
              key={k}
              value={form[k]}
              placeholder={k}
              onChange={(e) => setForm((s) => ({ ...s, [k]: e.target.value }))}
              className="w-full rounded border px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            />
          ))}
          <button
            className="w-full rounded bg-slate-900 py-2 text-white dark:bg-slate-100 dark:text-slate-900"
            onClick={async () => {
              await saveRecord(uid, "customers", { ...form, current_balance: Number(form.opening_balance || 0) });
              setForm(initial);
            }}
          >
            Save
          </button>
        </div>
      </div>
      <div className="space-y-6">
        <div className="rounded-2xl bg-gradient-to-r from-slate-900 to-slate-700 p-4 text-white shadow-sm">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <p className="text-xs opacity-80">Total Customers</p>
              <p className="text-2xl font-semibold">{rows.length}</p>
            </div>
            <div>
              <p className="text-xs opacity-80">Pending Accounts</p>
              <p className="text-2xl font-semibold">{rows.filter((c) => Number(c.current_balance || 0) > 0).length}</p>
            </div>
            <div>
              <p className="text-xs opacity-80">Total Outstanding</p>
              <p className="text-2xl font-semibold">₹ {money(rows.reduce((a, b) => a + Number(b.current_balance || 0), 0))}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/60 dark:bg-slate-900 dark:ring-slate-700">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row">
            <input
              className="w-full rounded border px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              placeholder="Search by name/mobile/address"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select className="rounded border px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="clear">Clear</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 dark:bg-slate-800">
                <tr>
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-left">Mobile</th>
                  <th className="px-3 py-2 text-left">Address</th>
                  <th className="px-3 py-2 text-right">Opening</th>
                  <th className="px-3 py-2 text-right">Current</th>
                </tr>
              </thead>
              <tbody>
                {paginatedCustomers.map((c) => (
                  <tr key={c.id} className="border-b dark:border-slate-700">
                    <td className="px-3 py-2">{c.name}</td>
                    <td className="px-3 py-2">{c.mobile}</td>
                    <td className="px-3 py-2">{c.address || "-"}</td>
                    <td className="px-3 py-2 text-right">{money(c.opening_balance)}</td>
                    <td className="px-3 py-2 text-right">{money(c.current_balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-slate-500">Page {currentPage} of {totalPages}</p>
            <div className="flex gap-2">
              <button className="rounded border px-3 py-1 text-sm disabled:opacity-50 dark:border-slate-700" disabled={currentPage <= 1} onClick={() => setPage((p) => p - 1)}>
                Prev
              </button>
              <button className="rounded border px-3 py-1 text-sm disabled:opacity-50 dark:border-slate-700" disabled={currentPage >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
