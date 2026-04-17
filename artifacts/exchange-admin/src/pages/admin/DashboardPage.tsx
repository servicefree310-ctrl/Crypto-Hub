import { useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BadgeIndianRupee, TrendingUp, Users, WalletCards } from "lucide-react";
import { getDashboardStats, getRows } from "@/services/api";

type Stats = { totalUsers: number; totalDeposits: number; totalWithdrawals: number; tradingVolume: number };

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ totalUsers: 0, totalDeposits: 0, totalWithdrawals: 0, tradingVolume: 0 });
  const [activity, setActivity] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([getDashboardStats(), getRows("/admin/activity")]).then(([statsData, activityData]) => {
      setStats(statsData);
      setActivity(activityData);
    });
  }, []);

  const cards = [
    { label: "Total users", value: stats.totalUsers, icon: Users },
    { label: "Total deposits", value: stats.totalDeposits, icon: BadgeIndianRupee },
    { label: "Total withdrawals", value: stats.totalWithdrawals, icon: WalletCards },
    { label: "Trading volume", value: stats.tradingVolume, icon: TrendingUp },
  ];
  const chart = [
    { name: "Users", value: stats.totalUsers },
    { name: "Deposits", value: stats.totalDeposits },
    { name: "Withdrawals", value: stats.totalWithdrawals },
    { name: "Volume", value: stats.tradingVolume },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Live exchange overview from backend API.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => <div key={card.label} className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between text-muted-foreground"><span className="text-sm">{card.label}</span><card.icon size={18} /></div>
          <div className="mt-4 font-mono text-3xl font-bold">{Number(card.value).toLocaleString()}</div>
        </div>)}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-4 text-lg font-semibold">Operational chart</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chart}>
                <defs><linearGradient id="adminArea" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#fcd535" stopOpacity={0.35}/><stop offset="95%" stopColor="#fcd535" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="name" stroke="#8b949e" />
                <YAxis stroke="#8b949e" />
                <Tooltip contentStyle={{ background: "#181a20", border: "1px solid #2b3139" }} />
                <Area type="monotone" dataKey="value" stroke="#fcd535" fill="url(#adminArea)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-4 text-lg font-semibold">Recent admin logs</h2>
          <div className="space-y-3">
            {activity.map((item) => <div key={item.id} className="border-l border-primary/50 pl-3 text-sm text-muted-foreground">{item.message}</div>)}
            {!activity.length && <div className="text-sm text-muted-foreground">No activity yet.</div>}
          </div>
        </section>
      </div>
    </div>
  );
}
