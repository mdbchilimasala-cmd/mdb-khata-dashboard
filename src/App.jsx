import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { useEffect } from "react";
import { useAuthStore } from "./store/useAuthStore";
import { onAuthStateSync } from "./services/firebase/auth";
import { AppShell } from "./components/layout/AppShell";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { CustomersPage } from "./pages/CustomersPage";
import { ProductsPage } from "./pages/ProductsPage";
import { BillingPage } from "./pages/BillingPage";
import { InvoicesPage } from "./pages/InvoicesPage";
import { PaymentsPage } from "./pages/PaymentsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { ManualBillingPage } from "./pages/ManualBillingPage";
import { LedgerPage } from "./pages/LedgerPage";

function ProtectedRoutes() {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-slate-500">Restoring session...</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

function App() {
  const setUser = useAuthStore((s) => s.setUser);
  const setLoading = useAuthStore((s) => s.setLoading);
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);

  useEffect(() => {
    const unsub = onAuthStateSync(setUser, setLoading);
    return () => unsub();
  }, [setUser, setLoading]);

  return (
    <Routes>
      <Route
        path="/login"
        element={loading ? <div className="p-6 text-sm text-slate-500">Loading...</div> : user ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route element={<ProtectedRoutes />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/ledger" element={<LedgerPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/billing" element={<BillingPage />} />
        <Route path="/manual-billing" element={<ManualBillingPage />} />
        <Route path="/invoices" element={<InvoicesPage />} />
        <Route path="/payments" element={<PaymentsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
