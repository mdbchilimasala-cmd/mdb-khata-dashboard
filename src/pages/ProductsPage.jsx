import { useState } from "react";
import { useUserScopedList } from "../hooks/useUserScopedList";
import { saveRecord } from "../services/firebase/db";

export function ProductsPage() {
  const { uid, rows } = useUserScopedList("products");
  const { rows: stockLogs } = useUserScopedList("stock_logs");
  const [product, setProduct] = useState({ name: "", lot_no_enabled: true });
  const [stock, setStock] = useState({ product_id: "", lot_no: "", quantity: "", purchase_price: "" });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900">
        <h2 className="mb-3 font-semibold">Add Product</h2>
        <input className="mb-2 w-full rounded border px-3 py-2 dark:border-slate-700 dark:bg-slate-950" placeholder="Product Name" value={product.name} onChange={(e) => setProduct({ ...product, name: e.target.value })} />
        <label className="mb-2 block text-sm">
          <input type="checkbox" checked={product.lot_no_enabled} onChange={(e) => setProduct({ ...product, lot_no_enabled: e.target.checked })} /> Lot Enabled
        </label>
        <button className="rounded bg-slate-900 px-3 py-2 text-white dark:bg-slate-100 dark:text-slate-900" onClick={() => saveRecord(uid, "products", { ...product, stock: 0 })}>
          Save Product
        </button>
        <h3 className="mt-4 text-sm font-medium">Products</h3>
        <div className="mt-2 space-y-2">
          {rows.map((p) => (
            <div key={p.id} className="rounded border p-2 text-sm dark:border-slate-700">
              <span className="truncate">{p.name}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900">
        <h2 className="mb-3 font-semibold">Add Stock (Lot)</h2>
        <select className="mb-2 w-full rounded border px-3 py-2 dark:border-slate-700 dark:bg-slate-950" value={stock.product_id} onChange={(e) => setStock({ ...stock, product_id: e.target.value })}>
          <option value="">Select Product</option>
          {rows.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <input className="mb-2 w-full rounded border px-3 py-2 dark:border-slate-700 dark:bg-slate-950" placeholder="Lot no" value={stock.lot_no} onChange={(e) => setStock({ ...stock, lot_no: e.target.value })} />
        <input className="mb-2 w-full rounded border px-3 py-2 dark:border-slate-700 dark:bg-slate-950" placeholder="Qty" value={stock.quantity} onChange={(e) => setStock({ ...stock, quantity: e.target.value })} />
        <input className="mb-2 w-full rounded border px-3 py-2 dark:border-slate-700 dark:bg-slate-950" placeholder="Purchase price" value={stock.purchase_price} onChange={(e) => setStock({ ...stock, purchase_price: e.target.value })} />
        <button className="rounded bg-slate-900 px-3 py-2 text-white dark:bg-slate-100 dark:text-slate-900" onClick={() => saveRecord(uid, "stock_logs", stock)}>
          Add Stock
        </button>
        <h3 className="mt-4 text-sm font-medium">Stock Logs</h3>
        <div className="mt-2 space-y-2">
          {stockLogs.slice(-10).reverse().map((l) => (
            <div key={l.id} className="rounded border p-2 text-sm dark:border-slate-700">
              <span className="truncate">{l.lot_no} | Qty {l.quantity}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
