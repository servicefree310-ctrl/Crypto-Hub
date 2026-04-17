import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  BarChart3, BadgeIndianRupee, Coins, FileCheck2, Landmark, LogOut,
  Settings, ShieldCheck, Users, WalletCards, Server, Network,
  Calendar, Mail, Key, Brain, Sparkles, ChevronDown, ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { clearSession, getAdmin } from "@/utils/auth";

interface NavItem {
  to?: string;
  label: string;
  icon: React.ElementType;
  children?: { to: string; label: string; icon: React.ElementType }[];
}

const nav: NavItem[] = [
  { to: "/", label: "Dashboard", icon: BarChart3 },
  { to: "/users", label: "Users", icon: Users },
  { to: "/kyc", label: "KYC", icon: FileCheck2 },
  {
    label: "Finance",
    icon: BadgeIndianRupee,
    children: [
      { to: "/deposits", label: "INR Deposits", icon: BadgeIndianRupee },
      { to: "/inr-withdrawals", label: "INR Withdrawals", icon: Landmark },
      { to: "/crypto-withdrawals", label: "Crypto Withdrawals", icon: WalletCards },
      { to: "/transactions", label: "Transactions", icon: ShieldCheck },
    ],
  },
  {
    label: "Markets",
    icon: Coins,
    children: [
      { to: "/markets", label: "Market Pairs", icon: Coins },
      { to: "/coin-schedule", label: "Coin Schedule", icon: Calendar },
    ],
  },
  {
    label: "System",
    icon: Server,
    children: [
      { to: "/services", label: "Services", icon: Server },
      { to: "/nodes", label: "Blockchain Nodes", icon: Network },
      { to: "/email-setup", label: "Email Setup", icon: Mail },
      { to: "/api-keys", label: "API Keys", icon: Key },
    ],
  },
  {
    label: "AI Tools",
    icon: Brain,
    children: [
      { to: "/ai-tool", label: "AI Code Tool", icon: Sparkles },
      { to: "/ai-integrations", label: "AI Integrations", icon: Brain },
    ],
  },
  { to: "/roles", label: "Roles", icon: ShieldCheck },
  { to: "/settings", label: "Settings", icon: Settings },
];

function NavGroup({ item }: { item: NavItem }) {
  const [open, setOpen] = useState(true);
  if (item.to) {
    return (
      <NavLink to={item.to} end={item.to === "/"} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition ${isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
        <item.icon size={16} />{item.label}
      </NavLink>
    );
  }
  return (
    <div>
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between px-4 py-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground transition">
        <div className="flex items-center gap-2"><item.icon size={13} />{item.label}</div>
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </button>
      {open && (
        <div className="ml-3 space-y-0.5 border-l border-border pl-3">
          {item.children?.map(child => (
            <NavLink key={child.to} to={child.to} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
              <child.icon size={14} />{child.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminLayout() {
  const navigate = useNavigate();
  const admin = getAdmin();
  const logout = () => {
    clearSession();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-border bg-card/95 flex-col lg:flex">
        <div className="p-5 border-b border-border">
          <div className="text-2xl font-bold text-primary">CryptoX Admin</div>
          <div className="text-xs text-muted-foreground">Exchange operations center</div>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-0.5">
          {nav.map((item, i) => <NavGroup key={i} item={item} />)}
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
