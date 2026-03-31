import { BarChart3, BookOpenText, Menu, ReceiptText, Users, X } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { logout } from "../../services/firebase/auth";
import { useAuthStore } from "../../store/useAuthStore";
import { useEffect, useState } from "react";
import { useThemeStore } from "../../store/useThemeStore";

const nav = [
  { to: "/", label: "Dashboard", icon: BarChart3 },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/ledger", label: "Ledger", icon: BookOpenText },
  { to: "/manual-billing", label: "Manual Bill", icon: ReceiptText },
  { to: "/invoices", label: "Invoices", icon: ReceiptText },
];

export function AppShell({ children }) {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const { dark, init, toggle } = useThemeStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => init(), [init]);

  return (
    <div className="flex min-h-screen bg-slate-100 dark:bg-slate-900">
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950 md:block">
        <h1 className="text-xl font-semibold">MDB Khata</h1>
        <nav className="mt-6 space-y-1">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${isActive ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900" : "text-slate-600 dark:text-slate-300"}`
              }
            >
              <item.icon size={16} />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 border-r border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
            <div className="mb-5 flex items-center justify-between">
              <h1 className="text-xl font-semibold">MDB Khata</h1>
              <button className="rounded border p-1 dark:border-slate-700" onClick={() => setMobileOpen(false)}>
                <X size={16} />
              </button>
            </div>
            <nav className="space-y-1">
              {nav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${isActive ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900" : "text-slate-600 dark:text-slate-300"}`
                  }
                >
                  <item.icon size={16} />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </aside>
        </div>
      )}
      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/90 p-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90 md:p-4">
          <div className="flex items-center gap-2">
            <button className="rounded-lg border p-2 dark:border-slate-700 md:hidden" onClick={() => setMobileOpen(true)}>
              <Menu size={16} />
            </button>
            <button onClick={toggle} className="rounded-lg border px-3 py-2 text-sm dark:border-slate-700">
              {dark ? "Light" : "Dark"}
            </button>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <p className="hidden text-sm sm:block">{user?.displayName}</p>
            <button
              onClick={async () => {
                await logout();
                navigate("/login");
              }}
              className="rounded-lg bg-slate-900 px-3 py-2 text-xs text-white dark:bg-slate-100 dark:text-slate-900 md:text-sm"
            >
              Logout
            </button>
          </div>
        </header>
        <div className="p-3 md:p-6">{children}</div>
      </main>
    </div>
  );
}
