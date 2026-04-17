import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { login } from "@/services/api";
import { saveSession } from "@/utils/auth";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@cryptox.local");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const session = await login(email, password);
      saveSession(session);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground grid lg:grid-cols-[1.1fr_0.9fr]">
      <section className="hidden lg:flex flex-col justify-between border-r border-border bg-[radial-gradient(ellipse_at_top,rgba(252,213,53,0.16),transparent_55%)] p-12">
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-primary text-sm">
          <ShieldCheck size={16} /> Admin-only exchange operations
        </div>
        <div>
          <h1 className="text-5xl font-bold tracking-tight">CryptoX Admin Panel</h1>
          <p className="mt-4 max-w-xl text-muted-foreground">Standalone Binance-like dashboard for users, KYC, deposits, withdrawals, markets, RBAC, settings and audit-ready exchange operations.</p>
        </div>
        <div className="grid grid-cols-3 gap-4 text-sm">
          {["RBAC", "JWT Session", "Live API"].map((item) => <div key={item} className="rounded-xl border border-border bg-card p-4 font-semibold">{item}</div>)}
        </div>
      </section>
      <section className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-2xl">
          <div className="mb-8">
            <div className="text-2xl font-bold">Admin Login</div>
            <p className="text-sm text-muted-foreground">Use admin credentials to access protected routes.</p>
          </div>
          <div className="space-y-4">
            <Input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="Email" />
            <Input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="Password" />
            {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
            <Button disabled={loading} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">{loading ? "Signing in..." : "Login"}</Button>
          </div>
          <div className="mt-5 text-xs text-muted-foreground">Demo: admin@cryptox.local / admin123</div>
        </form>
      </section>
    </div>
  );
}
