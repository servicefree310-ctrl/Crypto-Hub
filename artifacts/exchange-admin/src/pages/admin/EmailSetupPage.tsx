import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { Mail, CheckCircle, XCircle, Send, Eye, EyeOff } from "lucide-react";

interface SmtpSettings {
  id: number;
  host: string;
  port: number;
  username: string;
  password: string;
  fromEmail: string;
  fromName: string;
  encryption: string;
  enabled: boolean;
  lastTestedAt: string | null;
  lastTestStatus: string;
  updatedAt: string;
}

export default function EmailSetupPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showPass, setShowPass] = useState(false);
  const [testing, setTesting] = useState(false);
  const [form, setForm] = useState({
    host: "", port: 587, username: "", password: "",
    fromEmail: "", fromName: "CryptoX", encryption: "tls", enabled: false,
  });

  const { data } = useQuery<SmtpSettings | null>({
    queryKey: ["smtp-settings"],
    queryFn: () => api.get("/admin/smtp-settings").then(r => r.data),
  });

  useEffect(() => {
    if (data) {
      setForm({
        host: data.host,
        port: data.port,
        username: data.username,
        password: "",
        fromEmail: data.fromEmail,
        fromName: data.fromName,
        encryption: data.encryption,
        enabled: data.enabled,
      });
    }
  }, [data]);

  const save = useMutation({
    mutationFn: (d: typeof form) => api.post("/admin/smtp-settings", d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["smtp-settings"] });
      toast({ title: "SMTP settings saved" });
    },
    onError: (e: unknown) => toast({ title: "Error", description: (e as { response?: { data?: { error?: string } } }).response?.data?.error ?? "Failed", variant: "destructive" }),
  });

  const testSmtp = async () => {
    setTesting(true);
    try {
      const r = await api.post("/admin/smtp-settings/test");
      qc.invalidateQueries({ queryKey: ["smtp-settings"] });
      toast({ title: r.data.status === "success" ? "SMTP test passed" : "SMTP test failed", description: r.data.message, variant: r.data.status === "success" ? "default" : "destructive" });
    } catch {
      toast({ title: "Test failed", variant: "destructive" });
    } finally {
      setTesting(false);
    }
  };

  const ENCRYPTION_OPTIONS = [
    { value: "tls", label: "TLS (STARTTLS)", port: 587 },
    { value: "ssl", label: "SSL/TLS", port: 465 },
    { value: "none", label: "None (insecure)", port: 25 },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Email / SMTP Setup</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure SMTP server for transactional emails (verification, alerts, etc.)</p>
      </div>

      {data?.lastTestedAt && (
        <div className={`flex items-center gap-3 rounded-xl border p-4 ${data.lastTestStatus === "success" ? "border-green-500/30 bg-green-500/10" : "border-red-500/30 bg-red-500/10"}`}>
          {data.lastTestStatus === "success" ? <CheckCircle className="text-green-500" size={20} /> : <XCircle className="text-red-500" size={20} />}
          <div>
            <div className="font-medium text-sm">{data.lastTestStatus === "success" ? "SMTP connection verified" : "SMTP connection failed"}</div>
            <div className="text-xs text-muted-foreground">Last tested: {new Date(data.lastTestedAt).toLocaleString()}</div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-6 space-y-5">
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold flex items-center gap-2"><Mail size={16} /> SMTP Configuration</div>
          <div className="flex items-center gap-3">
            <Label className="text-sm">Enable Email Service</Label>
            <Switch checked={form.enabled} onCheckedChange={v => setForm(p => ({ ...p, enabled: v }))} />
            <Badge variant={form.enabled ? "default" : "secondary"}>{form.enabled ? "Active" : "Disabled"}</Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>SMTP Host *</Label>
            <Input placeholder="smtp.gmail.com" value={form.host} onChange={e => setForm(p => ({ ...p, host: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Port</Label>
            <Input type="number" value={form.port} onChange={e => setForm(p => ({ ...p, port: Number(e.target.value) }))} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Encryption</Label>
          <div className="grid grid-cols-3 gap-2">
            {ENCRYPTION_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => setForm(p => ({ ...p, encryption: opt.value, port: opt.port }))} className={`rounded-lg border p-3 text-sm text-left transition ${form.encryption === opt.value ? "border-primary bg-primary/10" : "border-border hover:bg-secondary/40"}`}>
                <div className="font-medium">{opt.label}</div>
                <div className="text-xs text-muted-foreground">Port {opt.port}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Username / Email</Label>
            <Input placeholder="noreply@yourexchange.com" value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Password / App Password</Label>
            <div className="relative">
              <Input type={showPass ? "text" : "password"} placeholder={data ? "Leave blank to keep current" : "••••••••"} value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} className="pr-10" />
              <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>From Email *</Label>
            <Input placeholder="noreply@yourexchange.com" value={form.fromEmail} onChange={e => setForm(p => ({ ...p, fromEmail: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>From Name</Label>
            <Input placeholder="CryptoX Exchange" value={form.fromName} onChange={e => setForm(p => ({ ...p, fromName: e.target.value }))} />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <Button variant="outline" onClick={testSmtp} disabled={testing} className="gap-2">
            <Send size={15} />{testing ? "Testing..." : "Test Connection"}
          </Button>
          <Button onClick={() => save.mutate(form)} disabled={save.isPending} className="gap-2">
            {save.isPending ? "Saving..." : "Save SMTP Settings"}
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="font-semibold mb-3 text-sm">Quick Setup Guides</div>
        <div className="grid gap-2">
          {[
            { name: "Gmail", host: "smtp.gmail.com", port: 587, enc: "tls", note: "Use App Password (not your regular password)" },
            { name: "SendGrid", host: "smtp.sendgrid.net", port: 587, enc: "tls", note: "Username: apikey, Password: your API key" },
            { name: "Mailgun", host: "smtp.mailgun.org", port: 587, enc: "tls", note: "Use SMTP credentials from Mailgun dashboard" },
            { name: "Amazon SES", host: "email-smtp.us-east-1.amazonaws.com", port: 587, enc: "tls", note: "Use IAM SMTP credentials" },
          ].map(g => (
            <button key={g.name} onClick={() => setForm(p => ({ ...p, host: g.host, port: g.port, encryption: g.enc }))}
              className="flex items-center justify-between rounded-lg border border-border px-4 py-2.5 text-sm hover:bg-secondary/40 transition text-left">
              <div>
                <span className="font-medium">{g.name}</span>
                <span className="text-muted-foreground ml-2 text-xs">{g.host}:{g.port}</span>
              </div>
              <div className="text-xs text-muted-foreground">{g.note}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
