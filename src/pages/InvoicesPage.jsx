import { useMemo, useState } from "react";
import { ThermalInvoice } from "../components/invoice/ThermalInvoice";
import { useUserScopedList } from "../hooks/useUserScopedList";

export function InvoicesPage() {
  const { rows: invoices } = useUserScopedList("invoices");
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(null);
  const [printSignal, setPrintSignal] = useState(0);
  const [customerFilter, setCustomerFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const customerOptions = useMemo(() => {
    const unique = Array.from(new Set(invoices.map((i) => i.customerName || "").filter(Boolean)));
    return unique.sort((a, b) => a.localeCompare(b));
  }, [invoices]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    const now = new Date();
    const isToday = (value) => {
      if (!value) return false;
      const [d, m, y] = String(value).split("/").map(Number);
      if (!d || !m || !y) return false;
      return now.getDate() === d && now.getMonth() + 1 === m && now.getFullYear() === y;
    };
    const isThisMonth = (value) => {
      if (!value) return false;
      const [d, m, y] = String(value).split("/").map(Number);
      if (!d || !m || !y) return false;
      return now.getMonth() + 1 === m && now.getFullYear() === y;
    };
    const parseDate = (value) => {
      const [d, m, y] = String(value || "").split("/").map(Number);
      if (!d || !m || !y) return 0;
      return new Date(y, m - 1, d).getTime();
    };
    const parseInvoiceTimestamp = (invoice) => {
      if (invoice?.createdAt) {
        const ts = Number(invoice.createdAt);
        if (!Number.isNaN(ts) && ts > 0) return ts;
      }
      const [d, m, y] = String(invoice?.date || "").split("/").map(Number);
      if (!d || !m || !y) return 0;

      let hours = 0;
      let minutes = 0;
      const timeText = String(invoice?.time || "").trim().toLowerCase();
      const match = timeText.match(/^(\d{1,2}):(\d{2})\s*([ap]m)?$/);
      if (match) {
        const rawHour = Number(match[1]);
        minutes = Number(match[2]) || 0;
        const meridian = match[3];
        if (meridian === "pm") hours = rawHour % 12 + 12;
        else if (meridian === "am") hours = rawHour % 12;
        else hours = rawHour;
      }

      return new Date(y, m - 1, d, hours, minutes).getTime();
    };
    const parseInputDate = (value) => {
      if (!value) return 0;
      const [y, m, d] = String(value).split("-").map(Number);
      if (!d || !m || !y) return 0;
      return new Date(y, m - 1, d).getTime();
    };
    const fromTs = parseInputDate(fromDate);
    const toTs = parseInputDate(toDate);

    const result = invoices.filter((i) => {
      const invoiceTs = parseDate(i.date);
      const matchesSearch =
        !term || `${i.invoiceNo || ""} ${i.customerName || ""} ${i.date || ""} ${i.time || ""}`.toLowerCase().includes(term);
      const matchesCustomer = customerFilter === "all" || (i.customerName || "") === customerFilter;
      const matchesDate =
        dateFilter === "all" ||
        (dateFilter === "today" && isToday(i.date)) ||
        (dateFilter === "month" && isThisMonth(i.date)) ||
        (dateFilter === "range" &&
          invoiceTs > 0 &&
          (!fromTs || invoiceTs >= fromTs) &&
          (!toTs || invoiceTs <= toTs + 24 * 60 * 60 * 1000 - 1));
      return matchesSearch && matchesCustomer && matchesDate;
    });

    return result.sort((a, b) => {
      const aDate = parseInvoiceTimestamp(a);
      const bDate = parseInvoiceTimestamp(b);
      if (sortBy === "oldest") return aDate - bDate;
      if (sortBy === "amountHigh") return Number(b.grandTotal || b.total || 0) - Number(a.grandTotal || a.total || 0);
      if (sortBy === "amountLow") return Number(a.grandTotal || a.total || 0) - Number(b.grandTotal || b.total || 0);
      return bDate - aDate;
    });
  }, [invoices, query, customerFilter, dateFilter, fromDate, toDate, sortBy]);

  const rows = filtered;
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedRows = useMemo(
    () => rows.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [rows, currentPage],
  );
  const displayInvoiceNo = (value) => String(value || "").replace(/^INV-/i, "") || "-";
  const totalAmount = useMemo(
    () => rows.reduce((sum, i) => sum + Number(i.grandTotal || i.total || 0), 0),
    [rows],
  );

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="rounded-2xl bg-white p-3 shadow-sm dark:bg-slate-900 md:p-4">
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800">
            <p className="text-xs text-slate-500 dark:text-slate-400">Filtered Invoices</p>
            <p className="text-xl font-semibold">{rows.length}</p>
          </div>
          <div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800">
            <p className="text-xs text-slate-500 dark:text-slate-400">Total Amount</p>
            <p className="text-xl font-semibold">₹ {totalAmount.toLocaleString("en-IN")}</p>
          </div>
          <div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800">
            <p className="text-xs text-slate-500 dark:text-slate-400">Selected</p>
            <p className="text-xl font-semibold">{displayInvoiceNo(active?.invoiceNo)}</p>
          </div>
        </div>

        <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <h2 className="text-lg font-semibold">Invoices</h2>
          <input
            className="w-full rounded-lg border px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 sm:w-64"
            placeholder="Search invoice/customer/date"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <select
            className="rounded-lg border px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            value={customerFilter}
            onChange={(e) => {
              setCustomerFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">All customers</option>
            {customerOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <select
            className="rounded-lg border px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">All dates</option>
            <option value="today">Today</option>
            <option value="month">This month</option>
            <option value="range">Between two dates</option>
          </select>
          <select
            className="rounded-lg border px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setPage(1);
            }}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="amountHigh">Amount high to low</option>
            <option value="amountLow">Amount low to high</option>
          </select>
        </div>
        {dateFilter === "range" && (
          <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <input
              type="date"
              className="rounded-lg border px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
            />
            <input
              type="date"
              className="rounded-lg border px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
            />
            <button
              type="button"
              className="rounded-lg border px-3 py-2 text-sm dark:border-slate-700"
              onClick={() => {
                setFromDate("");
                setToDate("");
                setPage(1);
              }}
            >
              Clear
            </button>
          </div>
        )}

        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed p-5 text-center text-sm text-slate-500 dark:border-slate-700">
            No invoices found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 dark:bg-slate-800">
                <tr>
                  <th className="px-3 py-2 text-left">Invoice No</th>
                  <th className="px-3 py-2 text-left">Customer</th>
                  <th className="px-3 py-2 text-left">Date & Time</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                  <th className="px-3 py-2 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.map((i) => (
                  <tr
                    key={i.id}
                    className={`cursor-pointer border-b transition dark:border-slate-700 ${
                      active?.id === i.id ? "bg-slate-100 dark:bg-slate-800" : "hover:bg-slate-50 dark:hover:bg-slate-800/70"
                    }`}
                    onClick={() => setActive(i)}
                  >
                    <td className="px-3 py-2 font-medium">{displayInvoiceNo(i.invoiceNo)}</td>
                    <td className="px-3 py-2">{i.customerName || "Customer"}</td>
                    <td className="px-3 py-2">
                      {i.date || "-"}
                      {i.time ? `, ${i.time}` : ""}
                    </td>
                    <td className="px-3 py-2 text-right">₹ {Number(i.grandTotal || i.total || 0).toLocaleString("en-IN")}</td>
                    <td className="px-3 py-2 text-center">
                      <button
                        className="rounded border px-2 py-1 text-xs dark:border-slate-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActive(i);
                          setPrintSignal((s) => s + 1);
                        }}
                      >
                        Print
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {rows.length > 0 && (
          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-slate-500 dark:text-slate-400">
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

      <div className="rounded-2xl bg-white p-3 shadow-sm dark:bg-slate-900 md:p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Thermal Preview</h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {active?.invoiceNo ? `Selected: ${displayInvoiceNo(active.invoiceNo)}` : "No invoice selected"}
          </span>
        </div>
        <div className="overflow-x-auto rounded-xl bg-slate-100 p-2 dark:bg-slate-950">
          <div className="mx-auto w-fit">
            <ThermalInvoice invoice={active || { items: [] }} printSignal={printSignal} />
          </div>
        </div>
      </div>
    </div>
  );
}
