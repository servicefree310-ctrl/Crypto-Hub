import { useState } from "react";
import { Copy, ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { useToast } from "@/hooks/use-toast";

const ASSETS = [
  { symbol: "BTC", name: "Bitcoin", amount: 0.15, price: 64250.50, change: 2.5, color: "#F7931A", alloc: 42 },
  { symbol: "ETH", name: "Ethereum", amount: 2.5, price: 3180.20, change: -1.2, color: "#627EEA", alloc: 34 },
  { symbol: "BNB", name: "BNB", amount: 10, price: 580.40, change: 5.4, color: "#fcd535", alloc: 12 },
  { symbol: "USDT", name: "Tether", amount: 1234.56, price: 1.00, change: 0.01, color: "#26A17B", alloc: 8 },
  { symbol: "SOL", name: "Solana", amount: 12.5, price: 142.60, change: 8.2, color: "#9945FF", alloc: 4 },
];

const TRANSACTIONS = [
  { date: "2024-04-15 14:32", type: "Deposit", coin: "BTC", amount: "+0.05", status: "Completed", txid: "3f8a...9d2b" },
  { date: "2024-04-14 09:18", type: "Withdraw", coin: "USDT", amount: "-500.00", status: "Completed", txid: "7c1e...4a5f" },
  { date: "2024-04-13 16:45", type: "Transfer", coin: "ETH", amount: "+1.20", status: "Completed", txid: "b2d4...1e8c" },
  { date: "2024-04-12 11:22", type: "Deposit", coin: "SOL", amount: "+10.00", status: "Pending", txid: "a9f3...6b7d" },
  { date: "2024-04-11 08:55", type: "Withdraw", coin: "BNB", amount: "-5.00", status: "Completed", txid: "e5c2...3f9a" },
];

const totalValue = ASSETS.reduce((acc, a) => acc + a.amount * a.price, 0);
const totalBtc = totalValue / 64250.50;

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  return (
    <div className="bg-card border border-border rounded px-3 py-2 text-xs shadow-lg">
      <div className="font-semibold text-foreground">{name}</div>
      <div className="text-muted-foreground">{value}% allocation</div>
    </div>
  );
};

export default function Wallet() {
  const [copiedTx, setCopiedTx] = useState<string | null>(null);
  const { toast } = useToast();

  const handleCopy = (txid: string) => {
    navigator.clipboard.writeText(txid).catch(() => {});
    setCopiedTx(txid);
    toast({ title: "Copied!", description: "Transaction ID copied to clipboard" });
    setTimeout(() => setCopiedTx(null), 2000);
  };

  const handleAction = (action: string) => {
    toast({ title: action, description: `${action} functionality coming soon` });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Wallet Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your crypto assets</p>
        </div>

        {/* Top Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Total Balance */}
          <div className="lg:col-span-2 bg-gradient-to-br from-card to-secondary/30 border border-border rounded-xl p-6 space-y-4">
            <div className="text-sm text-muted-foreground">Total Portfolio Value</div>
            <div>
              <div data-testid="total-balance" className="text-4xl font-mono font-bold text-foreground">
                ${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                ≈ {totalBtc.toFixed(6)} BTC
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">24h P&L:</span>
              <span className="text-sm font-mono font-medium text-success flex items-center gap-1">
                <TrendingUp size={12} /> +$482.30 (+3.21%)
              </span>
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                data-testid="btn-deposit"
                onClick={() => handleAction("Deposit")}
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-medium gap-2"
              >
                <ArrowDownToLine size={16} /> Deposit
              </Button>
              <Button
                data-testid="btn-withdraw"
                onClick={() => handleAction("Withdraw")}
                variant="outline"
                className="flex-1 border-border hover:bg-secondary font-medium gap-2"
              >
                <ArrowUpFromLine size={16} /> Withdraw
              </Button>
              <Button
                data-testid="btn-transfer"
                onClick={() => handleAction("Transfer")}
                variant="outline"
                className="flex-1 border-border hover:bg-secondary font-medium gap-2"
              >
                <ArrowLeftRight size={16} /> Transfer
              </Button>
            </div>
          </div>

          {/* Allocation Chart */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="text-sm font-semibold text-foreground mb-4">Allocation</div>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={ASSETS.map(a => ({ name: a.symbol, value: a.alloc }))}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  {ASSETS.map((asset, i) => (
                    <Cell key={i} fill={asset.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 mt-3">
              {ASSETS.map(a => (
                <div key={a.symbol} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: a.color }} />
                    <span className="text-muted-foreground">{a.symbol}</span>
                  </div>
                  <span className="font-mono text-foreground">{a.alloc}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tabs: Assets + Transactions */}
        <Tabs defaultValue="assets" className="bg-card border border-border rounded-xl overflow-hidden">
          <TabsList className="bg-secondary/30 border-b border-border rounded-none h-auto p-0 gap-0">
            <TabsTrigger data-testid="tab-assets" value="assets" className="rounded-none px-6 py-3 text-sm border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground text-muted-foreground">
              Assets
            </TabsTrigger>
            <TabsTrigger data-testid="tab-transactions" value="transactions" className="rounded-none px-6 py-3 text-sm border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground text-muted-foreground">
              Transaction History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assets" className="mt-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-border bg-secondary/20">
                  <tr>
                    {["Coin", "Amount", "Value (USD)", "24h Change", "Allocation", "Action"].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ASSETS.map(asset => {
                    const value = asset.amount * asset.price;
                    return (
                      <tr key={asset.symbol} data-testid={`asset-row-${asset.symbol}`} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                              style={{ backgroundColor: asset.color + "33", color: asset.color }}
                            >
                              {asset.symbol[0]}
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-foreground">{asset.symbol}</div>
                              <div className="text-xs text-muted-foreground">{asset.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="text-sm font-mono text-foreground">{asset.amount.toLocaleString()}</div>
                          <div className="text-xs font-mono text-muted-foreground">
                            @${asset.price >= 1 ? asset.price.toLocaleString("en-US", { minimumFractionDigits: 2 }) : asset.price.toFixed(4)}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-sm font-mono text-foreground">
                            ${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className={`flex items-center gap-1 text-sm font-mono font-medium ${asset.change >= 0 ? "text-success" : "text-destructive"}`}>
                            {asset.change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            {asset.change >= 0 ? "+" : ""}{asset.change.toFixed(2)}%
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-secondary rounded-full h-1.5 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{ width: `${asset.alloc}%`, backgroundColor: asset.color }}
                              />
                            </div>
                            <span className="text-xs font-mono text-muted-foreground">{asset.alloc}%</span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              data-testid={`btn-deposit-${asset.symbol}`}
                              onClick={() => handleAction(`Deposit ${asset.symbol}`)}
                              className="text-xs h-7 border-border hover:border-primary/50 hover:text-primary transition-all"
                            >
                              Deposit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              data-testid={`btn-withdraw-${asset.symbol}`}
                              onClick={() => handleAction(`Withdraw ${asset.symbol}`)}
                              className="text-xs h-7 border-border hover:border-destructive/50 hover:text-destructive transition-all"
                            >
                              Withdraw
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="transactions" className="mt-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-border bg-secondary/20">
                  <tr>
                    {["Date & Time", "Type", "Coin", "Amount", "Status", "Transaction ID"].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TRANSACTIONS.map((tx, i) => (
                    <tr key={i} data-testid={`tx-row-${i}`} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                      <td className="px-5 py-4 text-sm font-mono text-muted-foreground">{tx.date}</td>
                      <td className="px-5 py-4">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                          tx.type === "Deposit"
                            ? "bg-success/10 text-success"
                            : tx.type === "Withdraw"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-primary/10 text-primary"
                        }`}>
                          {tx.type}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold text-foreground">{tx.coin}</td>
                      <td className={`px-5 py-4 text-sm font-mono font-medium ${tx.amount.startsWith("+") ? "text-success" : "text-destructive"}`}>
                        {tx.amount}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                          tx.status === "Completed" ? "bg-success/10 text-success" : "bg-primary/10 text-primary"
                        }`}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground">{tx.txid}</span>
                          <button
                            data-testid={`btn-copy-txid-${i}`}
                            onClick={() => handleCopy(tx.txid)}
                            className="text-muted-foreground hover:text-primary transition-colors"
                          >
                            <Copy size={12} className={copiedTx === tx.txid ? "text-primary" : ""} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
