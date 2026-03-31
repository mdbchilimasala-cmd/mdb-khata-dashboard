import { useMemo, useState } from "react";
import { useUserScopedList } from "../hooks/useUserScopedList";
import * as XLSX from "xlsx";

const money = (v) => Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function parseInvoiceDate(dateText, fallbackMs) {
  if (!dateText) return new Date(fallbackMs || 0);
  const [dd, mm, yyyy] = String(dateText).split("/");
  if (!dd || !mm || !yyyy) return new Date(fallbackMs || 0);
  return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
}

export function LedgerPage() {
  const customers = useUserScopedList("customers").rows;
  const invoices = useUserScopedList("invoices").rows;
  const txns = useUserScopedList("transactions").rows;

  const [customerId, setCustomerId] = useState("");
  const [ledgerType, setLedgerType] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const selectedCustomer = customers.find((c) => c.id === customerId) || customers[0];
  const effectiveLedgerType = ledgerType === "payment" ? "all" : ledgerType;

  const ledgerRows = useMemo(() => {
    if (!selectedCustomer?.id) return [];
    const customerInvoices = invoices
      .filter((i) => i.customerId === selectedCustomer.id)
      .map((i) => ({
        id: i.id,
        type: "invoice",
        date: parseInvoiceDate(i.date, i.updatedAt),
        ref: i.invoiceNo || "-",
        debit: Number(i.total || i.grandTotal || 0),
        credit: Number(i.paid || 0),
        note: "Invoice billed",
      }));

    const customerPayments = txns
      .filter((t) => t.customerId === selectedCustomer.id)
      .map((t) => ({
        id: t.id,
        type: "payment",
        date: new Date(t.createdAt || t.updatedAt || 0),
        ref: t.invoiceId || "-",
        debit: 0,
        credit: Number(t.amount || 0),
        note: "Payment received",
      }));

    const events = [...customerInvoices, ...customerPayments].sort((a, b) => a.date.getTime() - b.date.getTime());
    let running = Number(selectedCustomer.opening_balance || 0);
    return events.map((e) => {
      running += e.debit - e.credit;
      return { ...e, running };
    });
  }, [invoices, txns, selectedCustomer]);

  const filteredLedger = useMemo(() => {
    const start = fromDate ? new Date(`${fromDate}T00:00:00`) : null;
    const end = toDate ? new Date(`${toDate}T23:59:59`) : null;
    return ledgerRows.filter((e) => {
      if (effectiveLedgerType !== "all" && e.type !== effectiveLedgerType) return false;
      if (start && e.date < start) return false;
      if (end && e.date > end) return false;
      return true;
    });
  }, [ledgerRows, effectiveLedgerType, fromDate, toDate]);
  const totalPages = Math.max(1, Math.ceil(filteredLedger.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedLedger = useMemo(
    () => filteredLedger.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filteredLedger, currentPage],
  );

  const exportLedger = () => {
    if (!selectedCustomer) return;
    const exportRows = filteredLedger.map((r) => ({
      Date: r.date.toLocaleDateString("en-GB"),
      Time: r.date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
      Type: r.type,
      Reference: r.ref,
      Debit: Number(r.debit || 0),
      Credit: Number(r.credit || 0),
      "Running Balance": Number(r.running || 0),
      Note: r.note,
    }));
    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ledger");
    XLSX.writeFile(wb, `ledger-${selectedCustomer.name || "customer"}.xlsx`);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/60 dark:bg-slate-900 dark:ring-slate-700">
        <div className="grid gap-2 sm:grid-cols-5">
          <select className="rounded border px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 sm:col-span-2" value={customerId} onChange={(e) => { setCustomerId(e.target.value); setPage(1); }}>
            <option value="">Select Customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.mobile})
              </option>
            ))}
          </select>
          <select
            className="rounded border px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            value={ledgerType === "payment" ? "all" : ledgerType}
            onChange={(e) => { setLedgerType(e.target.value); setPage(1); }}
          >
            <option value="all">All Entries</option>
            <option value="invoice">Invoices</option>
          </select>
          <input className="rounded border px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1); }} />
          <input className="rounded border px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1); }} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="rounded border px-3 py-2 text-sm dark:border-slate-700" onClick={() => { setLedgerType("all"); setFromDate(""); setToDate(""); setPage(1); }}>
            Reset Filters
          </button>
          <button className="rounded bg-emerald-600 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50" disabled={!selectedCustomer || filteredLedger.length === 0} onClick={exportLedger}>
            Export Excel
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/60 dark:bg-slate-900 dark:ring-slate-700">
        <h2 className="mb-1 text-lg font-semibold">Ledger History</h2>
        <p className="mb-3 text-sm text-slate-500">{selectedCustomer ? `${selectedCustomer.name} (${selectedCustomer.mobile})` : "Select customer to view history"}</p>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100 dark:bg-slate-800">
              <tr>
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">Time</th>
                <th className="px-3 py-2 text-left">Type</th>
                <th className="px-3 py-2 text-left">Ref</th>
                <th className="px-3 py-2 text-right">Debit</th>
                <th className="px-3 py-2 text-right">Credit</th>
                <th className="px-3 py-2 text-right">Running Balance</th>
              </tr>
            </thead>
            <tbody>
              {paginatedLedger.map((entry) => (
                <tr key={`${entry.type}-${entry.id}`} className="border-b dark:border-slate-700">
                  <td className="px-3 py-2">{entry.date.toLocaleDateString("en-GB")}</td>
                  <td className="px-3 py-2">{entry.date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</td>
                  <td className="px-3 py-2 capitalize">{entry.type}</td>
                  <td className="px-3 py-2">{entry.ref}</td>
                  <td className="px-3 py-2 text-right">{money(entry.debit)}</td>
                  <td className="px-3 py-2 text-right">{money(entry.credit)}</td>
                  <td className="px-3 py-2 text-right font-medium">{money(entry.running)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredLedger.length > 0 && (
          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Page {currentPage} of {totalPages} · {pageSize} per page
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded border px-3 py-1 text-sm disabled:opacity-50 dark:border-slate-700"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Prev
              </button>
              <button
                type="button"
                className="rounded border px-3 py-1 text-sm disabled:opacity-50 dark:border-slate-700"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
