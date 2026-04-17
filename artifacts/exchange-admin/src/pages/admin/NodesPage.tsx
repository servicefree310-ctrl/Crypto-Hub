import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Network, Trash2, Edit, RefreshCw, Wifi } from "lucide-react";

interface Node {
  id: number;
  network: string;
  chainId: string;
  rpcUrl: string;
  wsUrl: string;
  nodeType: string;
  provider: string;
  status: string;
  priority: number;
  latencyMs: number;
  lastCheckedAt: string | null;
  createdAt: string;
}

const NODE_TYPES = ["mainnet", "testnet", "custom"];

export default function NodesPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Node | null>(null);
  const [form, setForm] = useState({ network: "", chainId: "", rpcUrl: "", wsUrl: "", nodeType: "mainnet", provider: "custom", status: "Active", priority: 1 });
  const [checking, setChecking] = useState<number | null>(null);

  const { data = [], isLoading } = useQuery<Node[]>({
    queryKey: ["nodes"],
    queryFn: () => api.get("/admin/nodes").then(r => r.data),
  });

  const save = useMutation({
    mutationFn: (d: typeof form) => editing
      ? api.patch(`/admin/nodes/${editing.id}`, d)
      : api.post("/admin/nodes", d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["nodes"] });
      toast({ title: editing ? "Node updated" : "Node added" });
      setOpen(false);
      resetForm();
    },
    onError: (e: unknown) => toast({ title: "Error", description: (e as { response?: { data?: { error?: string } } }).response?.data?.error ?? "Failed", variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/nodes/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["nodes"] }); toast({ title: "Node removed" }); },
  });

  const checkNode = async (id: number) => {
    setChecking(id);
    try {
      const r = await api.post(`/admin/nodes/${id}/check`);
      qc.invalidateQueries({ queryKey: ["nodes"] });
      toast({ title: `Node checked`, description: `Latency: ${r.data.latencyMs}ms` });
    } catch {
      toast({ title: "Check failed", variant: "destructive" });
    } finally {
      setChecking(null);
    }
  };

  const resetForm = () => {
    setEditing(null);
    setForm({ network: "", chainId: "", rpcUrl: "", wsUrl: "", nodeType: "mainnet", provider: "custom", status: "Active", priority: 1 });
  };

  const openEdit = (n: Node) => {
    setEditing(n);
    setForm({ network: n.network, chainId: n.chainId, rpcUrl: n.rpcUrl, wsUrl: n.wsUrl, nodeType: n.nodeType, provider: n.provider, status: n.status, priority: n.priority });
    setOpen(true);
  };

  const latencyColor = (ms: number) => ms === 0 ? "text-muted-foreground" : ms < 100 ? "text-green-500" : ms < 500 ? "text-yellow-500" : "text-red-500";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Blockchain Nodes</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage RPC/WS endpoints for all supported networks</p>
        </div>
        <Button onClick={() => { resetForm(); setOpen(true); }} className="gap-2"><Plus size={16} /> Add Node</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Nodes", value: data.length },
          { label: "Active", value: data.filter(n => n.status === "Active").length },
          { label: "Networks", value: [...new Set(data.map(n => n.network))].length },
          { label: "Avg Latency", value: data.length ? `${Math.round(data.filter(n => n.latencyMs > 0).reduce((s, n) => s + n.latencyMs, 0) / Math.max(1, data.filter(n => n.latencyMs > 0).length))}ms` : "—" },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4">
            <div className="text-xs text-muted-foreground mb-1">{label}</div>
            <div className="text-2xl font-bold">{value}</div>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center py-20 text-muted-foreground">Loading...</div>
      ) : data.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Network className="mx-auto mb-3 opacity-40" size={40} />
          <p>No nodes added yet. Add your first blockchain node.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50">
              <tr>
                {["Network", "Chain ID", "RPC URL", "Type", "Provider", "Priority", "Latency", "Status", "Last Check", ""].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs text-muted-foreground font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.map(n => (
                <tr key={n.id} className="hover:bg-secondary/20">
                  <td className="px-4 py-3 font-semibold">{n.network}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{n.chainId || "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs max-w-[200px] truncate text-muted-foreground" title={n.rpcUrl}>{n.rpcUrl}</td>
                  <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{n.nodeType}</Badge></td>
                  <td className="px-4 py-3 text-muted-foreground">{n.provider}</td>
                  <td className="px-4 py-3 text-center font-medium">{n.priority}</td>
                  <td className={`px-4 py-3 font-medium ${latencyColor(n.latencyMs)}`}>{n.latencyMs > 0 ? `${n.latencyMs}ms` : "—"}</td>
                  <td className="px-4 py-3"><Badge variant={n.status === "Active" ? "default" : "secondary"} className="text-xs">{n.status}</Badge></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{n.lastCheckedAt ? new Date(n.lastCheckedAt).toLocaleTimeString() : "Never"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" onClick={() => checkNode(n.id)} disabled={checking === n.id}><RefreshCw size={13} className={checking === n.id ? "animate-spin" : ""} /></Button>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(n)}><Edit size={13} /></Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => del.mutate(n.id)}><Trash2 size={13} /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={v => { if (!v) resetForm(); setOpen(v); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit Node" : "Add Blockchain Node"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Network *</Label>
                <Input placeholder="Ethereum" value={form.network} onChange={e => setForm(p => ({ ...p, network: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Chain ID</Label>
                <Input placeholder="1" value={form.chainId} onChange={e => setForm(p => ({ ...p, chainId: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>RPC URL *</Label>
              <Input placeholder="https://mainnet.infura.io/v3/..." value={form.rpcUrl} onChange={e => setForm(p => ({ ...p, rpcUrl: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>WebSocket URL</Label>
              <Input placeholder="wss://mainnet.infura.io/ws/v3/..." value={form.wsUrl} onChange={e => setForm(p => ({ ...p, wsUrl: e.target.value }))} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.nodeType} onChange={e => setForm(p => ({ ...p, nodeType: e.target.value }))}>
                  {NODE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Provider</Label>
                <Input placeholder="Infura" value={form.provider} onChange={e => setForm(p => ({ ...p, provider: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Input type="number" min={1} value={form.priority} onChange={e => setForm(p => ({ ...p, priority: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                {["Active", "Disabled", "Maintenance"].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
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
