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
import { Plus, Server, Trash2, Edit, ShieldCheck } from "lucide-react";

interface Service {
  id: number;
  name: string;
  displayName: string;
  category: string;
  description: string;
  enabled: boolean;
  createdAt: string;
}

interface RoleServicePerm {
  id: number;
  roleName: string;
  serviceName: string;
  canRead: boolean;
  canWrite: boolean;
  canExecute: boolean;
}

const CATEGORIES = ["core", "trading", "payments", "kyc", "notifications", "admin", "api"];

export default function ServicesPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [permOpen, setPermOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState({ name: "", displayName: "", category: "core", description: "", enabled: true });
  const [permForm, setPermForm] = useState({ roleName: "", serviceName: "", canRead: true, canWrite: false, canExecute: false });

  const { data: services = [], isLoading } = useQuery<Service[]>({
    queryKey: ["services"],
    queryFn: () => api.get("/admin/services").then(r => r.data),
  });

  const { data: perms = [] } = useQuery<RoleServicePerm[]>({
    queryKey: ["role-service-permissions"],
    queryFn: () => api.get("/admin/role-service-permissions").then(r => r.data),
  });

  const save = useMutation({
    mutationFn: (d: typeof form) => editing
      ? api.patch(`/admin/services/${editing.id}`, d)
      : api.post("/admin/services", d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["services"] });
      toast({ title: editing ? "Service updated" : "Service registered" });
      setOpen(false);
      setEditing(null);
      setForm({ name: "", displayName: "", category: "core", description: "", enabled: true });
    },
    onError: (e: unknown) => toast({ title: "Error", description: (e as { response?: { data?: { error?: string } } }).response?.data?.error ?? "Failed", variant: "destructive" }),
  });

  const toggle = useMutation({
    mutationFn: (s: Service) => api.patch(`/admin/services/${s.id}`, { enabled: !s.enabled }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["services"] }),
  });

  const del = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/services/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["services"] }); toast({ title: "Deleted" }); },
  });

  const savePerm = useMutation({
    mutationFn: (d: typeof permForm) => api.post("/admin/role-service-permissions", d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["role-service-permissions"] });
      toast({ title: "Permission saved" });
      setPermOpen(false);
      setPermForm({ roleName: "", serviceName: "", canRead: true, canWrite: false, canExecute: false });
    },
    onError: (e: unknown) => toast({ title: "Error", description: (e as { response?: { data?: { error?: string } } }).response?.data?.error ?? "Failed", variant: "destructive" }),
  });

  const delPerm = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/role-service-permissions/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["role-service-permissions"] }),
  });

  const grouped = CATEGORIES.reduce<Record<string, Service[]>>((acc, cat) => {
    acc[cat] = services.filter(s => s.category === cat);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Service Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Enable or disable platform services and manage role-level access</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setPermOpen(true)} className="gap-2"><ShieldCheck size={16} /> Role Permissions</Button>
          <Button onClick={() => { setEditing(null); setOpen(true); }} className="gap-2"><Plus size={16} /> Add Service</Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-20 text-muted-foreground">Loading...</div>
      ) : (
        <div className="space-y-6">
          {CATEGORIES.filter(c => grouped[c]?.length > 0).map(cat => (
            <div key={cat}>
              <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">{cat}</div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {grouped[cat].map(s => (
                  <div key={s.id} className={`rounded-xl border p-4 transition ${s.enabled ? "border-border bg-card" : "border-border/40 bg-card/40 opacity-70"}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Server size={16} className="text-primary shrink-0" />
                        <div>
                          <div className="font-medium text-sm">{s.displayName}</div>
                          <div className="text-xs text-muted-foreground font-mono">{s.name}</div>
                        </div>
                      </div>
                      <Switch checked={s.enabled} onCheckedChange={() => toggle.mutate(s)} />
                    </div>
                    {s.description && <p className="text-xs text-muted-foreground mb-3">{s.description}</p>}
                    <div className="flex items-center justify-between">
                      <Badge variant={s.enabled ? "default" : "secondary"} className="text-xs">{s.enabled ? "Active" : "Disabled"}</Badge>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => { setEditing(s); setForm({ name: s.name, displayName: s.displayName, category: s.category, description: s.description, enabled: s.enabled }); setOpen(true); }}><Edit size={13} /></Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => del.mutate(s.id)}><Trash2 size={13} /></Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {services.length === 0 && (
            <div className="text-center py-20 text-muted-foreground">
              <Server className="mx-auto mb-3 opacity-40" size={40} />
              <p>No services registered yet.</p>
            </div>
          )}
        </div>
      )}

      {perms.length > 0 && (
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Role-Service Permissions</div>
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs text-muted-foreground">Role</th>
                  <th className="text-left px-4 py-2.5 text-xs text-muted-foreground">Service</th>
                  <th className="text-center px-4 py-2.5 text-xs text-muted-foreground">Read</th>
                  <th className="text-center px-4 py-2.5 text-xs text-muted-foreground">Write</th>
                  <th className="text-center px-4 py-2.5 text-xs text-muted-foreground">Execute</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {perms.map(p => (
                  <tr key={p.id} className="hover:bg-secondary/20">
                    <td className="px-4 py-2.5 font-medium">{p.roleName}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">{p.serviceName}</td>
                    <td className="px-4 py-2.5 text-center">{p.canRead ? <Badge className="text-xs">Yes</Badge> : <Badge variant="secondary" className="text-xs">No</Badge>}</td>
                    <td className="px-4 py-2.5 text-center">{p.canWrite ? <Badge className="text-xs">Yes</Badge> : <Badge variant="secondary" className="text-xs">No</Badge>}</td>
                    <td className="px-4 py-2.5 text-center">{p.canExecute ? <Badge className="text-xs">Yes</Badge> : <Badge variant="secondary" className="text-xs">No</Badge>}</td>
                    <td className="px-4 py-2.5 text-right"><Button size="sm" variant="ghost" className="text-destructive" onClick={() => delPerm.mutate(p.id)}><Trash2 size={13} /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit Service" : "Register Service"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            {!editing && (
              <div className="space-y-1.5">
                <Label>Service Name (unique key) *</Label>
                <Input placeholder="spot-trading" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Display Name *</Label>
              <Input placeholder="Spot Trading" value={form.displayName} onChange={e => setForm(p => ({ ...p, displayName: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input placeholder="Brief description..." value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.enabled} onCheckedChange={v => setForm(p => ({ ...p, enabled: v }))} />
              <Label>Enabled by default</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => save.mutate(form)} disabled={save.isPending}>{save.isPending ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={permOpen} onOpenChange={setPermOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Role-Service Permission</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Role Name</Label>
              <Input placeholder="moderator" value={permForm.roleName} onChange={e => setPermForm(p => ({ ...p, roleName: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Service Name</Label>
              <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={permForm.serviceName} onChange={e => setPermForm(p => ({ ...p, serviceName: e.target.value }))}>
                <option value="">Select service...</option>
                {services.map(s => <option key={s.id} value={s.name}>{s.displayName}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { key: "canRead", label: "Can Read" },
                { key: "canWrite", label: "Can Write" },
                { key: "canExecute", label: "Can Execute" },
              ].map(({ key, label }) => (
                <div key={key} className="flex flex-col items-center gap-2 rounded-lg border border-border p-3">
                  <Label className="text-xs">{label}</Label>
                  <Switch checked={(permForm as Record<string, boolean>)[key]} onCheckedChange={v => setPermForm(p => ({ ...p, [key]: v }))} />
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPermOpen(false)}>Cancel</Button>
            <Button onClick={() => savePerm.mutate(permForm)} disabled={savePerm.isPending}>{savePerm.isPending ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
