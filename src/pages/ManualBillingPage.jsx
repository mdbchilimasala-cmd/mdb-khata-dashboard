import { useMemo, useState } from "react";
import { ThermalInvoice } from "../components/invoice/ThermalInvoice";
import { useUserScopedList } from "../hooks/useUserScopedList";
import { calcRowAmount, money, parseQty } from "../utils/billing";
import { patchRecord, saveRecord } from "../services/firebase/db";

const blankRow = { lotNo: "", bags: 1, qty: "", rate: "", amount: 0, qtyNum: 0 };

const toInputDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const toInputTime = (date) => {
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
};

const inputDateToDisplay = (value) => {
  const [y, m, d] = String(value || "").split("-");
  if (!d || !m || !y) return "";
  return `${d}/${m}/${y}`;
};

const inputTimeToDisplay = (value) => {
  if (!value) return "";
  const [hourText, minute] = String(value).split(":");
  const hour = Number(hourText);
  if (Number.isNaN(hour) || minute == null) return value;
  const period = hour >= 12 ? "pm" : "am";
  const twelveHour = hour % 12 || 12;
  return `${String(twelveHour).padStart(2, "0")}:${minute} ${period}`;
};

export function ManualBillingPage() {
  const { uid, rows: invoices } = useUserScopedList("invoices");
  const customers = useUserScopedList("customers").rows;
  const initialNow = useMemo(() => new Date(), []);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerMenu, setShowCustomerMenu] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(toInputDate(initialNow));
  const [invoiceTime, setInvoiceTime] = useState(toInputTime(initialNow));
  const [paid, setPaid] = useState("");
  const [extraOutstanding, setExtraOutstanding] = useState("");
  const [items, setItems] = useState([{ ...blankRow }]);
  const [saving, setSaving] = useState(false);

  const customerOptions = useMemo(
    () => customers.map((c) => ({ id: c.id, label: `${c.name} (${c.mobile})` })),
    [customers],
  );
  const filteredCustomerOptions = useMemo(() => {
    const term = customerSearch.trim().toLowerCase();
    if (!term) return customerOptions.slice(0, 20);
    return customerOptions.filter((opt) => opt.label.toLowerCase().includes(term)).slice(0, 20);
  }, [customerOptions, customerSearch]);

  const selectedCustomer = customers.find((c) => c.id === customerId);
  const previousBalance = Number(selectedCustomer?.current_balance || 0);
  const totalOldBalance = previousBalance + Number(extraOutstanding || 0);
  const total = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const paidAmount = Number(paid || 0);
  const finalBalance = totalOldBalance + total - paidAmount;

  const nextInvoiceNo = useMemo(() => {
    const max = invoices.reduce((acc, inv) => {
      const match = String(inv.invoiceNo || "").match(/^INV-MDB(\d+)$/);
      return match ? Math.max(acc, Number(match[1])) : acc;
    }, 0);
    return `INV-MDB${String(max + 1).padStart(2, "0")}`;
  }, [invoices]);

  const hasValidItems =
    items.length > 0 &&
    items.every((r) => r.lotNo.trim() && Number(r.bags) > 0 && r.qty.trim() && Number(r.rate) > 0 && Number(r.amount) > 0);

  const canSave = Boolean(customerId) && hasValidItems && paid !== "" && Boolean(invoiceDate) && Boolean(invoiceTime) && !saving;

  const invoiceDraft = {
    invoiceNo: nextInvoiceNo,
    customerId,
    customerName: selectedCustomer?.name || "",
    date: inputDateToDisplay(invoiceDate),
    time: inputTimeToDisplay(invoiceTime),
    items,
    total,
    grandTotal: total,
    previousBalance: totalOldBalance,
    extraOutstanding: Number(extraOutstanding || 0),
    paid: paidAmount,
    finalBalance,
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900">
        <h2 className="mb-3 text-lg font-semibold">Manual Bill Entry</h2>
        <div className="relative mb-3">
          <input
            className="w-full rounded border px-3 py-2 pr-20 text-sm dark:border-slate-700 dark:bg-slate-950"
            placeholder="Select customer (search by name/mobile)"
            value={customerSearch}
            onFocus={() => setShowCustomerMenu(true)}
            onBlur={() => setTimeout(() => setShowCustomerMenu(false), 150)}
            onChange={(e) => {
              setCustomerSearch(e.target.value);
              setCustomerId("");
              setShowCustomerMenu(true);
            }}
          />
          <button
            type="button"
            className="absolute right-1 top-1 rounded border border-red-300 px-2 py-1 text-xs text-red-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/60"
            disabled={!customerId && !customerSearch}
            onClick={() => {
              setCustomerId("");
              setCustomerSearch("");
              setShowCustomerMenu(false);
            }}
          >
            Remove
          </button>
          {showCustomerMenu && (
            <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
              {filteredCustomerOptions.length === 0 ? (
                <p className="px-3 py-2 text-sm text-slate-500">No customer found</p>
              ) : (
                filteredCustomerOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                    onClick={() => {
                      setCustomerId(opt.id);
                      setCustomerSearch(opt.label);
                      setShowCustomerMenu(false);
                    }}
                  >
                    {opt.label}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        <div className="mb-3 grid gap-2 sm:grid-cols-2">
          <input
            type="date"
            className="rounded border px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            value={invoiceDate}
            onChange={(e) => setInvoiceDate(e.target.value)}
          />
          <input
            type="time"
            className="rounded border px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            value={invoiceTime}
            onChange={(e) => setInvoiceTime(e.target.value)}
          />
        </div>

        {items.map((row, idx) => (
          <div key={idx} className="mb-3 rounded-xl border p-2 dark:border-slate-700">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
              <input
                className="rounded border px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                placeholder="Lot/Item"
                value={row.lotNo}
                onChange={(e) =>
                  setItems((list) => list.map((r, i) => (i === idx ? { ...r, lotNo: e.target.value } : r)))
                }
              />
              <input
                className="rounded border px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                type="number"
                min="1"
                placeholder="Bags"
                value={row.bags}
                onChange={(e) =>
                  setItems((list) => list.map((r, i) => (i === idx ? { ...r, bags: e.target.value } : r)))
                }
              />
              <input
                className="rounded border px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                placeholder="Qty e.g. 0.25-5"
                value={row.qty}
                onChange={(e) =>
                  setItems((list) =>
                    list.map((r, i) => {
                      if (i !== idx) return r;
                      const qty = e.target.value;
                      const amount = calcRowAmount(qty, r.rate);
                      return { ...r, qty, qtyNum: parseQty(qty), amount };
                    }),
                  )
                }
              />
              <input
                className="rounded border px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                type="number"
                min="0"
                placeholder="Rate"
                value={row.rate}
                onChange={(e) =>
                  setItems((list) =>
                    list.map((r, i) => {
                      if (i !== idx) return r;
                      const rate = e.target.value;
                      const amount = calcRowAmount(r.qty, rate);
                      return { ...r, rate, qtyNum: parseQty(r.qty), amount };
                    }),
                  )
                }
              />
              <div className="rounded border px-2 py-2 text-right text-sm dark:border-slate-700 sm:col-span-2 lg:col-span-1">
                {money(row.amount)}
              </div>
              <button
                type="button"
                className="rounded border border-red-300 px-2 py-2 text-sm text-red-600 dark:border-red-900/60"
                onClick={() => setItems((list) => (list.length > 1 ? list.filter((_, i) => i !== idx) : list))}
              >
                Remove
              </button>
            </div>
          </div>
        ))}

        <button
          className="rounded border px-3 py-2 text-sm dark:border-slate-700"
          onClick={() => setItems((list) => [...list, { ...blankRow }])}
        >
          + Add Row
        </button>

        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>Old Balance: {money(previousBalance)}</div>
          <div className="flex items-center gap-2">
            <span>Outstanding Add:</span>
            <input
              className="min-w-0 flex-1 rounded border px-2 py-1 dark:border-slate-700 dark:bg-slate-950"
              type="number"
              min="0"
              value={extraOutstanding}
              onChange={(e) => setExtraOutstanding(e.target.value)}
            />
          </div>
          <div>Total Old Balance: {money(totalOldBalance)}</div>
          <div>Total: {money(total)}</div>
          <div className="flex items-center gap-2">
            <span>Paid:</span>
            <input
              className="min-w-0 flex-1 rounded border px-2 py-1 dark:border-slate-700 dark:bg-slate-950"
              type="number"
              min="0"
              value={paid}
              onChange={(e) => setPaid(e.target.value)}
            />
          </div>
          <div>Final Balance: {money(finalBalance)}</div>
        </div>

        <button
          className={`mt-4 rounded px-4 py-2 text-white ${
            canSave ? "bg-slate-900 dark:bg-slate-100 dark:text-slate-900" : "cursor-not-allowed bg-slate-400"
          }`}
          disabled={!canSave}
          onClick={async () => {
            setSaving(true);
            try {
              const createdAt = new Date(`${invoiceDate}T${invoiceTime || "00:00"}:00`).getTime();
              await saveRecord(uid, "invoices", {
                ...invoiceDraft,
                createdAt: Number.isNaN(createdAt) ? Date.now() : createdAt,
              });
              if (selectedCustomer?.id) {
                await patchRecord(uid, "customers", selectedCustomer.id, { current_balance: finalBalance });
              }
              const resetNow = new Date();
              setCustomerId("");
              setCustomerSearch("");
              setInvoiceDate(toInputDate(resetNow));
              setInvoiceTime(toInputTime(resetNow));
              setPaid("");
              setExtraOutstanding("");
              setItems([{ ...blankRow }]);
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving ? "Saving..." : "Save Invoice"}
        </button>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900">
        <h3 className="mb-3 text-sm font-semibold">Thermal Preview</h3>
        <div className="overflow-x-auto">
          <ThermalInvoice invoice={invoiceDraft} />
        </div>
      </div>
    </div>
  );
}
