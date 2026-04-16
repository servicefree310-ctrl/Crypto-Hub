import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { TrendingUp, TrendingDown, ArrowRight, BarChart2, Globe, Activity, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MOCK_COINS } from "@/lib/mock-data";

const TICKER_COINS = [
  { symbol: "BTC/USDT", price: 64250.50, change: 2.5 },
  { symbol: "ETH/USDT", price: 3180.20, change: -1.2 },
  { symbol: "BNB/USDT", price: 580.40, change: 5.4 },
  { symbol: "SOL/USDT", price: 142.60, change: 8.2 },
  { symbol: "ADA/USDT", price: 0.4512, change: -0.5 },
  { symbol: "DOGE/USDT", price: 0.1534, change: 12.5 },
  { symbol: "XRP/USDT", price: 0.5841, change: 0.2 },
  { symbol: "MATIC/USDT", price: 0.7228, change: -2.1 },
  { symbol: "LINK/USDT", price: 14.50, change: 1.5 },
  { symbol: "DOT/USDT", price: 7.22, change: 3.2 },
];

function PriceTicker() {
  const [prices, setPrices] = useState(TICKER_COINS);

  useEffect(() => {
    const interval = setInterval(() => {
      setPrices(prev =>
        prev.map(c => ({
          ...c,
          price: c.price * (1 + (Math.random() - 0.499) * 0.001),
        }))
      );
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const items = [...prices, ...prices];

  return (
    <div className="border-b border-border bg-secondary overflow-hidden">
      <div className="flex animate-[ticker_40s_linear_infinite] w-max">
        {items.map((coin, i) => (
          <div key={i} className="flex items-center gap-2 px-5 py-2 border-r border-border/40 shrink-0">
            <span className="text-xs font-mono font-medium text-foreground">{coin.symbol}</span>
            <span className="text-xs font-mono text-foreground">
              ${coin.price >= 1000
                ? coin.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                : coin.price.toFixed(4)}
            </span>
            <span className={`text-xs font-mono font-medium ${coin.change >= 0 ? "text-success" : "text-destructive"}`}>
              {coin.change >= 0 ? "+" : ""}{coin.change.toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniSparkline({ positive }: { positive: boolean }) {
  const points = Array.from({ length: 12 }, (_, i) => {
    const base = 50;
    const noise = (Math.random() - (positive ? 0.3 : 0.7)) * 20;
    return base + noise + (positive ? i * 2 : -i * 1.5);
  });
  const min = Math.min(...points);
  const max = Math.max(...points);
  const normalize = (v: number) => ((v - min) / (max - min)) * 30;

  const path = points.map((p, i) => {
    const x = (i / (points.length - 1)) * 80;
    const y = 30 - normalize(p);
    return `${i === 0 ? "M" : "L"} ${x} ${y}`;
  }).join(" ");

  return (
    <svg width="80" height="32" viewBox="0 0 80 32" fill="none">
      <path
        d={path}
        stroke={positive ? "#0ecb81" : "#f6465d"}
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Home() {
  const [btcPrice, setBtcPrice] = useState(64250.50);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<string>("marketCap");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [filter, setFilter] = useState<"all" | "gainers" | "losers">("all");
  const prevBtcRef = useRef(btcPrice);

  useEffect(() => {
    const interval = setInterval(() => {
      setBtcPrice(prev => {
        const next = prev * (1 + (Math.random() - 0.499) * 0.001);
        prevBtcRef.current = prev;
        return next;
      });
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const btcUp = btcPrice >= prevBtcRef.current;

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const filteredCoins = MOCK_COINS
    .filter(c => {
      const q = searchQuery.toLowerCase();
      if (q && !c.symbol.toLowerCase().includes(q) && !c.name.toLowerCase().includes(q)) return false;
      if (filter === "gainers" && c.change24h < 0) return false;
      if (filter === "losers" && c.change24h >= 0) return false;
      return true;
    })
    .sort((a, b) => {
      let av: number, bv: number;
      if (sortKey === "price") { av = a.price; bv = b.price; }
      else if (sortKey === "change24h") { av = a.change24h; bv = b.change24h; }
      else { av = parseFloat(a.marketCap); bv = parseFloat(b.marketCap); }
      return sortDir === "desc" ? bv - av : av - bv;
    });

  const SortIcon = ({ col }: { col: string }) => (
    <span className={`ml-1 text-xs ${sortKey === col ? "text-primary" : "text-muted-foreground/40"}`}>
      {sortKey === col && sortDir === "asc" ? "↑" : "↓"}
    </span>
  );

  return (
    <div className="min-h-screen bg-background">
      <PriceTicker />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(252,213,53,0.06)_0%,transparent_60%)] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 py-20 flex flex-col lg:flex-row items-center gap-12">
          <div className="flex-1 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-xs font-medium text-primary">
              <Activity size={12} />
              Live market data
            </div>
            <h1 className="text-5xl lg:text-6xl font-bold leading-tight tracking-tight">
              Trade Crypto
              <span className="text-primary block">Like a Pro</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-lg">
              Access 400+ cryptocurrency pairs with institutional-grade tools, real-time order books, and lightning-fast execution.
            </p>
            <div className="flex items-center gap-4 pt-2">
              <Link href="/trade" data-testid="btn-start-trading">
                <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-8 gap-2">
                  Start Trading <ArrowRight size={16} />
                </Button>
              </Link>
              <Link href="/" data-testid="btn-view-markets">
                <Button size="lg" variant="outline" className="border-border font-medium">
                  View Markets
                </Button>
              </Link>
            </div>
          </div>

          {/* BTC Price Card */}
          <div className="flex-shrink-0 w-full lg:w-80">
            <div className="bg-card border border-border rounded-lg p-6 space-y-4 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#F7931A] flex items-center justify-center text-white font-bold text-xs">₿</div>
                  <span className="font-semibold text-foreground">Bitcoin</span>
                  <span className="text-xs text-muted-foreground">BTC/USDT</span>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${btcUp ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                  +2.50%
                </span>
              </div>
              <div>
                <div
                  data-testid="btc-price"
                  className={`text-4xl font-mono font-bold tracking-tight transition-colors duration-300 ${btcUp ? "text-success" : "text-destructive"}`}
                >
                  ${btcPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-sm text-muted-foreground mt-1">≈ 1 BTC</div>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                <div>
                  <div className="text-xs text-muted-foreground">24h High</div>
                  <div className="text-sm font-mono font-medium text-success">$65,480.00</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">24h Low</div>
                  <div className="text-sm font-mono font-medium text-destructive">$62,950.00</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">24h Volume</div>
                  <div className="text-sm font-mono font-medium">$32.5B</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Market Cap</div>
                  <div className="text-sm font-mono font-medium">$1.26T</div>
                </div>
              </div>
              <Link href="/trade" data-testid="btn-trade-btc">
                <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-medium mt-2">
                  Trade BTC
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="border-b border-border bg-secondary/30">
        <div className="max-w-7xl mx-auto px-6 py-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Market Cap", value: "$2.41T", change: "+3.2%", icon: Globe, up: true },
            { label: "24h Volume", value: "$98.5B", change: "+12.4%", icon: BarChart2, up: true },
            { label: "BTC Dominance", value: "52.3%", change: "-0.8%", icon: Activity, up: false },
            { label: "Active Pairs", value: "1,842", change: "+14", icon: Layers, up: true },
          ].map((stat) => (
            <div key={stat.label} className="flex items-center gap-3">
              <div className="p-2 bg-card border border-border rounded-md shrink-0">
                <stat.icon size={16} className="text-primary" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono font-semibold text-foreground">{stat.value}</span>
                  <span className={`text-xs font-mono ${stat.up ? "text-success" : "text-destructive"}`}>{stat.change}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Coin Table */}
      <section className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Markets</h2>
            <p className="text-sm text-muted-foreground mt-1">Top cryptocurrencies by market cap</p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="flex border border-border rounded-md overflow-hidden text-xs">
              {(["all", "gainers", "losers"] as const).map(f => (
                <button
                  key={f}
                  data-testid={`filter-${f}`}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 capitalize font-medium transition-colors ${filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}
                >
                  {f}
                </button>
              ))}
            </div>
            <Input
              data-testid="input-search-coin"
              placeholder="Search coin..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-40 h-8 text-sm bg-secondary border-border focus-visible:ring-primary"
            />
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">#</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Coin</th>
                  <th
                    className="text-right px-4 py-3 text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none"
                    onClick={() => handleSort("price")}
                    data-testid="th-price"
                  >
                    Price <SortIcon col="price" />
                  </th>
                  <th
                    className="text-right px-4 py-3 text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none"
                    onClick={() => handleSort("change24h")}
                    data-testid="th-change"
                  >
                    24h Change <SortIcon col="change24h" />
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground hidden md:table-cell">24h Volume</th>
                  <th
                    className="text-right px-4 py-3 text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none hidden lg:table-cell"
                    onClick={() => handleSort("marketCap")}
                    data-testid="th-marketcap"
                  >
                    Market Cap <SortIcon col="marketCap" />
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground hidden xl:table-cell">7d Chart</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredCoins.map((coin, i) => (
                  <tr
                    key={coin.symbol}
                    data-testid={`row-coin-${coin.symbol}`}
                    className="border-b border-border/50 hover:bg-secondary/30 transition-colors group"
                  >
                    <td className="px-4 py-3 text-sm text-muted-foreground font-mono">{i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center text-xs font-bold text-primary shrink-0">
                          {coin.symbol.slice(0, 1)}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-foreground">{coin.symbol}</div>
                          <div className="text-xs text-muted-foreground">{coin.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-mono text-foreground">
                        ${coin.price >= 1 ? coin.price.toLocaleString("en-US", { minimumFractionDigits: 2 }) : coin.price.toFixed(4)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className={`flex items-center justify-end gap-1 text-sm font-mono font-medium ${coin.change24h >= 0 ? "text-success" : "text-destructive"}`}>
                        {coin.change24h >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {coin.change24h >= 0 ? "+" : ""}{coin.change24h.toFixed(2)}%
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right hidden md:table-cell">
                      <span className="text-sm font-mono text-muted-foreground">{coin.volume}</span>
                    </td>
                    <td className="px-4 py-3 text-right hidden lg:table-cell">
                      <span className="text-sm font-mono text-muted-foreground">{coin.marketCap}</span>
                    </td>
                    <td className="px-4 py-3 text-right hidden xl:table-cell">
                      <MiniSparkline positive={coin.change24h >= 0} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href="/trade" data-testid={`btn-trade-${coin.symbol}`}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground transition-all"
                        >
                          Trade
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="border-t border-border bg-gradient-to-r from-background via-secondary/20 to-background py-16">
        <div className="max-w-3xl mx-auto px-6 text-center space-y-6">
          <h2 className="text-3xl font-bold text-foreground">Ready to start trading?</h2>
          <p className="text-muted-foreground">Join millions of traders on the world's most advanced crypto exchange.</p>
          <div className="flex justify-center gap-4">
            <Link href="/register" data-testid="btn-create-account">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-8">
                Create Account
              </Button>
            </Link>
            <Link href="/trade" data-testid="btn-explore-markets">
              <Button size="lg" variant="outline" className="border-border font-medium">
                Explore Markets
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <style>{`
        @keyframes ticker {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
