import { useState } from "react";
import { useUserScopedList } from "../hooks/useUserScopedList";
import { patchRecord, saveRecord } from "../services/firebase/db";

export function PaymentsPage() {
  const { uid } = useUserScopedList("transactions");
  const customers = useUserScopedList("customers").rows;
  const invoices = useUserScopedList("invoices").rows;
  const txns = useUserScopedList("transactions").rows;
  const [form, setForm] = useState({ customerId: "", invoiceId: "", amount: "" });

  return (
    <div className="grid gap-6 lg:grid-cols-[350px_1fr]">
      <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900">
        <h2 className="mb-3 font-semibold">Record Payment</h2>
        <select className="mb-2 w-full rounded border px-3 py-2 dark:border-slate-700 dark:bg-slate-950" value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}>
          <option value="">Customer</option>
          {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="mb-2 w-full rounded border px-3 py-2 dark:border-slate-700 dark:bg-slate-950" value={form.invoiceId} onChange={(e) => setForm({ ...form, invoiceId: e.target.value })}>
          <option value="">Invoice</option>
          {invoices.map((i) => <option key={i.id} value={i.id}>{i.invoiceNo}</option>)}
        </select>
        <input className="mb-2 w-full rounded border px-3 py-2 dark:border-slate-700 dark:bg-slate-950" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
        <button
          className="w-full rounded bg-slate-900 px-3 py-2 text-white dark:bg-slate-100 dark:text-slate-900 sm:w-auto"
          onClick={async () => {
            await saveRecord(uid, "transactions", { ...form, createdAt: Date.now() });
            const customer = customers.find((c) => c.id === form.customerId);
            if (customer) {
              await patchRecord(uid, "customers", customer.id, {
                current_balance: Number(customer.current_balance || 0) - Number(form.amount || 0),
              });
            }
          }}
        >
          Save Payment
        </button>
      </div>
      <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900">
        <h2 className="mb-3 font-semibold">Transactions</h2>
        <div className="space-y-2">
          {txns.slice().reverse().map((t) => (
            <div key={t.id} className="rounded border p-2 text-sm dark:border-slate-700">
              <span className="break-all">{t.customerId} | Invoice {t.invoiceId} | Amount {t.amount}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
