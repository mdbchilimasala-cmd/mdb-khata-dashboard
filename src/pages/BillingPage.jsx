import { useMemo, useState } from "react";
import { useUserScopedList } from "../hooks/useUserScopedList";
import { calcRowAmount, money, parseQty } from "../utils/billing";
import { patchRecord, saveRecord } from "../services/firebase/db";
import { ThermalInvoice } from "../components/invoice/ThermalInvoice";

const row = { productId: "", lotNo: "", bags: 1, qty: "", rate: "", amount: 0 };

export function BillingPage() {
  const { uid, rows: invoices } = useUserScopedList("invoices");
  const customers = useUserScopedList("customers").rows;
  const products = useUserScopedList("products").rows;
  const stockLogs = useUserScopedList("stock_logs").rows;

  const [customerId, setCustomerId] = useState("");
  const [paid, setPaid] = useState(0);
  const [extraOutstanding, setExtraOutstanding] = useState(0);
  const [items, setItems] = useState([{ ...row }]);
  const [preview, setPreview] = useState(null);

  const customer = customers.find((c) => c.id === customerId);
  const openingBalance = Number(customer?.opening_balance || 0);
  const previous = Number(customer?.current_balance || 0);
  const oldBalance = previous + Number(extraOutstanding || 0);
  const total = items.reduce((a, b) => a + Number(b.amount || 0), 0);
  const grandTotal = total;
  const finalBalance = oldBalance + grandTotal - Number(paid || 0);

  const lotsByProduct = useMemo(() => {
    const map = {};
    stockLogs.forEach((l) => {
      if (!map[l.product_id]) map[l.product_id] = [];
      map[l.product_id].push(l);
    });
    return map;
  }, [stockLogs]);

  const nextInvoiceNo = useMemo(() => {
    const max = invoices.reduce((acc, inv) => {
      const match = String(inv.invoiceNo || "").match(/^INV-MDB(\d+)$/);
      if (!match) return acc;
      return Math.max(acc, Number(match[1]));
    }, 0);
    return `INV-MDB${String(max + 1).padStart(2, "0")}`;
  }, [invoices]);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900">
        <h2 className="mb-3 text-lg font-semibold">Create Invoice</h2>
        <div className="mb-3 flex gap-2">
          <select className="w-full rounded border px-3 py-2 dark:border-slate-700 dark:bg-slate-950" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">Select customer</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button
            type="button"
            className="rounded border border-red-300 px-3 py-2 text-sm text-red-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/60"
            disabled={!customerId}
            onClick={() => setCustomerId("")}
          >
            Remove
          </button>
        </div>
        {items.map((it, idx) => (
          <div key={idx} className="mb-3 rounded-xl border p-2 dark:border-slate-700">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
            <select className="rounded border px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" value={it.productId} onChange={(e) => setItems((s) => s.map((r, i) => (i === idx ? { ...r, productId: e.target.value } : r)))}>
              <option value="">Product</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select className="rounded border px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" value={it.lotNo} onChange={(e) => setItems((s) => s.map((r, i) => (i === idx ? { ...r, lotNo: e.target.value } : r)))}>
              <option value="">LOT</option>
              {(lotsByProduct[it.productId] || []).map((l) => <option key={l.id} value={l.lot_no}>{l.lot_no}</option>)}
            </select>
            <input
              className="rounded border px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              value={it.qty}
              placeholder="0.25-5"
              onChange={(e) =>
                setItems((s) =>
                  s.map((r, i) => {
                    if (i !== idx) return r;
                    const qty = e.target.value;
                    const amount = calcRowAmount(qty, r.rate);
                    return { ...r, qty, qtyNum: parseQty(qty), amount };
                  }),
                )
              }
            />
            <input className="rounded border px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" value={it.rate} placeholder="rate" onChange={(e) => setItems((s) => s.map((r, i) => {
              if (i !== idx) return r;
              const amount = calcRowAmount(r.qty, e.target.value);
              return { ...r, rate: e.target.value, amount, qtyNum: parseQty(r.qty) };
            }))} />
            <div className="rounded border px-2 py-2 text-right text-sm dark:border-slate-700 sm:col-span-2 lg:col-span-1">{money(it.amount)}</div>
            <button
              type="button"
              className="rounded border border-red-300 px-2 py-2 text-sm text-red-600 dark:border-red-900/60"
              onClick={() => setItems((s) => (s.length > 1 ? s.filter((_, i) => i !== idx) : s))}
            >
              Remove
            </button>
            </div>
          </div>
        ))}
        <button className="rounded border px-3 py-2 text-sm dark:border-slate-700" onClick={() => setItems((s) => [...s, { ...row }])}>+ Add Row</button>
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>Old Balance: {money(openingBalance)}</div>
          <div>Old Balance: {money(previous)}</div>
          <div className="flex items-center gap-2">
            <span>Outstanding Add:</span>
            <input className="min-w-0 flex-1 rounded border px-2 py-1 dark:border-slate-700 dark:bg-slate-950" value={extraOutstanding} onChange={(e) => setExtraOutstanding(e.target.value)} />
          </div>
          <div>Total Old Balance: {money(oldBalance)}</div>
          <div>Total: {money(total)}</div>
          <div className="flex items-center gap-2">
            <span>Paid:</span>
            <input className="min-w-0 flex-1 rounded border px-2 py-1 dark:border-slate-700 dark:bg-slate-950" value={paid} onChange={(e) => setPaid(e.target.value)} />
          </div>
          <div>Final Balance: {money(finalBalance)}</div>
        </div>
        <button
          className="mt-4 rounded bg-slate-900 px-4 py-2 text-white dark:bg-slate-100 dark:text-slate-900"
          onClick={async () => {
            const now = new Date();
            const payload = {
              customerId,
              customerName: customer?.name || "",
              date: now.toLocaleDateString("en-GB"),
              time: now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }),
              createdAt: now.getTime(),
              invoiceNo: nextInvoiceNo,
              items,
              total,
              grandTotal,
              previousBalance: oldBalance,
              extraOutstanding: Number(extraOutstanding || 0),
              paid,
              finalBalance,
            };
            await saveRecord(uid, "invoices", payload);
            if (customer?.id) {
              await patchRecord(uid, "customers", customer.id, { current_balance: finalBalance });
            }
            setPreview(payload);
          }}
        >
          Save Invoice
        </button>
      </div>
      <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900">
        <h3 className="mb-3 text-sm font-semibold">Thermal Preview</h3>
        <div className="overflow-x-auto">
          <ThermalInvoice invoice={preview || { items: [] }} />
        </div>
      </div>
    </div>
  );
}
