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
import { Plus, Brain, Trash2, Edit, Star, Eye, EyeOff } from "lucide-react";

interface AiIntegration {
  id: number;
  provider: string;
  displayName: string;
  model: string;
  baseUrl: string;
  enabled: boolean;
  isDefault: boolean;
  hasApiKey: boolean;
  createdAt: string;
}

const PROVIDERS = [
  { id: "gemini", name: "Google Gemini", models: ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash"], baseUrl: "" },
  { id: "openai", name: "OpenAI ChatGPT", models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"], baseUrl: "https://api.openai.com/v1" },
  { id: "anthropic", name: "Anthropic Claude", models: ["claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022", "claude-3-opus-20240229"], baseUrl: "https://api.anthropic.com/v1" },
  { id: "custom", name: "Custom / OpenAI-Compatible", models: [], baseUrl: "" },
];

export default function AiIntegrationsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AiIntegration | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [form, setForm] = useState({ provider: "gemini", displayName: "Google Gemini", apiKey: "", baseUrl: "", model: "gemini-1.5-flash", enabled: true, isDefault: false });

  const { data = [], isLoading } = useQuery<AiIntegration[]>({
    queryKey: ["ai-integrations"],
    queryFn: () => api.get("/admin/ai-integrations").then(r => r.data),
  });

  const save = useMutation({
    mutationFn: (d: typeof form) => editing
      ? api.patch(`/admin/ai-integrations/${editing.id}`, d)
      : api.post("/admin/ai-integrations", d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-integrations"] });
      toast({ title: editing ? "Integration updated" : "AI integration added" });
      setOpen(false);
      resetForm();
    },
    onError: (e: unknown) => toast({ title: "Error", description: (e as { response?: { data?: { error?: string } } }).response?.data?.error ?? "Failed", variant: "destructive" }),
  });

  const toggle = useMutation({
    mutationFn: (i: AiIntegration) => api.patch(`/admin/ai-integrations/${i.id}`, { enabled: !i.enabled }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai-integrations"] }),
  });

  const setDefault = useMutation({
    mutationFn: (i: AiIntegration) => api.patch(`/admin/ai-integrations/${i.id}`, { isDefault: true }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ai-integrations"] }); toast({ title: "Default AI provider updated" }); },
  });

  const del = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/ai-integrations/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ai-integrations"] }); toast({ title: "Integration removed" }); },
  });

  const resetForm = () => {
    setEditing(null);
    setForm({ provider: "gemini", displayName: "Google Gemini", apiKey: "", baseUrl: "", model: "gemini-1.5-flash", enabled: true, isDefault: false });
  };

  const selectProvider = (pid: string) => {
    const p = PROVIDERS.find(x => x.id === pid);
    if (!p) return;
    setForm(f => ({ ...f, provider: pid, displayName: p.name, baseUrl: p.baseUrl, model: p.models[0] ?? "" }));
  };

  const providerModels = PROVIDERS.find(p => p.id === form.provider)?.models ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">AI Integrations</h1>
          <p className="text-sm text-muted-foreground mt-1">Connect AI providers (Gemini, ChatGPT, Claude, custom) to power the AI Code Tool</p>
        </div>
        <Button onClick={() => { resetForm(); setOpen(true); }} className="gap-2"><Plus size={16} /> Add Provider</Button>
      </div>

      {isLoading ? (
        <div className="text-center py-20 text-muted-foreground">Loading...</div>
      ) : data.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Brain className="mx-auto mb-3 opacity-40" size={40} />
          <p className="mb-4">No AI providers configured yet.</p>
          <p className="text-xs max-w-sm mx-auto">Add your Gemini, OpenAI, or Claude API key to enable the AI Code Tool for code generation, design changes, and table management.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {data.map(i => (
            <div key={i.id} className={`rounded-xl border p-5 transition ${i.isDefault ? "border-primary bg-primary/5" : "border-border bg-card"}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center"><Brain size={18} className="text-primary" /></div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{i.displayName}</span>
                      {i.isDefault && <Badge className="text-xs gap-1"><Star size={10} />Default</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">{i.provider} · {i.model}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={i.hasApiKey ? "default" : "destructive"} className="text-xs">{i.hasApiKey ? "Key Set" : "No Key"}</Badge>
                  <Badge variant={i.enabled ? "default" : "secondary"} className="text-xs">{i.enabled ? "Active" : "Disabled"}</Badge>
                  <Switch checked={i.enabled} onCheckedChange={() => toggle.mutate(i)} />
                  {!i.isDefault && i.enabled && (
                    <Button size="sm" variant="outline" onClick={() => setDefault.mutate(i)} className="gap-1 text-xs"><Star size={12} />Set Default</Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => {
                    setEditing(i);
                    setForm({ provider: i.provider, displayName: i.displayName, apiKey: "", baseUrl: i.baseUrl, model: i.model, enabled: i.enabled, isDefault: i.isDefault });
                    setOpen(true);
                  }}><Edit size={14} /></Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => del.mutate(i.id)}><Trash2 size={14} /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={v => { if (!v) resetForm(); setOpen(v); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit AI Integration" : "Add AI Provider"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            {!editing && (
              <div className="space-y-2">
                <Label>Provider</Label>
                <div className="grid grid-cols-2 gap-2">
                  {PROVIDERS.map(p => (
                    <button key={p.id} onClick={() => selectProvider(p.id)}
                      className={`rounded-lg border px-3 py-2.5 text-sm text-left transition ${form.provider === p.id ? "border-primary bg-primary/10" : "border-border hover:bg-secondary/40"}`}>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.id === "custom" ? "OpenAI-compatible API" : p.id}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Display Name</Label>
              <Input value={form.displayName} onChange={e => setForm(p => ({ ...p, displayName: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>API Key {!editing && "*"}</Label>
              <div className="relative">
                <Input type={showKey ? "text" : "password"} placeholder={editing ? "Leave blank to keep current key" : "Enter your API key..."} value={form.apiKey} onChange={e => setForm(p => ({ ...p, apiKey: e.target.value }))} className="pr-10" />
                <button type="button" onClick={() => setShowKey(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            {(form.provider === "custom" || form.provider === "openai") && (
              <div className="space-y-1.5">
                <Label>Base URL</Label>
                <Input placeholder="https://api.openai.com/v1" value={form.baseUrl} onChange={e => setForm(p => ({ ...p, baseUrl: e.target.value }))} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Model</Label>
              {providerModels.length > 0 ? (
                <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.model} onChange={e => setForm(p => ({ ...p, model: e.target.value }))}>
                  {providerModels.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              ) : (
                <Input placeholder="model-name" value={form.model} onChange={e => setForm(p => ({ ...p, model: e.target.value }))} />
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2"><Switch checked={form.enabled} onCheckedChange={v => setForm(p => ({ ...p, enabled: v }))} /><Label>Enabled</Label></div>
              <div className="flex items-center gap-2"><Switch checked={form.isDefault} onCheckedChange={v => setForm(p => ({ ...p, isDefault: v }))} /><Label>Set as Default</Label></div>
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
