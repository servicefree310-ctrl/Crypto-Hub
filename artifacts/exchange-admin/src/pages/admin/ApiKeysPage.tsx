import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Key, Trash2, Copy, Eye, EyeOff, Smartphone, Globe, Server } from "lucide-react";

interface ApiKey {
  id: number;
  name: string;
  keyPrefix: string;
  platform: string;
  scopes: string[];
  status: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  key?: string;
}

const PLATFORMS = ["mobile", "web", "server", "custom"];
const ALL_SCOPES = ["read:market", "read:user", "trade:spot", "trade:futures", "wallet:read", "wallet:withdraw", "admin:read"];

const platformIcon = (p: string) => {
  if (p === "mobile") return <Smartphone size={14} />;
  if (p === "web") return <Globe size={14} />;
  return <Server size={14} />;
};

export default function ApiKeysPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [form, setForm] = useState({ name: "", platform: "mobile", scopes: [] as string[], expiresAt: "" });

  const { data = [], isLoading } = useQuery<ApiKey[]>({
    queryKey: ["api-keys"],
    queryFn: () => api.get("/admin/api-keys").then(r => r.data),
  });

  const create = useMutation({
    mutationFn: (d: typeof form) => api.post("/admin/api-keys", { ...d, expiresAt: d.expiresAt || undefined }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["api-keys"] });
      setNewKey(r.data.key);
      setOpen(false);
      setForm({ name: "", platform: "mobile", scopes: [], expiresAt: "" });
      toast({ title: "API key created — save it now, it won't be shown again!" });
    },
    onError: (e: unknown) => toast({ title: "Error", description: (e as { response?: { data?: { error?: string } } }).response?.data?.error ?? "Failed", variant: "destructive" }),
  });

  const revoke = useMutation({
    mutationFn: (id: number) => api.patch(`/admin/api-keys/${id}`, { status: "Revoked" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["api-keys"] }); toast({ title: "Key revoked" }); },
  });

  const del = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/api-keys/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["api-keys"] }); toast({ title: "Key deleted" }); },
  });

  const toggleScope = (s: string) => {
    setForm(p => ({ ...p, scopes: p.scopes.includes(s) ? p.scopes.filter(x => x !== s) : [...p.scopes, s] }));
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast({ title: "Copied to clipboard" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">API Keys</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage API keys for mobile apps, web clients, and server integrations</p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2"><Plus size={16} /> Create Key</Button>
      </div>

      {newKey && (
        <div className="rounded-xl border border-yellow-500/50 bg-yellow-500/10 p-5">
          <div className="flex items-start gap-3">
            <Key className="text-yellow-500 mt-0.5" size={18} />
            <div className="flex-1">
              <div className="font-semibold text-yellow-500 mb-1">New API Key — Save it now!</div>
              <p className="text-xs text-muted-foreground mb-3">This key will never be shown again. Copy and store it securely.</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-lg bg-secondary px-3 py-2 text-xs font-mono">
                  {showKey ? newKey : `${newKey.slice(0, 20)}${"•".repeat(30)}`}
                </code>
                <Button size="sm" variant="ghost" onClick={() => setShowKey(v => !v)}>{showKey ? <EyeOff size={15} /> : <Eye size={15} />}</Button>
                <Button size="sm" variant="outline" onClick={() => copyKey(newKey)} className="gap-1"><Copy size={14} />Copy</Button>
              </div>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setNewKey(null)}>✕</Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        {["mobile", "web", "server"].map(p => (
          <div key={p} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-2">{platformIcon(p)} <span className="capitalize font-medium">{p}</span></div>
            <div className="text-2xl font-bold">{data.filter(k => k.platform === p).length}</div>
            <div className="text-xs text-muted-foreground">active keys</div>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center py-20 text-muted-foreground">Loading...</div>
      ) : data.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Key className="mx-auto mb-3 opacity-40" size={40} />
          <p>No API keys yet.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50">
              <tr>
                {["Name", "Key Prefix", "Platform", "Scopes", "Status", "Last Used", "Expires", ""].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.map(k => (
                <tr key={k.id} className="hover:bg-secondary/20">
                  <td className="px-4 py-3 font-medium">{k.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{k.keyPrefix}...</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">{platformIcon(k.platform)}<span className="capitalize">{k.platform}</span></div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(k.scopes || []).slice(0, 2).map(s => <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>)}
                      {(k.scopes || []).length > 2 && <Badge variant="secondary" className="text-xs">+{(k.scopes || []).length - 2}</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={k.status === "Active" ? "default" : k.status === "Revoked" ? "destructive" : "secondary"} className="text-xs">{k.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : "Never"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{k.expiresAt ? new Date(k.expiresAt).toLocaleDateString() : "Never"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {k.status === "Active" && <Button size="sm" variant="outline" className="text-yellow-500" onClick={() => revoke.mutate(k.id)}>Revoke</Button>}
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => del.mutate(k.id)}><Trash2 size={13} /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Create API Key</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Key Name *</Label>
              <Input placeholder="My Mobile App Key" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Platform</Label>
              <div className="grid grid-cols-4 gap-2">
                {PLATFORMS.map(p => (
                  <button key={p} onClick={() => setForm(pr => ({ ...pr, platform: p }))}
                    className={`rounded-lg border p-2.5 text-xs capitalize transition flex flex-col items-center gap-1 ${form.platform === p ? "border-primary bg-primary/10" : "border-border hover:bg-secondary/40"}`}>
                    {platformIcon(p)}{p}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Scopes</Label>
              <div className="grid grid-cols-2 gap-1.5">
                {ALL_SCOPES.map(s => (
                  <button key={s} onClick={() => toggleScope(s)}
                    className={`rounded-lg border px-3 py-1.5 text-xs text-left transition ${form.scopes.includes(s) ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-secondary/40"}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Expiry Date (optional)</Label>
              <Input type="date" value={form.expiresAt} onChange={e => setForm(p => ({ ...p, expiresAt: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => create.mutate(form)} disabled={create.isPending}>{create.isPending ? "Creating..." : "Create Key"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
