import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Brain, Code, Send, CheckCircle, Clock, Sparkles, Database, Layout, Trash2, FolderPlus, Plus } from "lucide-react";

interface AiLog {
  id: number;
  prompt: string;
  provider: string;
  action: string;
  targetPath: string;
  generatedCode: string;
  status: string;
  appliedAt: string | null;
  createdAt: string;
}

interface AiIntegration {
  id: number;
  provider: string;
  displayName: string;
  model: string;
  enabled: boolean;
  isDefault: boolean;
  hasApiKey: boolean;
}

const ACTION_TYPES = [
  { id: "generate", label: "Generate Feature", icon: Sparkles, desc: "Generate new component, route, or service code" },
  { id: "modify", label: "Modify Code", icon: Code, desc: "Update existing file or component" },
  { id: "design", label: "Change Design", icon: Layout, desc: "Update UI styling, layout, or Tailwind classes" },
  { id: "add-table", label: "Add DB Table", icon: Database, desc: "Generate new database table schema" },
  { id: "add-row", label: "Add DB Row", icon: Plus, desc: "Generate SQL to insert data into a table" },
  { id: "delete-file", label: "Remove Feature", icon: Trash2, desc: "Generate deletion plan for a file or feature" },
];

const QUICK_PROMPTS = [
  "Create a React page component for a referral program dashboard showing referral stats and rewards table",
  "Generate a new DB table schema for storing user notifications with read/unread status",
  "Create an Express route for getting user trading statistics (total trades, PnL, volume)",
  "Update the admin dashboard to show a chart of daily trading volume using Recharts",
  "Generate a new service for sending push notifications to mobile users",
  "Create a Tailwind-styled card component showing coin price with 24h change percentage",
  "Add a SQL migration to add an `is_verified` boolean column to the users table",
  "Generate a new admin page for managing promotional banners with CRUD operations",
];

export default function AiToolPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [prompt, setPrompt] = useState("");
  const [action, setAction] = useState("generate");
  const [targetPath, setTargetPath] = useState("");
  const [result, setResult] = useState<{ code?: string; description?: string; filename?: string; type?: string } | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const { data: providers = [] } = useQuery<AiIntegration[]>({
    queryKey: ["ai-integrations"],
    queryFn: () => api.get("/admin/ai-integrations").then(r => r.data),
  });

  const { data: logs = [] } = useQuery<AiLog[]>({
    queryKey: ["ai-tool-logs"],
    queryFn: () => api.get("/admin/ai-tool/logs").then(r => r.data),
  });

  const generate = useMutation({
    mutationFn: () => api.post("/admin/ai-tool/generate", { prompt, action, targetPath: targetPath || undefined }),
    onSuccess: (r) => {
      setResult(r.data);
      setShowPreview(true);
      qc.invalidateQueries({ queryKey: ["ai-tool-logs"] });
      toast({ title: "Code generated successfully!" });
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { error?: string } } }).response?.data?.error ?? "Generation failed";
      toast({ title: "Generation failed", description: msg, variant: "destructive" });
    },
  });

  const apply = useMutation({
    mutationFn: (logId: number) => api.post(`/admin/ai-tool/apply/${logId}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ai-tool-logs"] }); toast({ title: "Code applied successfully" }); },
  });

  const defaultProvider = providers.find(p => p.isDefault && p.enabled) ?? providers.find(p => p.enabled);
  const hasProvider = providers.some(p => p.enabled && p.hasApiKey);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Brain size={24} className="text-primary" /> AI Code Tool</h1>
        <p className="text-sm text-muted-foreground mt-1">Generate, modify, and manage code using AI — connected to your configured AI providers</p>
      </div>

      {!hasProvider && (
        <div className="rounded-xl border border-yellow-500/40 bg-yellow-500/10 p-5">
          <div className="flex items-start gap-3">
            <Brain className="text-yellow-500 mt-0.5" size={18} />
            <div>
              <div className="font-semibold text-yellow-500 mb-1">No AI Provider Configured</div>
              <p className="text-sm text-muted-foreground">Go to <strong>AI Integrations</strong> in the sidebar to add your Gemini, ChatGPT, or Claude API key before using this tool.</p>
            </div>
          </div>
        </div>
      )}

      {defaultProvider && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles size={14} className="text-primary" />
          Using: <Badge variant="outline" className="text-xs">{defaultProvider.displayName} · {defaultProvider.model}</Badge>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-semibold mb-3 block">Action Type</Label>
            <div className="grid grid-cols-2 gap-2">
              {ACTION_TYPES.map(a => (
                <button key={a.id} onClick={() => setAction(a.id)}
                  className={`rounded-lg border p-3 text-left transition text-sm ${action === a.id ? "border-primary bg-primary/10" : "border-border hover:bg-secondary/40"}`}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <a.icon size={13} className={action === a.id ? "text-primary" : "text-muted-foreground"} />
                    <span className="font-medium">{a.label}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{a.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Target File Path (optional)</Label>
            <input className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="e.g. src/pages/ReferralPage.tsx" value={targetPath} onChange={e => setTargetPath(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Describe what you want</Label>
            <textarea
              className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              rows={6}
              placeholder="e.g. Create a new React page for a referral program dashboard that shows how many users each person has referred, their total earned rewards, and a table with referral history..."
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
            />
            <div className="text-xs text-muted-foreground text-right">{prompt.length} chars</div>
          </div>

          <Button onClick={() => generate.mutate()} disabled={generate.isPending || !prompt.trim() || !hasProvider} className="w-full gap-2">
            <Send size={15} />{generate.isPending ? "Generating..." : "Generate Code"}
          </Button>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Quick Prompts</Label>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {QUICK_PROMPTS.map((q, i) => (
                <button key={i} onClick={() => setPrompt(q)}
                  className="w-full text-left rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground hover:bg-secondary/40 hover:text-foreground transition">
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {showPreview && result ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="font-semibold">Generated Output</Label>
                <div className="flex items-center gap-2">
                  {result.type && <Badge variant="outline" className="text-xs">{result.type}</Badge>}
                  {result.filename && <Badge variant="secondary" className="text-xs font-mono">{result.filename}</Badge>}
                </div>
              </div>
              {result.description && (
                <div className="rounded-lg border border-border bg-secondary/30 px-4 py-2.5 text-sm text-muted-foreground">{result.description}</div>
              )}
              <div className="relative">
                <pre className="rounded-xl border border-border bg-secondary/50 p-4 text-xs overflow-auto max-h-[480px] font-mono leading-relaxed whitespace-pre-wrap">
                  {result.code ?? "No code generated"}
                </pre>
                <div className="absolute top-3 right-3 flex gap-2">
                  <button onClick={() => { navigator.clipboard.writeText(result.code ?? ""); toast({ title: "Copied" }); }}
                    className="rounded-md bg-secondary px-2 py-1 text-xs border border-border hover:bg-secondary/80">Copy</button>
                </div>
              </div>
              <Button variant="outline" onClick={() => setShowPreview(false)} className="w-full">Close Preview</Button>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border h-64 flex flex-col items-center justify-center text-muted-foreground gap-2">
              <Code size={32} className="opacity-30" />
              <p className="text-sm">Generated code will appear here</p>
            </div>
          )}

          <div>
            <Label className="font-semibold mb-3 block">Generation History</Label>
            {logs.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-6">No generations yet</div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {logs.map(log => (
                  <div key={log.id} className="rounded-lg border border-border p-3">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="text-xs font-medium line-clamp-1">{log.prompt}</div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge variant="outline" className="text-xs">{log.action}</Badge>
                        <Badge variant={log.status === "Applied" ? "default" : "secondary"} className="text-xs gap-1">
                          {log.status === "Applied" ? <CheckCircle size={9} /> : <Clock size={9} />}
                          {log.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">{log.provider} · {new Date(log.createdAt).toLocaleString()}</div>
                      <div className="flex gap-1">
                        <button onClick={() => { setResult({ code: log.generatedCode, filename: log.targetPath }); setShowPreview(true); }}
                          className="text-xs text-primary hover:underline">View</button>
                        {log.status !== "Applied" && (
                          <button onClick={() => apply.mutate(log.id)} className="text-xs text-green-500 hover:underline ml-2">Mark Applied</button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
