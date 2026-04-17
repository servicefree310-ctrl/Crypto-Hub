import { Link, useLocation } from "wouter";
import { Zap, LogOut, User, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useRef, useEffect } from "react";

export default function Navbar() {
  const [location] = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const navLinks = [
    { label: "Markets", path: "/" },
    { label: "Trade", path: "/trade" },
    { label: "Futures", path: "/futures" },
    { label: "Wallet", path: "/wallet" },
    { label: "Admin", path: "/admin" },
  ];

  const displayName = user ? (user.firstName ? user.firstName : user.email.split("@")[0]) : "";

  return (
    <nav className="h-16 bg-background border-b border-border flex items-center justify-between px-4 lg:px-6 shrink-0 sticky top-0 z-50">
      <div className="flex items-center gap-8">
        <Link href="/" className="flex items-center gap-2" data-testid="link-home">
          <div className="bg-primary text-primary-foreground p-1 rounded">
            <Zap size={20} fill="currentColor" />
          </div>
          <span className="text-xl font-bold tracking-tight text-foreground">CryptoX</span>
        </Link>
        
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link 
              key={link.label} 
              href={link.path}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors hover:bg-secondary ${
                location === link.path ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid={`nav-link-${link.label.toLowerCase()}`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {isAuthenticated ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(v => !v)}
              className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-secondary transition-colors text-sm"
              data-testid="btn-user-menu"
            >
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-xs">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <span className="hidden sm:inline text-foreground font-medium">{displayName}</span>
              <ChevronDown size={14} className="text-muted-foreground" />
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-card border border-border rounded-lg shadow-lg py-1 z-50">
                <div className="px-4 py-2 border-b border-border">
                  <div className="text-xs font-medium text-foreground truncate">{user?.email}</div>
                  <div className="text-xs text-muted-foreground capitalize mt-0.5">KYC: {user?.kycStatus}</div>
                </div>
                <Link
                  href="/wallet"
                  className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-secondary transition-colors"
                  onClick={() => setDropdownOpen(false)}
                >
                  <User size={14} />
                  My Wallet
                </Link>
                <button
                  onClick={() => { logout(); setDropdownOpen(false); }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-secondary transition-colors"
                  data-testid="btn-logout"
                >
                  <LogOut size={14} />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <Link href="/login" data-testid="link-login">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground font-medium">
                Log In
              </Button>
            </Link>
            <Link href="/register" data-testid="link-register">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium">
                Register
              </Button>
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
