import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  BadgeDollarSign,
  Coins,
  Loader2,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import {
  getGetAdminOverviewQueryKey,
  getListAdminActivityQueryKey,
  getListAdminCoinsQueryKey,
  getListAdminFeeTiersQueryKey,
  getListAdminPairsQueryKey,
  getListAdminUsersQueryKey,
  useCreateAdminCoin,
  useCreateAdminPair,
  useCreateAdminUser,
  useDeleteAdminCoin,
  useDeleteAdminPair,
  useDeleteAdminUser,
  useGetAdminOverview,
  useListAdminActivity,
  useListAdminCoins,
  useListAdminFeeTiers,
  useListAdminPairs,
  useListAdminUsers,
  useUpdateAdminFeeTier,
  type AdminCoin,
  type AdminFeeTier,
  type AdminPair,
  type AdminUser,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AdminSection = "coins" | "pairs" | "users" | "fees";
type FeeField = keyof Omit<AdminFeeTier, "id" | "name">;

const sections: { id: AdminSection; label: string; icon: typeof Coins }[] = [
  { id: "coins", label: "Coins", icon: Coins },
  { id: "pairs", label: "Pairs", icon: BadgeDollarSign },
  { id: "users", label: "Users", icon: Users },
  { id: "fees", label: "Fees", icon: Settings },
];

const adminQueryKeys = [
  getGetAdminOverviewQueryKey(),
  getListAdminActivityQueryKey(),
  getListAdminCoinsQueryKey(),
  getListAdminPairsQueryKey(),
  getListAdminUsersQueryKey(),
  getListAdminFeeTiersQueryKey(),
];

const statusClass = (status: string) => {
  if (["Active", "Listed", "Verified"].includes(status)) return "bg-success/10 text-success border-success/20";
  if (["Suspended", "Paused", "Rejected"].includes(status)) return "bg-destructive/10 text-destructive border-destructive/20";
  return "bg-primary/10 text-primary border-primary/20";
};

const currency = (value: number) =>
  value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

export default function Admin() {
  const queryClient = useQueryClient();
  const [section, setSection] = useState<AdminSection>("coins");
  const [query, setQuery] = useState("");
  const [coinForm, setCoinForm] = useState({ symbol: "", name: "", network: "", price: "" });
  const [pairForm, setPairForm] = useState({ base: "", quote: "USDT", minOrder: "10", maxLeverage: "20" });
  const [userForm, setUserForm] = useState({ name: "", email: "", role: "User" as AdminUser["role"] });
  const [feeDrafts, setFeeDrafts] = useState<Record<number, Omit<AdminFeeTier, "id" | "name">>>({});
  const [message, setMessage] = useState("");

  const overviewQuery = useGetAdminOverview();
  const activityQuery = useListAdminActivity();
  const coinsQuery = useListAdminCoins();
  const pairsQuery = useListAdminPairs();
  const usersQuery = useListAdminUsers();
  const feesQuery = useListAdminFeeTiers();

  const coins = coinsQuery.data ?? [];
  const pairs = pairsQuery.data ?? [];
  const users = usersQuery.data ?? [];
  const fees = feesQuery.data ?? [];
  const activity = activityQuery.data ?? [];
  const loading = overviewQuery.isLoading || coinsQuery.isLoading || pairsQuery.isLoading || usersQuery.isLoading || feesQuery.isLoading;
  const error = overviewQuery.error || activityQuery.error || coinsQuery.error || pairsQuery.error || usersQuery.error || feesQuery.error;

  useEffect(() => {
    if (!fees.length) return;
    setFeeDrafts((current) => {
      const next = { ...current };
      for (const fee of fees) {
        if (!next[fee.id]) {
          next[fee.id] = {
            makerFee: fee.makerFee,
            takerFee: fee.takerFee,
            withdrawalFee: fee.withdrawalFee,
            minVolume: fee.minVolume,
          };
        }
      }
      return next;
    });
  }, [fees]);

  const invalidateAdmin = async () => {
    await Promise.all(adminQueryKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
  };

  const mutationOptions = (successMessage: string) => ({
    mutation: {
      onSuccess: async () => {
        await invalidateAdmin();
        setMessage(successMessage);
      },
      onError: (err: unknown) => setMessage(err instanceof Error ? err.message : "Request failed"),
    },
  });

  const createCoinMutation = useCreateAdminCoin(mutationOptions("Coin saved to database."));
  const createPairMutation = useCreateAdminPair(mutationOptions("Trading pair saved to database."));
  const createUserMutation = useCreateAdminUser(mutationOptions("User saved to database."));
  const deleteCoinMutation = useDeleteAdminCoin(mutationOptions("Coin deleted from database."));
  const deletePairMutation = useDeleteAdminPair(mutationOptions("Trading pair deleted from database."));
  const deleteUserMutation = useDeleteAdminUser(mutationOptions("User deleted from database."));
  const updateFeeMutation = useUpdateAdminFeeTier(mutationOptions("Fee setup saved to database."));

  const summary = useMemo(() => {
    const overview = overviewQuery.data;
    return [
      { label: "Listed Coins", value: overview?.listedCoins ?? 0, note: `${overview?.totalCoins ?? coins.length} total` },
      { label: "Active Pairs", value: overview?.activePairs ?? 0, note: `${overview?.totalPairs ?? pairs.length} markets` },
      { label: "Users", value: overview?.users ?? users.length, note: `${overview?.pendingKyc ?? 0} KYC pending` },
      { label: "Top Fee Tier", value: `${(overview?.topMakerFee ?? 0).toFixed(3)}%`, note: "maker fee" },
    ];
  }, [overviewQuery.data, coins.length, pairs.length, users.length]);

  const filteredCoins = coins.filter((coin) =>
    `${coin.symbol} ${coin.name} ${coin.network}`.toLowerCase().includes(query.toLowerCase()),
  );
  const filteredPairs = pairs.filter((pair) =>
    `${pair.base}/${pair.quote} ${pair.status}`.toLowerCase().includes(query.toLowerCase()),
  );
  const filteredUsers = users.filter((user) =>
    `${user.name} ${user.email} ${user.role} ${user.kyc}`.toLowerCase().includes(query.toLowerCase()),
  );

  const createCoin = () => {
    if (!coinForm.symbol.trim() || !coinForm.name.trim()) return;
    createCoinMutation.mutate({
      data: {
        symbol: coinForm.symbol.trim().toUpperCase(),
        name: coinForm.name.trim(),
        network: coinForm.network.trim() || coinForm.symbol.trim().toUpperCase(),
        price: Number(coinForm.price) || 0,
      },
    });
    setCoinForm({ symbol: "", name: "", network: "", price: "" });
  };

  const createPair = () => {
    if (!pairForm.base.trim() || !pairForm.quote.trim()) return;
    createPairMutation.mutate({
      data: {
        base: pairForm.base.trim().toUpperCase(),
        quote: pairForm.quote.trim().toUpperCase(),
        minOrder: Number(pairForm.minOrder) || 0,
        maxLeverage: Number(pairForm.maxLeverage) || 1,
      },
    });
    setPairForm({ base: "", quote: "USDT", minOrder: "10", maxLeverage: "20" });
  };

  const createUser = () => {
    if (!userForm.name.trim() || !userForm.email.trim()) return;
    createUserMutation.mutate({
      data: {
        name: userForm.name.trim(),
        email: userForm.email.trim(),
        role: userForm.role,
      },
    });
    setUserForm({ name: "", email: "", role: "User" });
  };

  const updateFeeDraft = (id: number, key: FeeField, value: string) => {
    setFeeDrafts((items) => ({
      ...items,
      [id]: {
        ...(items[id] ?? { makerFee: 0, takerFee: 0, withdrawalFee: 0, minVolume: 0 }),
        [key]: Number(value) || 0,
      },
    }));
  };

  const saveFees = async () => {
    const changes = fees.filter((fee) => feeDrafts[fee.id]);
    await Promise.all(changes.map((fee) => updateFeeMutation.mutateAsync({ id: fee.id, data: feeDrafts[fee.id] })));
  };

  return (
    <div className="min-h-screen bg-background">
      <section className="border-b border-border bg-[radial-gradient(ellipse_at_top,rgba(252,213,53,0.08)_0%,transparent_55%)]">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/10 text-primary text-xs font-medium mb-4">
                <ShieldCheck size={14} />
                Live PostgreSQL admin database connected
              </div>
              <h1 className="text-4xl font-bold tracking-tight">Exchange Admin Panel</h1>
              <p className="text-muted-foreground mt-2 max-w-2xl">
                Manage coin listings, trading pairs, users, and platform fee tiers with live backend data.
              </p>
              {(message || error) && (
                <div className={`mt-3 text-xs ${error ? "text-destructive" : "text-primary"}`}>
                  {error instanceof Error ? error.message : message}
                </div>
              )}
            </div>
            <div className="relative w-full lg:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search admin records..."
                className="pl-9 bg-card border-border"
                data-testid="input-admin-search"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
            {summary.map((item) => (
              <div key={item.label} className="bg-card border border-border rounded-xl p-4">
                <div className="text-xs text-muted-foreground">{item.label}</div>
                <div className="text-2xl font-bold font-mono mt-2">{loading ? <Loader2 className="animate-spin" size={20} /> : item.value}</div>
                <div className="text-xs text-primary mt-1">{item.note}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 py-8 grid lg:grid-cols-[220px_1fr] gap-6">
        <aside className="space-y-2">
          {sections.map((item) => (
            <button
              key={item.id}
              onClick={() => setSection(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                section === item.id ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
              data-testid={`admin-section-${item.id}`}
            >
              <item.icon size={16} />
              {item.label}
            </button>
          ))}

          <div className="bg-card border border-border rounded-xl p-4 mt-6">
            <h3 className="font-semibold text-sm mb-3">Recent live actions</h3>
            <div className="space-y-3">
              {activity.map((item) => (
                <div key={item.id} className="text-xs text-muted-foreground border-l border-primary/40 pl-3">
                  {item.message}
                </div>
              ))}
              {!activity.length && <div className="text-xs text-muted-foreground">No activity yet.</div>}
            </div>
          </div>
        </aside>

        <main className="space-y-6">
          {section === "coins" && (
            <>
              <div className="bg-card border border-border rounded-xl p-5">
                <h2 className="font-semibold text-lg mb-4">Create coin listing</h2>
                <div className="grid md:grid-cols-5 gap-3">
                  <Input value={coinForm.symbol} onChange={(event) => setCoinForm({ ...coinForm, symbol: event.target.value })} placeholder="Symbol" />
                  <Input value={coinForm.name} onChange={(event) => setCoinForm({ ...coinForm, name: event.target.value })} placeholder="Coin name" />
                  <Input value={coinForm.network} onChange={(event) => setCoinForm({ ...coinForm, network: event.target.value })} placeholder="Network" />
                  <Input value={coinForm.price} onChange={(event) => setCoinForm({ ...coinForm, price: event.target.value })} placeholder="Price" type="number" />
                  <Button onClick={createCoin} disabled={createCoinMutation.isPending} className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2" data-testid="btn-create-coin">
                    {createCoinMutation.isPending ? <Loader2 className="animate-spin" size={15} /> : <Plus size={15} />} Add Coin
                  </Button>
                </div>
              </div>

              <DataPanel title="Coin list">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-secondary/40">
                      <Th>Coin</Th>
                      <Th>Network</Th>
                      <Th align="right">Price</Th>
                      <Th>Status</Th>
                      <Th>Wallets</Th>
                      <Th align="right">Action</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCoins.map((coin) => (
                      <tr key={coin.id} className="border-b border-border/50 hover:bg-secondary/20">
                        <Td>
                          <div className="font-semibold">{coin.symbol}</div>
                          <div className="text-xs text-muted-foreground">{coin.name}</div>
                        </Td>
                        <Td>{coin.network}</Td>
                        <Td align="right" mono>{currency(coin.price)}</Td>
                        <Td><Pill value={coin.status} /></Td>
                        <Td>
                          <div className="text-xs text-muted-foreground">
                            Deposit {coin.depositEnabled ? "On" : "Off"} / Withdrawal {coin.withdrawalEnabled ? "On" : "Off"}
                          </div>
                        </Td>
                        <Td align="right">
                          <Button size="sm" variant="outline" onClick={() => deleteCoinMutation.mutate({ id: coin.id })} className="border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground" data-testid={`btn-delete-coin-${coin.symbol}`}>
                            <Trash2 size={14} />
                          </Button>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </DataPanel>
            </>
          )}

          {section === "pairs" && (
            <>
              <div className="bg-card border border-border rounded-xl p-5">
                <h2 className="font-semibold text-lg mb-4">Create trading pair</h2>
                <div className="grid md:grid-cols-5 gap-3">
                  <Input value={pairForm.base} onChange={(event) => setPairForm({ ...pairForm, base: event.target.value })} placeholder="Base coin" />
                  <Input value={pairForm.quote} onChange={(event) => setPairForm({ ...pairForm, quote: event.target.value })} placeholder="Quote coin" />
                  <Input value={pairForm.minOrder} onChange={(event) => setPairForm({ ...pairForm, minOrder: event.target.value })} placeholder="Min order" type="number" />
                  <Input value={pairForm.maxLeverage} onChange={(event) => setPairForm({ ...pairForm, maxLeverage: event.target.value })} placeholder="Leverage" type="number" />
                  <Button onClick={createPair} disabled={createPairMutation.isPending} className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2" data-testid="btn-create-pair">
                    {createPairMutation.isPending ? <Loader2 className="animate-spin" size={15} /> : <Plus size={15} />} Add Pair
                  </Button>
                </div>
              </div>

              <DataPanel title="Pair list">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-secondary/40">
                      <Th>Pair</Th>
                      <Th align="right">Min Order</Th>
                      <Th align="right">Max Leverage</Th>
                      <Th>Status</Th>
                      <Th align="right">Action</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPairs.map((pair) => (
                      <tr key={pair.id} className="border-b border-border/50 hover:bg-secondary/20">
                        <Td><span className="font-mono font-semibold">{pair.base}/{pair.quote}</span></Td>
                        <Td align="right" mono>{currency(pair.minOrder)}</Td>
                        <Td align="right" mono>{pair.maxLeverage}x</Td>
                        <Td><Pill value={pair.status} /></Td>
                        <Td align="right">
                          <Button size="sm" variant="outline" onClick={() => deletePairMutation.mutate({ id: pair.id })} className="border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground" data-testid={`btn-delete-pair-${pair.base}-${pair.quote}`}>
                            <Trash2 size={14} />
                          </Button>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </DataPanel>
            </>
          )}

          {section === "users" && (
            <>
              <div className="bg-card border border-border rounded-xl p-5">
                <h2 className="font-semibold text-lg mb-4">Create user</h2>
                <div className="grid md:grid-cols-4 gap-3">
                  <Input value={userForm.name} onChange={(event) => setUserForm({ ...userForm, name: event.target.value })} placeholder="Full name" />
                  <Input value={userForm.email} onChange={(event) => setUserForm({ ...userForm, email: event.target.value })} placeholder="Email" type="email" />
                  <select
                    value={userForm.role}
                    onChange={(event) => setUserForm({ ...userForm, role: event.target.value as AdminUser["role"] })}
                    className="h-9 rounded-md border border-border bg-card px-3 text-sm text-foreground"
                  >
                    <option>User</option>
                    <option>Trader</option>
                    <option>Admin</option>
                  </select>
                  <Button onClick={createUser} disabled={createUserMutation.isPending} className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2" data-testid="btn-create-user">
                    {createUserMutation.isPending ? <Loader2 className="animate-spin" size={15} /> : <Plus size={15} />} Add User
                  </Button>
                </div>
              </div>

              <DataPanel title="User management">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-secondary/40">
                      <Th>User</Th>
                      <Th>Role</Th>
                      <Th>KYC</Th>
                      <Th>Status</Th>
                      <Th align="right">Balance</Th>
                      <Th align="right">Action</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="border-b border-border/50 hover:bg-secondary/20">
                        <Td>
                          <div className="font-semibold">{user.name}</div>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                        </Td>
                        <Td>{user.role}</Td>
                        <Td><Pill value={user.kyc} /></Td>
                        <Td><Pill value={user.status} /></Td>
                        <Td align="right" mono>{currency(user.balance)}</Td>
                        <Td align="right">
                          <Button size="sm" variant="outline" onClick={() => deleteUserMutation.mutate({ id: user.id })} className="border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground" data-testid={`btn-delete-user-${user.id}`}>
                            <Trash2 size={14} />
                          </Button>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </DataPanel>
            </>
          )}

          {section === "fees" && (
            <DataPanel title="Fee admin setup">
              <div className="grid gap-4">
                {fees.map((fee) => {
                  const draft = feeDrafts[fee.id] ?? fee;
                  return (
                    <div key={fee.id} className="grid lg:grid-cols-[1fr_repeat(4,140px)] gap-3 p-4 rounded-lg border border-border bg-secondary/20">
                      <div>
                        <div className="font-semibold">{fee.name}</div>
                        <div className="text-xs text-muted-foreground">Live tier configuration</div>
                      </div>
                      <FeeInput label="Maker %" value={draft.makerFee} onChange={(value) => updateFeeDraft(fee.id, "makerFee", value)} />
                      <FeeInput label="Taker %" value={draft.takerFee} onChange={(value) => updateFeeDraft(fee.id, "takerFee", value)} />
                      <FeeInput label="Withdraw" value={draft.withdrawalFee} onChange={(value) => updateFeeDraft(fee.id, "withdrawalFee", value)} />
                      <FeeInput label="Min Volume" value={draft.minVolume} onChange={(value) => updateFeeDraft(fee.id, "minVolume", value)} />
                    </div>
                  );
                })}
              </div>
              <div className="mt-5 flex justify-end">
                <Button onClick={saveFees} disabled={updateFeeMutation.isPending} className="bg-primary text-primary-foreground hover:bg-primary/90" data-testid="btn-save-fees">
                  {updateFeeMutation.isPending ? "Saving..." : "Save Fee Setup"}
                </Button>
              </div>
            </DataPanel>
          )}
        </main>
      </div>
    </div>
  );
}

function DataPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <h2 className="font-semibold text-lg">{title}</h2>
        <span className="text-xs text-muted-foreground">Live DB records</span>
      </div>
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}

function Pill({ value }: { value: string }) {
  return <span className={`inline-flex px-2 py-1 rounded-full border text-xs font-medium ${statusClass(value)}`}>{value}</span>;
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return <th className={`px-4 py-3 text-xs font-medium text-muted-foreground ${align === "right" ? "text-right" : "text-left"}`}>{children}</th>;
}

function Td({ children, align = "left", mono = false }: { children: React.ReactNode; align?: "left" | "right"; mono?: boolean }) {
  return <td className={`px-4 py-3 text-sm ${align === "right" ? "text-right" : "text-left"} ${mono ? "font-mono" : ""}`}>{children}</td>;
}

function FeeInput({ label, value, onChange }: { label: string; value: number; onChange: (value: string) => void }) {
  return (
    <label className="space-y-1">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <Input value={String(value)} onChange={(event) => onChange(event.target.value)} type="number" className="bg-background border-border font-mono" />
    </label>
  );
}
