import { useState } from "react";
import { useUserScopedList } from "../hooks/useUserScopedList";
import { saveRecord } from "../services/firebase/db";

export function SettingsPage() {
  const { uid, rows } = useUserScopedList("settings");
  const current = rows[0];
  const [form, setForm] = useState({
    business_name: current?.business_name || "MDB",
    invoice_prefix: current?.invoice_prefix || "INV",
    commission_pct: current?.commission_pct || 3,
    hamali_per_bag: current?.hamali_per_bag || 12,
  });

  return (
    <div className="max-w-xl rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900">
      <h2 className="mb-4 text-lg font-semibold">Settings</h2>
      {Object.keys(form).map((k) => (
        <input
          key={k}
          className="mb-2 w-full rounded border px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
          value={form[k]}
          onChange={(e) => setForm((s) => ({ ...s, [k]: e.target.value }))}
          placeholder={k}
        />
      ))}
      <button className="rounded bg-slate-900 px-3 py-2 text-white dark:bg-slate-100 dark:text-slate-900" onClick={() => saveRecord(uid, "settings", form, current?.id)}>
        Save Settings
      </button>
    </div>
  );
}
