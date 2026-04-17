import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AdminLayout from "@/components/admin/AdminLayout";
import ProtectedRoute from "@/routes/ProtectedRoute";
import LoginPage from "@/pages/admin/LoginPage";
import DashboardPage from "@/pages/admin/DashboardPage";
import UsersPage from "@/pages/admin/UsersPage";
import RecordsPage from "@/pages/admin/RecordsPage";
import RolesPage from "@/pages/admin/RolesPage";

const queryClient = new QueryClient();

function App() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "") || "/"}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<AdminLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="users" element={<UsersPage />} />
                <Route path="kyc" element={<RecordsPage title="KYC Management" endpoint="/admin/kyc" actionEndpoint="/admin/kyc/approve" columns={["id", "userId", "documentType", "documentRef", "status"]} permission="kyc" />} />
                <Route path="deposits" element={<RecordsPage title="INR Deposit Management" endpoint="/admin/inr/deposits" actionEndpoint="/admin/inr/deposit/approve" columns={["id", "userId", "amount", "fee", "method", "utr", "status"]} permission="deposits" />} />
                <Route path="inr-withdrawals" element={<RecordsPage title="INR Withdraw Management" endpoint="/admin/inr/withdrawals" actionEndpoint="/admin/inr/withdraw/approve" columns={["id", "userId", "amount", "fee", "bankAccountId", "status"]} permission="withdrawals" />} />
                <Route path="crypto-withdrawals" element={<RecordsPage title="Crypto Withdraw Management" endpoint="/admin/crypto/withdrawals" actionEndpoint="/admin/crypto/withdraw/approve" columns={["id", "userId", "currency", "network", "address", "amount", "fee", "status"]} permission="withdrawals" />} />
                <Route path="transactions" element={<RecordsPage title="Transactions & Ledger" endpoint="/admin/transactions" columns={["id", "userId", "type", "currency", "amount", "status", "reference"]} permission="dashboard" />} />
                <Route path="markets" element={<RecordsPage title="Market Management" endpoint="/admin/markets" actionEndpoint="/admin/market/toggle" actionLabel="Toggle" columns={["id", "symbol", "base", "quote", "minOrder", "tickSize", "stepSize", "status"]} permission="markets" />} />
                <Route path="roles" element={<RolesPage />} />
                <Route path="settings" element={<RecordsPage title="System Settings" endpoint="/admin/system-settings" columns={["id", "group", "key", "value", "type"]} permission="settings" />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
