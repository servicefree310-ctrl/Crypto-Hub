import { useState } from "react";
import { Link } from "wouter";
import { Zap, Eye, EyeOff, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

function getPasswordStrength(p: string) {
  if (!p) return 0;
  let score = 0;
  if (p.length >= 8) score++;
  if (/[A-Z]/.test(p)) score++;
  if (/[0-9]/.test(p)) score++;
  if (/[^A-Za-z0-9]/.test(p)) score++;
  return score;
}

const strengthLabels = ["", "Weak", "Fair", "Good", "Strong"];
const strengthColors = ["", "#f6465d", "#fcd535", "#0ecb81", "#0ecb81"];

export default function Register() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const strength = getPasswordStrength(password);
  const passwordsMatch = password === confirm && confirm !== "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !username || !password || !confirm) {
      toast({ title: "Validation Error", description: "Please fill in all fields", variant: "destructive" });
      return;
    }
    if (!passwordsMatch) {
      toast({ title: "Passwords don't match", description: "Please ensure both passwords are identical", variant: "destructive" });
      return;
    }
    if (!agreed) {
      toast({ title: "Terms Required", description: "Please accept the terms and conditions", variant: "destructive" });
      return;
    }
    setLoading(true);
    await new Promise(r => setTimeout(r, 1500));
    setLoading(false);
    toast({ title: "Account Created!", description: "Welcome to CryptoX! Start trading now." });
  };

  return (
    <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-64px-200px)] bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 justify-center">
            <div className="bg-primary text-primary-foreground p-2 rounded-lg">
              <Zap size={22} fill="currentColor" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-foreground">CryptoX</span>
          </div>
          <h1 className="text-xl font-semibold text-foreground">Create your account</h1>
          <p className="text-sm text-muted-foreground">Join millions of traders worldwide</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 space-y-5 shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm text-muted-foreground">Email address</Label>
              <Input
                id="email"
                data-testid="input-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="bg-secondary border-border focus-visible:ring-primary h-10"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-sm text-muted-foreground">Username</Label>
              <Input
                id="username"
                data-testid="input-username"
                type="text"
                placeholder="Choose a username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="bg-secondary border-border focus-visible:ring-primary h-10"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm text-muted-foreground">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  data-testid="input-password"
                  type={showPass ? "text" : "password"}
                  placeholder="Create a strong password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="bg-secondary border-border focus-visible:ring-primary h-10 pr-10"
                />
                <button
                  type="button"
                  data-testid="btn-toggle-password"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Password Strength */}
              {password && (
                <div className="space-y-2">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map(i => (
                      <div
                        key={i}
                        className="flex-1 h-1 rounded-full transition-all duration-300"
                        style={{
                          backgroundColor: i <= strength ? strengthColors[strength] : "#2b2f36"
                        }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      {[
                        { label: "8+ characters", met: password.length >= 8 },
                        { label: "Uppercase letter", met: /[A-Z]/.test(password) },
                        { label: "Number", met: /[0-9]/.test(password) },
                        { label: "Special character", met: /[^A-Za-z0-9]/.test(password) },
                      ].map(rule => (
                        <div key={rule.label} className={`flex items-center gap-1.5 ${rule.met ? "text-success" : "text-muted-foreground"}`}>
                          <Check size={10} className={rule.met ? "opacity-100" : "opacity-30"} />
                          {rule.label}
                        </div>
                      ))}
                    </div>
                    <span style={{ color: strengthColors[strength] }} className="font-medium">
                      {strengthLabels[strength]}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm" className="text-sm text-muted-foreground">Confirm password</Label>
              <div className="relative">
                <Input
                  id="confirm"
                  data-testid="input-confirm-password"
                  type={showConfirm ? "text" : "password"}
                  placeholder="Re-enter your password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  className={`bg-secondary border-border h-10 pr-10 focus-visible:ring-primary ${confirm && !passwordsMatch ? "border-destructive focus-visible:ring-destructive" : ""} ${passwordsMatch ? "border-success/50" : ""}`}
                />
                <button
                  type="button"
                  data-testid="btn-toggle-confirm"
                  onClick={() => setShowConfirm(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {confirm && !passwordsMatch && (
                <p className="text-xs text-destructive">Passwords do not match</p>
              )}
              {passwordsMatch && (
                <p className="text-xs text-success flex items-center gap-1"><Check size={10} /> Passwords match</p>
              )}
            </div>

            <div className="flex items-start gap-2">
              <Checkbox
                id="terms"
                data-testid="checkbox-terms"
                checked={agreed}
                onCheckedChange={v => setAgreed(!!v)}
                className="mt-0.5"
              />
              <label htmlFor="terms" className="text-xs text-muted-foreground cursor-pointer select-none leading-relaxed">
                I agree to the{" "}
                <a href="#" className="text-primary hover:text-primary/80 transition-colors">Terms of Service</a>
                {" "}and{" "}
                <a href="#" className="text-primary hover:text-primary/80 transition-colors">Privacy Policy</a>
              </label>
            </div>

            <Button
              data-testid="btn-register"
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold h-11 text-sm"
            >
              {loading ? "Creating account..." : "Create Account"}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" data-testid="link-login" className="text-primary hover:text-primary/80 font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
