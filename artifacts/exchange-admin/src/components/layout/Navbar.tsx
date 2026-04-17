import { Link, useLocation } from "wouter";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Navbar() {
  const [location] = useLocation();

  const navLinks = [
    { label: "Markets", path: "/" },
    { label: "Trade", path: "/trade" },
    { label: "Futures", path: "/futures" },
    { label: "Wallet", path: "/wallet" },
    { label: "Admin", path: "/admin" },
  ];

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
      </div>
    </nav>
  );
}
