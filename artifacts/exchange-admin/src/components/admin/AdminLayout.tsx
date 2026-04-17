import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { BarChart3, BadgeIndianRupee, Coins, FileCheck2, Landmark, LogOut, Settings, ShieldCheck, Users, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clearSession, getAdmin } from "@/utils/auth";

const nav = [
  { to: "/", label: "Dashboard", icon: BarChart3 },
  { to: "/users", label: "Users", icon: Users },
  { to: "/kyc", label: "KYC", icon: FileCheck2 },
  { to: "/deposits", label: "INR Deposits", icon: BadgeIndianRupee },
  { to: "/inr-withdrawals", label: "INR Withdrawals", icon: Landmark },
  { to: "/crypto-withdrawals", label: "Crypto Withdrawals", icon: WalletCards },
  { to: "/transactions", label: "Transactions", icon: ShieldCheck },
  { to: "/markets", label: "Markets", icon: Coins },
  { to: "/roles", label: "Roles", icon: ShieldCheck },
  { to: "/settings", label: "Settings", icon: Settings },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const admin = getAdmin();
  const logout = () => {
    clearSession();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-border bg-card/95 p-5 lg:block">
        <div className="mb-8">
          <div className="text-2xl font-bold text-primary">CryptoX Admin</div>
          <div className="text-xs text-muted-foreground">Standalone exchange operations</div>
        </div>
        <nav className="space-y-1">
          {nav.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === "/"} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
              <item.icon size={17} />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-background/90 px-5 backdrop-blur">
          <div>
            <div className="font-semibold">Admin Control Center</div>
            <div className="text-xs text-muted-foreground">RBAC protected backend API</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right text-xs md:block">
              <div>{admin?.name}</div>
              <div className="text-muted-foreground">{admin?.email}</div>
            </div>
            <Button variant="outline" onClick={logout} className="gap-2"><LogOut size={15} /> Logout</Button>
          </div>
        </header>
        <main className="p-5 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
