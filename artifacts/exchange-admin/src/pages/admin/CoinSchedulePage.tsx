import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Clock, Calendar, Edit, Trash2, Coins } from "lucide-react";

interface CoinSchedule {
  id: number;
  coinSymbol: string;
  listingAt: string | null;
  tradingStartAt: string | null;
  depositStartAt: string | null;
  withdrawStartAt: string | null;
  buyEnabledAt: string | null;
  sellEnabledAt: string | null;
  tradeEnabled: boolean;
  depositEnabled: boolean;
  withdrawEnabled: boolean;
  notes: string;
  createdAt: string;
}

const fmt = (v: string | null) => v ? new Date(v).toLocaleString() : "—";
const toInput = (v: string | null) => v ? new Date(v).toISOString().slice(0, 16) : "";

export default function CoinSchedulePage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CoinSchedule | null>(null);
  const [form, setForm] = useState({
    coinSymbol: "", listingAt: "", tradingStartAt: "", depositStartAt: "",
    withdrawStartAt: "", buyEnabledAt: "", sellEnabledAt: "",
    tradeEnabled: false, depositEnabled: false, withdrawEnabled: false, notes: "",
  });

  const { data = [], isLoading } = useQuery<CoinSchedule[]>({
    queryKey: ["coin-schedule"],
    queryFn: () => api.get("/admin/coin-schedule").then(r => r.data),
  });

  const save = useMutation({
    mutationFn: (d: typeof form) => {
      const payload = {
        ...d,
        listingAt: d.listingAt || undefined,
        tradingStartAt: d.tradingStartAt || undefined,
        depositStartAt: d.depositStartAt || undefined,
        withdrawStartAt: d.withdrawStartAt || undefined,
        buyEnabledAt: d.buyEnabledAt || undefined,
        sellEnabledAt: d.sellEnabledAt || undefined,
      };
      return editing
        ? api.patch(`/admin/coin-schedule/${editing.id}`, payload)
        : api.post("/admin/coin-schedule", payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coin-schedule"] });
      toast({ title: editing ? "Schedule updated" : "Schedule created" });
      setOpen(false);
      resetForm();
    },
    onError: (e: unknown) => toast({ title: "Error", description: (e as { response?: { data?: { error?: string } } }).response?.data?.error ?? "Failed", variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/coin-schedule/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["coin-schedule"] }); toast({ title: "Deleted" }); },
  });

  const resetForm = () => {
    setEditing(null);
    setForm({ coinSymbol: "", listingAt: "", tradingStartAt: "", depositStartAt: "", withdrawStartAt: "", buyEnabledAt: "", sellEnabledAt: "", tradeEnabled: false, depositEnabled: false, withdrawEnabled: false, notes: "" });
  };

  const openEdit = (row: CoinSchedule) => {
    setEditing(row);
    setForm({
      coinSymbol: row.coinSymbol,
      listingAt: toInput(row.listingAt),
      tradingStartAt: toInput(row.tradingStartAt),
      depositStartAt: toInput(row.depositStartAt),
      withdrawStartAt: toInput(row.withdrawStartAt),
      buyEnabledAt: toInput(row.buyEnabledAt),
      sellEnabledAt: toInput(row.sellEnabledAt),
      tradeEnabled: row.tradeEnabled,
      depositEnabled: row.depositEnabled,
      withdrawEnabled: row.withdrawEnabled,
      notes: row.notes,
    });
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Coin Listing Schedule</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage coin listing times, trading start, deposit/withdraw windows</p>
        </div>
        <Button onClick={() => { resetForm(); setOpen(true); }} className="gap-2"><Plus size={16} /> Add Schedule</Button>
      </div>

      {isLoading ? (
        <div className="text-center py-20 text-muted-foreground">Loading...</div>
      ) : data.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Coins className="mx-auto mb-3 opacity-40" size={40} />
          <p>No coin schedules yet. Add one to control listing timelines.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {data.map(row => (
            <div key={row.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">{row.coinSymbol.slice(0, 2)}</div>
                  <div>
                    <div className="font-semibold text-lg">{row.coinSymbol}</div>
                    {row.notes && <div className="text-xs text-muted-foreground">{row.notes}</div>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={row.tradeEnabled ? "default" : "secondary"}>{row.tradeEnabled ? "Trade ON" : "Trade OFF"}</Badge>
                  <Badge variant={row.depositEnabled ? "default" : "secondary"}>{row.depositEnabled ? "Deposit ON" : "Deposit OFF"}</Badge>
                  <Badge variant={row.withdrawEnabled ? "default" : "secondary"}>{row.withdrawEnabled ? "Withdraw ON" : "Withdraw OFF"}</Badge>
                  <Button size="sm" variant="outline" onClick={() => openEdit(row)}><Edit size={14} /></Button>
                  <Button size="sm" variant="destructive" onClick={() => del.mutate(row.id)}><Trash2 size={14} /></Button>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { label: "Listing Time", value: fmt(row.listingAt), icon: Calendar },
                  { label: "Trading Starts", value: fmt(row.tradingStartAt), icon: Clock },
                  { label: "Deposit Starts", value: fmt(row.depositStartAt), icon: Clock },
                  { label: "Withdraw Starts", value: fmt(row.withdrawStartAt), icon: Clock },
                  { label: "Buy Enabled", value: fmt(row.buyEnabledAt), icon: Clock },
                  { label: "Sell Enabled", value: fmt(row.sellEnabledAt), icon: Clock },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="rounded-lg bg-secondary/40 p-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1"><Icon size={11} />{label}</div>
                    <div className="text-sm font-medium">{value}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={v => { if (!v) resetForm(); setOpen(v); }}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Schedule" : "New Coin Schedule"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            {!editing && (
              <div className="space-y-1.5">
                <Label>Coin Symbol *</Label>
                <Input placeholder="BTC" value={form.coinSymbol} onChange={e => setForm(p => ({ ...p, coinSymbol: e.target.value.toUpperCase() }))} />
              </div>
            )}
            {[
              { key: "listingAt", label: "Listing Time" },
              { key: "tradingStartAt", label: "Trading Start Time" },
              { key: "depositStartAt", label: "Deposit Start Time" },
              { key: "withdrawStartAt", label: "Withdraw Start Time" },
              { key: "buyEnabledAt", label: "Buy Enabled At" },
              { key: "sellEnabledAt", label: "Sell Enabled At" },
            ].map(({ key, label }) => (
              <div key={key} className="space-y-1.5">
                <Label>{label}</Label>
                <Input type="datetime-local" value={(form as Record<string, string>)[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} />
              </div>
            ))}
            <div className="grid grid-cols-3 gap-4 py-2">
              {[
                { key: "tradeEnabled", label: "Trade Enabled" },
                { key: "depositEnabled", label: "Deposit Enabled" },
                { key: "withdrawEnabled", label: "Withdraw Enabled" },
              ].map(({ key, label }) => (
                <div key={key} className="flex flex-col items-center gap-2 rounded-lg border border-border p-3">
                  <Label className="text-xs">{label}</Label>
                  <Switch checked={(form as Record<string, boolean>)[key]} onCheckedChange={v => setForm(p => ({ ...p, [key]: v }))} />
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input placeholder="Optional notes..." value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpen(false); resetForm(); }}>Cancel</Button>
            <Button onClick={() => save.mutate(form)} disabled={save.isPending}>{save.isPending ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
