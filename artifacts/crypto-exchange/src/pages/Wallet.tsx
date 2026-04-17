import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Copy, ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight, TrendingUp, TrendingDown, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { useToast } from "@/hooks/use-toast";
import { walletApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "wouter";

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  return (
    <div className="bg-card border border-border rounded px-3 py-2 text-xs shadow-lg">
      <div className="font-semibold text-foreground">{name}</div>
      <div className="text-muted-foreground">${Number(value).toLocaleString("en-US", { maximumFractionDigits: 2 })}</div>
    </div>
  );
};

function WalletUnauthenticated() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <Lock size={28} className="text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Sign In Required</h2>
        <p className="text-muted-foreground">Please log in to view your wallet and balances.</p>
        <div className="flex gap-3 justify-center pt-2">
          <Link href="/login">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">Sign In</Button>
          </Link>
          <Link href="/register">
            <Button variant="outline" className="border-border">Create Account</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function Wallet() {
  const [copiedTx, setCopiedTx] = useState<string | null>(null);
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawForm, setWithdrawForm] = useState({ currency: "USDT", network: "ERC20", address: "", amount: "" });
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const qc = useQueryClient();

  const { data: walletData, isLoading } = useQuery({
    queryKey: ["wallet-balances"],
    queryFn: walletApi.getBalances,
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["wallet-transactions"],
    queryFn: walletApi.getTransactions,
    enabled: isAuthenticated,
  });

  const withdrawMutation = useMutation({
    mutationFn: walletApi.withdrawCrypto,
    onSuccess: () => {
      toast({ title: "Withdrawal Submitted", description: "Your withdrawal request has been submitted for processing." });
      qc.invalidateQueries({ queryKey: ["wallet-balances"] });
      setShowWithdraw(false);
    },
    onError: (err: any) => {
      toast({ title: "Withdrawal Failed", description: err?.response?.data?.error ?? "Could not process withdrawal", variant: "destructive" });
    },
  });

  const handleCopy = (txid: string) => {
    navigator.clipboard.writeText(txid).catch(() => {});
    setCopiedTx(txid);
    toast({ title: "Copied!", description: "Transaction ID copied to clipboard" });
    setTimeout(() => setCopiedTx(null), 2000);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) return <WalletUnauthenticated />;

  const balances = walletData?.balances ?? [];
  const totalUsd = walletData?.totalUsd ?? 0;
  const totalBtc = totalUsd / 64250.50;

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
            {isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground"><Loader2 size={16} className="animate-spin" /> Loading balances...</div>
            ) : (
              <>
                <div>
                  <div data-testid="total-balance" className="text-4xl font-mono font-bold text-foreground">
                    ${totalUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">≈ {totalBtc.toFixed(6)} BTC</div>
                </div>
              </>
            )}
            <div className="flex gap-3 pt-2">
              <Button
                data-testid="btn-deposit"
                onClick={() => setShowDeposit(v => !v)}
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-medium gap-2"
              >
                <ArrowDownToLine size={16} /> Deposit
              </Button>
              <Button
                data-testid="btn-withdraw"
                onClick={() => setShowWithdraw(v => !v)}
                variant="outline"
                className="flex-1 border-border hover:bg-secondary font-medium gap-2"
              >
                <ArrowUpFromLine size={16} /> Withdraw
              </Button>
              <Button
                data-testid="btn-transfer"
                onClick={() => toast({ title: "Transfer", description: "Spot→Futures transfer coming soon" })}
                variant="outline"
                className="flex-1 border-border hover:bg-secondary font-medium gap-2"
              >
                <ArrowLeftRight size={16} /> Transfer
              </Button>
            </div>

            {/* Deposit Panel */}
            {showDeposit && (
              <div className="mt-4 p-4 bg-secondary/50 rounded-lg border border-border space-y-3">
                <div className="text-sm font-semibold text-foreground">Deposit Crypto</div>
                <p className="text-xs text-muted-foreground">Send crypto to your deposit address. Deposits are credited after network confirmations.</p>
                <div className="bg-card border border-border rounded-md p-3 text-center">
                  <div className="text-xs text-muted-foreground mb-1">Your USDT (ERC20) Address</div>
                  <div className="font-mono text-xs text-foreground break-all">0x742d35Cc6634C0532925a3b844Bc454e4438f44e</div>
                  <Button size="sm" variant="outline" className="mt-2 text-xs h-7" onClick={() => handleCopy("0x742d35Cc6634C0532925a3b844Bc454e4438f44e")}>
                    <Copy size={10} className="mr-1" /> Copy Address
                  </Button>
                </div>
              </div>
            )}

            {/* Withdraw Panel */}
            {showWithdraw && (
              <div className="mt-4 p-4 bg-secondary/50 rounded-lg border border-border space-y-3">
                <div className="text-sm font-semibold text-foreground">Withdraw Crypto</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Currency</Label>
                    <select value={withdrawForm.currency} onChange={e => setWithdrawForm(f => ({ ...f, currency: e.target.value }))}
                      className="w-full h-9 bg-secondary border border-border rounded-md text-sm px-2 text-foreground">
                      {balances.map((b: any) => <option key={b.currency} value={b.currency}>{b.currency}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Network</Label>
                    <select value={withdrawForm.network} onChange={e => setWithdrawForm(f => ({ ...f, network: e.target.value }))}
                      className="w-full h-9 bg-secondary border border-border rounded-md text-sm px-2 text-foreground">
                      <option value="ERC20">ERC20</option>
                      <option value="BEP20">BEP20</option>
                      <option value="TRC20">TRC20</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Recipient Address</Label>
                  <Input value={withdrawForm.address} onChange={e => setWithdrawForm(f => ({ ...f, address: e.target.value }))}
                    placeholder="0x..." className="bg-secondary border-border h-9 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Amount</Label>
                  <Input type="number" value={withdrawForm.amount} onChange={e => setWithdrawForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder="0.00" className="bg-secondary border-border h-9 text-sm" />
                </div>
                <Button
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-9 text-sm"
                  disabled={withdrawMutation.isPending || !withdrawForm.address || !withdrawForm.amount}
                  onClick={() => withdrawMutation.mutate({ currency: withdrawForm.currency, network: withdrawForm.network, address: withdrawForm.address, amount: Number(withdrawForm.amount) })}
                >
                  {withdrawMutation.isPending ? <><Loader2 size={14} className="animate-spin mr-2" />Processing...</> : "Submit Withdrawal"}
                </Button>
              </div>
            )}
          </div>

          {/* Allocation Chart */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="text-sm font-semibold text-foreground mb-4">Allocation</div>
            {isLoading ? (
              <div className="h-40 flex items-center justify-center"><Loader2 size={20} className="animate-spin text-primary" /></div>
            ) : balances.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={balances.map((b: any) => ({ name: b.currency, value: b.usdValue }))} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2} dataKey="value" stroke="none">
                      {balances.map((b: any, i: number) => <Cell key={i} fill={b.color} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-3">
                  {balances.map((b: any) => {
                    const pct = totalUsd > 0 ? (b.usdValue / totalUsd * 100).toFixed(1) : "0";
                    return (
                      <div key={b.currency} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: b.color }} />
                          <span className="text-muted-foreground">{b.currency}</span>
                        </div>
                        <span className="font-mono text-foreground">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">No assets yet</div>
            )}
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
                    {["Coin", "Available", "Locked", "Value (USD)", "Action"].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan={5} className="px-5 py-8 text-center text-muted-foreground"><Loader2 size={20} className="animate-spin mx-auto" /></td></tr>
                  ) : balances.length === 0 ? (
                    <tr><td colSpan={5} className="px-5 py-8 text-center text-muted-foreground text-sm">No assets in your wallet</td></tr>
                  ) : balances.map((b: any) => (
                    <tr key={b.currency} data-testid={`asset-row-${b.currency}`} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0" style={{ backgroundColor: b.color + "33", color: b.color }}>
                            {b.currency[0]}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-foreground">{b.currency}</div>
                            <div className="text-xs text-muted-foreground">${b.price >= 1 ? b.price.toLocaleString("en-US", { minimumFractionDigits: 2 }) : b.price.toFixed(6)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm font-mono text-foreground">{Number(b.available).toFixed(6)}</td>
                      <td className="px-5 py-4 text-sm font-mono text-muted-foreground">{Number(b.locked).toFixed(6)}</td>
                      <td className="px-5 py-4 text-sm font-mono text-foreground">
                        ${b.usdValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" data-testid={`btn-deposit-${b.currency}`} onClick={() => setShowDeposit(true)} className="text-xs h-7 border-border hover:border-primary/50 hover:text-primary transition-all">Deposit</Button>
                          <Button size="sm" variant="outline" data-testid={`btn-withdraw-${b.currency}`} onClick={() => { setWithdrawForm(f => ({ ...f, currency: b.currency })); setShowWithdraw(true); }} className="text-xs h-7 border-border hover:border-destructive/50 hover:text-destructive transition-all">Withdraw</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="transactions" className="mt-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-border bg-secondary/20">
                  <tr>
                    {["Date & Time", "Type", "Currency", "Amount", "Status"].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {transactions.length === 0 ? (
                    <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-muted-foreground">No transactions yet. Deposit some crypto to get started!</td></tr>
                  ) : transactions.map((tx: any, i: number) => (
                    <tr key={tx.id ?? i} data-testid={`tx-row-${i}`} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                      <td className="px-5 py-4 text-sm font-mono text-muted-foreground">{tx.createdAt ? new Date(tx.createdAt).toLocaleString() : "--"}</td>
                      <td className="px-5 py-4">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                          tx.type === "deposit" ? "bg-success/10 text-success" : tx.type === "withdrawal" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
                        }`}>{tx.type ?? "Transfer"}</span>
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold text-foreground">{tx.currency ?? "--"}</td>
                      <td className="px-5 py-4 text-sm font-mono font-medium text-foreground">{tx.amount ?? "--"}</td>
                      <td className="px-5 py-4">
                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-success/10 text-success">{tx.status ?? "Completed"}</span>
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
