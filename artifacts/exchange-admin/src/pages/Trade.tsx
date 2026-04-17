import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  ChevronDown, Star, Settings2, Maximize2, BarChart2,
  TrendingUp, TrendingDown, Bell, Clock, AlertCircle, Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { generateMockCandles, generateOrderBook } from "@/lib/mock-data";

/* ─── Types ─── */
interface Candle { time: number; dateStr: string; open: number; high: number; low: number; close: number; volume: number }
interface Trade { time: string; price: number; amount: number; side: "Buy" | "Sell"; size: "sm" | "md" | "lg" }

/* ─── Static data ─── */
const PAIRS = [
  { symbol: "BTC/USDT", price: 64250.50, change: 2.5, high: 65480, low: 62950, volume: "32.5B", vol24: "18,432 BTC" },
  { symbol: "ETH/USDT", price: 3180.20, change: -1.2, high: 3280, low: 3100, volume: "15.2B", vol24: "124,822 ETH" },
  { symbol: "BNB/USDT", price: 580.40, change: 5.4, high: 610, low: 555, volume: "2.1B", vol24: "42,100 BNB" },
  { symbol: "SOL/USDT", price: 142.60, change: 8.2, high: 155, low: 132, volume: "4.5B", vol24: "380,000 SOL" },
  { symbol: "ADA/USDT", price: 0.4512, change: -0.5, high: 0.47, low: 0.43, volume: "350M", vol24: "5.2B ADA" },
];
const INTERVALS = ["1m","5m","15m","30m","1H","4H","1D","1W"];
const GROUPINGS = ["0.01","0.10","1.00","10.00"];
const ORDER_HISTORY = [
  { id:"h1", time:"2026-04-15 09:22", pair:"BTC/USDT", type:"Limit", side:"Buy",  price:"62,100.00", amount:"0.08", filled:"100%", total:"4,968.00", status:"Filled" },
  { id:"h2", time:"2026-04-14 14:55", pair:"ETH/USDT", type:"Market",side:"Sell", price:"3,245.00",  amount:"2.00", filled:"100%", total:"6,490.00", status:"Filled" },
  { id:"h3", time:"2026-04-13 11:10", pair:"BNB/USDT", type:"Limit", side:"Buy",  price:"560.00",    amount:"5.00", filled:"0%",   total:"2,800.00", status:"Cancelled" },
];
const OPEN_ORDERS = [
  { id:"o1", time:"14:32:10", pair:"BTC/USDT", type:"Limit", side:"Buy",  price:"63,500.00", amount:"0.05", filled:"0%", total:"3,175.00" },
  { id:"o2", time:"13:15:44", pair:"ETH/USDT", type:"Stop",  side:"Sell", price:"3,050.00",  amount:"1.20", filled:"0%", total:"3,660.00" },
];

function generateLiveTrade(basePrice: number): Trade {
  const side = Math.random() > 0.5 ? "Buy" : "Sell";
  const noise = (Math.random() - 0.5) * 30;
  const amount = +(Math.random() * 0.5 + 0.001).toFixed(4);
  const size = amount > 0.3 ? "lg" : amount > 0.1 ? "md" : "sm";
  const now = new Date();
  const time = now.toTimeString().split(" ")[0];
  return { time, price: basePrice + noise, amount, side, size };
}

/* ─── Custom Candlestick SVG Chart ─── */
function CandlestickChart({ candles }: { candles: Candle[] }) {
  const W = 900, H = 300, PAD = { t: 10, r: 58, b: 30, l: 6 };
  const chartW = W - PAD.l - PAD.r;
  const chartH = H - PAD.t - PAD.b;
  const prices = candles.flatMap(c => [c.high, c.low]);
  const minP = Math.min(...prices), maxP = Math.max(...prices);
  const range = maxP - minP || 1;
  const py = (v: number) => PAD.t + ((maxP - v) / range) * chartH;
  const candleW = Math.max(2, Math.floor(chartW / candles.length) - 1);
  const cx = (i: number) => PAD.l + (i / candles.length) * chartW + candleW / 2;

  const yTicks = Array.from({ length: 6 }, (_, i) => minP + (range / 5) * i);
  const xLabels = candles.filter((_, i) => i % Math.floor(candles.length / 8) === 0);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" style={{ display:"block" }}>
      <defs>
        <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1e2329" stopOpacity="1"/>
          <stop offset="100%" stopColor="#0b0e11" stopOpacity="1"/>
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill="url(#bgGrad)" />
      {/* Grid lines */}
      {yTicks.map((v, i) => (
        <g key={i}>
          <line x1={PAD.l} x2={W - PAD.r} y1={py(v)} y2={py(v)} stroke="#2b2f36" strokeWidth="1" strokeDasharray="3 4" />
          <text x={W - PAD.r + 4} y={py(v) + 4} fill="#848e9c" fontSize="9" fontFamily="monospace">
            {v >= 1000 ? `${(v/1000).toFixed(1)}k` : v.toFixed(2)}
          </text>
        </g>
      ))}
      {/* Candles */}
      {candles.map((c, i) => {
        const x = cx(i);
        const isGreen = c.close >= c.open;
        const color = isGreen ? "#0ecb81" : "#f6465d";
        const bodyTop = py(Math.max(c.open, c.close));
        const bodyBot = py(Math.min(c.open, c.close));
        const bodyH = Math.max(1, bodyBot - bodyTop);
        return (
          <g key={i}>
            <line x1={x} x2={x} y1={py(c.high)} y2={py(c.low)} stroke={color} strokeWidth="1" />
            <rect x={x - candleW / 2} y={bodyTop} width={candleW} height={bodyH} fill={color} opacity="0.9" rx="0.5" />
          </g>
        );
      })}
      {/* X labels */}
      {xLabels.map((c, i) => {
        const idx = candles.indexOf(c);
        return (
          <text key={i} x={cx(idx)} y={H - 6} fill="#848e9c" fontSize="9" fontFamily="monospace" textAnchor="middle">
            {c.dateStr}
          </text>
        );
      })}
    </svg>
  );
}

/* ─── Volume Chart ─── */
function VolumeChart({ candles }: { candles: Candle[] }) {
  const W = 900, H = 72, PAD = { t: 4, r: 58, b: 2, l: 6 };
  const chartW = W - PAD.l - PAD.r;
  const maxVol = Math.max(...candles.map(c => c.volume));
  const bw = Math.max(2, Math.floor(chartW / candles.length) - 1);
  const cx = (i: number) => PAD.l + (i / candles.length) * chartW;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" style={{ display:"block" }}>
      <rect width={W} height={H} fill="#0b0e11" />
      {candles.map((c, i) => {
        const barH = ((c.volume / maxVol) * (H - PAD.t - PAD.b));
        const isGreen = c.close >= c.open;
        return (
          <rect
            key={i}
            x={cx(i)}
            y={H - PAD.b - barH}
            width={bw}
            height={barH}
            fill={isGreen ? "#0ecb81" : "#f6465d"}
            opacity="0.45"
          />
        );
      })}
      <text x={W - PAD.r + 4} y={12} fill="#848e9c" fontSize="9" fontFamily="monospace">Vol</text>
    </svg>
  );
}

/* ─── Depth Chart ─── */
function DepthChart({ asks, bids }: { asks: any[]; bids: any[] }) {
  const W = 900, H = 80, PAD = { t: 4, r: 58, b: 16, l: 6 };
  const chartW = W - PAD.l - PAD.r;
  const chartH = H - PAD.t - PAD.b;
  const maxTotal = Math.max(
    parseFloat(asks[asks.length - 1]?.total || "0"),
    parseFloat(bids[bids.length - 1]?.total || "0")
  ) || 1;
  const midX = PAD.l + chartW / 2;

  const bidPts = bids.map((b, i) => {
    const x = midX - (i / bids.length) * (chartW / 2);
    const y = PAD.t + chartH - (parseFloat(b.total) / maxTotal) * chartH;
    return `${x},${y}`;
  });
  const askPts = asks.map((a, i) => {
    const x = midX + (i / asks.length) * (chartW / 2);
    const y = PAD.t + chartH - (parseFloat(a.total) / maxTotal) * chartH;
    return `${x},${y}`;
  });

  const bidPath = bidPts.length
    ? `M${midX},${PAD.t + chartH} ${bidPts.map(p => `L${p}`).join(" ")} L${PAD.l},${PAD.t + chartH} Z`
    : "";
  const askPath = askPts.length
    ? `M${midX},${PAD.t + chartH} ${askPts.map(p => `L${p}`).join(" ")} L${PAD.l + chartW},${PAD.t + chartH} Z`
    : "";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" style={{ display:"block" }}>
      <defs>
        <linearGradient id="bidDepth" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0ecb81" stopOpacity="0.3"/>
          <stop offset="100%" stopColor="#0ecb81" stopOpacity="0.05"/>
        </linearGradient>
        <linearGradient id="askDepth" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f6465d" stopOpacity="0.3"/>
          <stop offset="100%" stopColor="#f6465d" stopOpacity="0.05"/>
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill="#0b0e11" />
      {bidPath && <path d={bidPath} fill="url(#bidDepth)" stroke="#0ecb81" strokeWidth="1.5" />}
      {askPath && <path d={askPath} fill="url(#askDepth)" stroke="#f6465d" strokeWidth="1.5" />}
      <line x1={midX} x2={midX} y1={PAD.t} y2={PAD.t + chartH} stroke="#2b2f36" strokeWidth="1" strokeDasharray="3 3" />
      <text x={PAD.l + 4} y={H - 3} fill="#0ecb81" fontSize="8" fontFamily="monospace">Bids</text>
      <text x={W - PAD.r + 4} y={H - 3} fill="#f6465d" fontSize="8" fontFamily="monospace">Asks</text>
    </svg>
  );
}

/* ─── Main Component ─── */
export default function Trade() {
  const [selectedPair, setSelectedPair] = useState(PAIRS[0]);
  const [showPairSearch, setShowPairSearch] = useState(false);
  const [pairSearchQ, setPairSearchQ] = useState("");
  const [favorites, setFavorites] = useState<string[]>(["BTC/USDT"]);
  const [interval_, setInterval_] = useState("1H");
  const [grouping, setGrouping] = useState("1.00");
  const [showGrouping, setShowGrouping] = useState(false);
  const [orderBookView, setOrderBookView] = useState<"both" | "asks" | "bids">("both");
  const [candles, setCandles] = useState<Candle[]>(() => generateMockCandles(80));
  const [orderBook, setOrderBook] = useState(() => generateOrderBook());
  const [trades, setTrades] = useState<Trade[]>(() =>
    Array.from({ length: 28 }, () => generateLiveTrade(64250))
  );
  const [orderSide, setOrderSide] = useState<"buy" | "sell">("buy");
  const [orderType, setOrderType] = useState<"limit" | "market" | "stop-limit" | "oco">("limit");
  const [price, setPrice] = useState("64250.50");
  const [stopPrice, setStopPrice] = useState("");
  const [amount, setAmount] = useState("");
  const [pct, setPct] = useState([0]);
  const [tpEnabled, setTpEnabled] = useState(false);
  const [slEnabled, setSlEnabled] = useState(false);
  const [tpPrice, setTpPrice] = useState("");
  const [slPrice, setSlPrice] = useState("");
  const [postOnly, setPostOnly] = useState(false);
  const [tif, setTif] = useState<"GTC" | "IOC" | "FOK">("GTC");
  const [currentPrice, setCurrentPrice] = useState(selectedPair.price);
  const prevPriceRef = useRef(currentPrice);
  const tradesRef = useRef<HTMLDivElement>(null);
  const [showIndicators, setShowIndicators] = useState(false);
  const [activeIndicators, setActiveIndicators] = useState<string[]>(["MA(7)", "MA(25)"]);

  const availableBalance = 5847.32;
  const availableAsset = 0.0854;

  useEffect(() => {
    const iv = window.setInterval(() => {
      setCurrentPrice(p => {
        const next = p * (1 + (Math.random() - 0.499) * 0.0008);
        prevPriceRef.current = p;
        return next;
      });
      setOrderBook(generateOrderBook());
      setTrades(prev => {
        const t = generateLiveTrade(currentPrice);
        return [t, ...prev.slice(0, 50)];
      });
    }, 1200);
    return () => clearInterval(iv);
  }, [currentPrice]);

  useEffect(() => {
    setCurrentPrice(selectedPair.price);
    setPrice(selectedPair.price.toFixed(2));
    setCandles(generateMockCandles(80));
  }, [selectedPair]);

  const priceUp = currentPrice >= prevPriceRef.current;
  const total = price && amount ? (parseFloat(price) * parseFloat(amount)).toFixed(2) : "0.00";
  const estFee = total !== "0.00" ? (parseFloat(total) * 0.001).toFixed(4) : "0.0000";

  const handlePct = useCallback((v: number[]) => {
    setPct(v);
    if (v[0] > 0 && price) {
      const a = orderSide === "buy"
        ? ((availableBalance * v[0] / 100) / parseFloat(price)).toFixed(6)
        : (availableAsset * v[0] / 100).toFixed(6);
      setAmount(a);
    }
  }, [price, orderSide]);

  const toggleIndicator = (ind: string) => {
    setActiveIndicators(prev => prev.includes(ind) ? prev.filter(i => i !== ind) : [...prev, ind]);
  };

  const filteredPairs = PAIRS.filter(p =>
    p.symbol.toLowerCase().includes(pairSearchQ.toLowerCase())
  );

  const priceFormatted = (v: number) =>
    v >= 1 ? v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : v.toFixed(4);

  return (
    <div className="flex flex-col bg-background overflow-hidden" style={{ height: "calc(100vh - 64px)" }}>

      {/* ── TOP INFO BAR ── */}
      <div className="border-b border-border bg-[#161a1e] px-3 py-1.5 flex items-center gap-5 overflow-x-auto shrink-0">
        {/* Pair selector */}
        <div className="relative shrink-0">
          <button
            data-testid="btn-pair-selector"
            onClick={() => setShowPairSearch(v => !v)}
            className="flex items-center gap-2 group"
          >
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-[#F7931A]/20 flex items-center justify-center text-[9px] font-bold text-[#F7931A]">₿</div>
              <span className="text-base font-bold text-foreground">{selectedPair.symbol}</span>
            </div>
            <ChevronDown size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
          </button>

          {showPairSearch && (
            <div className="absolute top-full left-0 mt-2 w-72 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
              <div className="p-2 border-b border-border">
                <div className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-1.5">
                  <Search size={13} className="text-muted-foreground" />
                  <input
                    autoFocus
                    value={pairSearchQ}
                    onChange={e => setPairSearchQ(e.target.value)}
                    placeholder="Search pair..."
                    className="bg-transparent text-sm text-foreground outline-none flex-1 placeholder:text-muted-foreground"
                  />
                </div>
              </div>
              <div className="max-h-52 overflow-y-auto">
                {filteredPairs.map(p => (
                  <button
                    key={p.symbol}
                    data-testid={`pair-option-${p.symbol.replace("/", "-")}`}
                    onClick={() => { setSelectedPair(p); setShowPairSearch(false); setPairSearchQ(""); }}
                    className="w-full px-4 py-2.5 text-left hover:bg-secondary/50 flex items-center justify-between transition-colors group/item"
                  >
                    <div className="flex items-center gap-2">
                      <button onClick={e => { e.stopPropagation(); setFavorites(f => f.includes(p.symbol) ? f.filter(x=>x!==p.symbol) : [...f,p.symbol]); }}
                        className={`${favorites.includes(p.symbol) ? "text-primary" : "text-muted-foreground"} hover:text-primary transition-colors`}>
                        <Star size={11} fill={favorites.includes(p.symbol) ? "currentColor" : "none"} />
                      </button>
                      <span className="text-sm font-mono font-semibold text-foreground">{p.symbol}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-mono text-foreground">{priceFormatted(p.price)}</div>
                      <div className={`text-[10px] font-mono ${p.change >= 0 ? "text-success" : "text-destructive"}`}>{p.change >= 0 ? "+" : ""}{p.change}%</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Live price */}
        <div className="flex flex-col shrink-0">
          <span
            data-testid="current-price"
            className={`text-xl font-mono font-bold leading-none transition-colors duration-200 ${priceUp ? "text-success" : "text-destructive"}`}
          >
            {priceFormatted(currentPrice)}
          </span>
          <span className="text-[10px] text-muted-foreground font-mono">≈ ${priceFormatted(currentPrice)} USDT</span>
        </div>

        <div className="h-6 w-px bg-border shrink-0" />

        {/* Stats grid */}
        <div className="flex items-center gap-4 overflow-x-auto">
          {[
            { label: "24h Change", value: `${selectedPair.change >= 0 ? "+" : ""}${selectedPair.change}%`, up: selectedPair.change >= 0, colored: true },
            { label: "24h High", value: priceFormatted(selectedPair.high), up: true, colored: false },
            { label: "24h Low",  value: priceFormatted(selectedPair.low), up: false, colored: false },
            { label: "24h Vol(" + selectedPair.symbol.split("/")[0] + ")", value: selectedPair.vol24, up: true, colored: false },
            { label: "24h Vol(USDT)", value: selectedPair.volume, up: true, colored: false },
          ].map(s => (
            <div key={s.label} className="shrink-0 hidden md:block">
              <div className="text-[10px] text-muted-foreground">{s.label}</div>
              <div className={`text-xs font-mono font-medium ${s.colored ? (s.up ? "text-success" : "text-destructive") : "text-foreground"}`}>
                {s.value}
              </div>
            </div>
          ))}
        </div>

        {/* Right actions */}
        <div className="ml-auto flex items-center gap-1 shrink-0">
          <button title="Alerts" className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
            <Bell size={14} />
          </button>
          <button title="Settings" className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
            <Settings2 size={14} />
          </button>
          <button title="Fullscreen" className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
            <Maximize2 size={14} />
          </button>
        </div>
      </div>

      {/* ── MAIN LAYOUT: 4 columns ── */}
      <div className="flex-1 flex min-h-0 overflow-hidden">

        {/* ─ COL 1: Order Book ─ */}
        <div className="w-[200px] border-r border-border flex flex-col bg-background shrink-0 overflow-hidden">
          {/* Order book header */}
          <div className="px-2 pt-2 pb-1 shrink-0 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">Order Book</span>
              {/* View toggle */}
              <div className="flex gap-0.5">
                {(["both","bids","asks"] as const).map(v => (
                  <button
                    key={v}
                    data-testid={`ob-view-${v}`}
                    onClick={() => setOrderBookView(v)}
                    title={v}
                    className={`w-6 h-5 flex items-center justify-center rounded transition-colors ${orderBookView === v ? "bg-secondary" : "hover:bg-secondary/50"}`}
                  >
                    {v === "both" && (
                      <span className="flex flex-col gap-px">
                        <span className="w-3 h-px bg-destructive block" />
                        <span className="w-3 h-px bg-success block" />
                      </span>
                    )}
                    {v === "asks" && <span className="w-3 h-2 border border-destructive rounded-sm block" />}
                    {v === "bids" && <span className="w-3 h-2 border border-success rounded-sm block" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Grouping */}
            <div className="relative">
              <button
                data-testid="btn-grouping"
                onClick={() => setShowGrouping(v => !v)}
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              >
                <span>Group: {grouping}</span>
                <ChevronDown size={9} />
              </button>
              {showGrouping && (
                <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-50 py-1">
                  {GROUPINGS.map(g => (
                    <button key={g} onClick={() => { setGrouping(g); setShowGrouping(false); }}
                      className={`w-full text-left px-3 py-1 text-xs hover:bg-secondary transition-colors font-mono ${grouping === g ? "text-primary" : "text-foreground"}`}>
                      {g}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Column headers */}
            <div className="grid grid-cols-3 text-[9px] text-muted-foreground pb-0.5 border-b border-border">
              <span>Price</span>
              <span className="text-right">Amount</span>
              <span className="text-right">Total</span>
            </div>
          </div>

          {/* Order rows */}
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            {orderBookView !== "bids" && (
              <div className="flex-1 overflow-y-auto flex flex-col-reverse">
                {orderBook.asks.slice(0, 16).map((ask, i) => (
                  <div key={i} data-testid={`ask-row-${i}`}
                    className="relative grid grid-cols-3 px-2 py-[2.5px] hover:bg-destructive/5 cursor-pointer group transition-colors">
                    <div className="absolute inset-y-0 right-0 bg-destructive/8 transition-all" style={{ width: `${ask.depth}%` }} />
                    <span className="text-[10px] font-mono text-destructive relative z-10 group-hover:text-[#ff6b7a]">{ask.price}</span>
                    <span className="text-[10px] font-mono text-foreground/80 relative z-10 text-right">{ask.amount}</span>
                    <span className="text-[10px] font-mono text-muted-foreground relative z-10 text-right">{ask.total}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Spread */}
            <div className="flex items-center gap-2 px-2 py-1.5 bg-secondary/20 border-y border-border shrink-0">
              <span className={`text-sm font-mono font-bold ${priceUp ? "text-success" : "text-destructive"}`}>
                {priceFormatted(currentPrice)}
              </span>
              {priceUp ? <TrendingUp size={11} className="text-success" /> : <TrendingDown size={11} className="text-destructive" />}
              <span className="text-[9px] text-muted-foreground ml-auto">≈$2.10</span>
            </div>

            {orderBookView !== "asks" && (
              <div className="flex-1 overflow-y-auto">
                {orderBook.bids.slice(0, 16).map((bid, i) => (
                  <div key={i} data-testid={`bid-row-${i}`}
                    className="relative grid grid-cols-3 px-2 py-[2.5px] hover:bg-success/5 cursor-pointer group transition-colors">
                    <div className="absolute inset-y-0 right-0 bg-success/8 transition-all" style={{ width: `${bid.depth}%` }} />
                    <span className="text-[10px] font-mono text-success relative z-10 group-hover:text-[#1ddb8e]">{bid.price}</span>
                    <span className="text-[10px] font-mono text-foreground/80 relative z-10 text-right">{bid.amount}</span>
                    <span className="text-[10px] font-mono text-muted-foreground relative z-10 text-right">{bid.total}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ─ COL 2: Chart area + bottom panel ─ */}
        <div className="flex-1 flex flex-col border-r border-border overflow-hidden min-w-0">

          {/* Chart toolbar */}
          <div className="border-b border-border bg-[#161a1e]/60 px-3 py-1.5 flex items-center gap-2 shrink-0 overflow-x-auto">
            {/* Intervals */}
            <div className="flex gap-0.5 shrink-0">
              {INTERVALS.map(iv => (
                <button key={iv} data-testid={`interval-${iv}`} onClick={() => setInterval_(iv)}
                  className={`px-2 py-1 text-[10px] rounded font-medium transition-colors ${interval_ === iv ? "bg-primary/25 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"}`}>
                  {iv}
                </button>
              ))}
            </div>

            <div className="h-4 w-px bg-border shrink-0" />

            {/* Indicators */}
            <div className="relative shrink-0">
              <button
                data-testid="btn-indicators"
                onClick={() => setShowIndicators(v => !v)}
                className="flex items-center gap-1 px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground hover:bg-secondary/40 rounded transition-colors"
              >
                <BarChart2 size={11} /> Indicators
                {activeIndicators.length > 0 && (
                  <span className="bg-primary text-primary-foreground text-[8px] rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold">
                    {activeIndicators.length}
                  </span>
                )}
              </button>
              {showIndicators && (
                <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-xl shadow-2xl z-50 p-2 w-52">
                  <div className="text-[10px] text-muted-foreground font-medium px-2 pb-2">Moving Averages</div>
                  {["MA(7)","MA(25)","MA(99)","EMA(12)","EMA(26)"].map(ind => (
                    <button key={ind} onClick={() => toggleIndicator(ind)}
                      className={`w-full text-left px-2 py-1.5 text-xs rounded hover:bg-secondary flex items-center justify-between transition-colors ${activeIndicators.includes(ind) ? "text-primary" : "text-foreground"}`}>
                      <span>{ind}</span>
                      {activeIndicators.includes(ind) && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                    </button>
                  ))}
                  <div className="text-[10px] text-muted-foreground font-medium px-2 pb-2 pt-2 border-t border-border mt-1">Oscillators</div>
                  {["RSI(14)","MACD","Bollinger"].map(ind => (
                    <button key={ind} onClick={() => toggleIndicator(ind)}
                      className={`w-full text-left px-2 py-1.5 text-xs rounded hover:bg-secondary flex items-center justify-between transition-colors ${activeIndicators.includes(ind) ? "text-primary" : "text-foreground"}`}>
                      <span>{ind}</span>
                      {activeIndicators.includes(ind) && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {activeIndicators.length > 0 && (
              <div className="flex gap-1 shrink-0">
                {activeIndicators.map((ind, i) => (
                  <span key={ind} className="text-[9px] px-1.5 py-0.5 rounded border border-border text-muted-foreground font-mono"
                    style={{ color: ["#fcd535","#0ecb81","#f6465d","#3b82f6","#a855f7","#f97316"][i % 6] }}>
                    {ind}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Charts */}
          <div className="flex flex-col min-h-0" style={{ flex: "1 1 0" }}>
            {/* Candlestick chart - 65% */}
            <div style={{ flex: "4 1 0" }} className="overflow-hidden">
              <CandlestickChart candles={candles} />
            </div>
            {/* Volume bars - 15% */}
            <div style={{ flex: "1 1 0" }} className="border-t border-border/40 overflow-hidden">
              <VolumeChart candles={candles} />
            </div>
            {/* Depth chart - 20% */}
            <div style={{ flex: "1.2 1 0" }} className="border-t border-border/40 overflow-hidden">
              <DepthChart asks={orderBook.asks} bids={orderBook.bids} />
            </div>
          </div>

          {/* Bottom panel */}
          <div className="border-t border-border shrink-0" style={{ maxHeight: 190, overflowY: "auto" }}>
            <Tabs defaultValue="open">
              <TabsList className="border-b border-border rounded-none bg-transparent h-auto px-2 pt-1 gap-0 sticky top-0 bg-background z-10">
                {[
                  { v: "open", l: `Open Orders (${OPEN_ORDERS.length})` },
                  { v: "history", l: "Order History" },
                  { v: "trades", l: "Trade History" },
                  { v: "funds", l: "Funds" },
                ].map(t => (
                  <TabsTrigger key={t.v} data-testid={`tab-${t.v}`} value={t.v}
                    className="text-[10px] px-3 py-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground text-muted-foreground whitespace-nowrap">
                    {t.l}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="open" className="mt-0">
                <table className="w-full">
                  <thead className="bg-secondary/20 sticky top-0">
                    <tr>{["Date","Pair","Type","Side","Price","Amount","Filled","Total","Action"].map(h=>(
                      <th key={h} className="px-3 py-1.5 text-left text-[9px] font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {OPEN_ORDERS.map(o=>(
                      <tr key={o.id} data-testid={`open-order-${o.id}`} className="border-t border-border/40 hover:bg-secondary/15 transition-colors">
                        <td className="px-3 py-1.5 text-[10px] font-mono text-muted-foreground whitespace-nowrap"><Clock size={8} className="inline mr-1" />{o.time}</td>
                        <td className="px-3 py-1.5 text-[10px] font-mono font-medium">{o.pair}</td>
                        <td className="px-3 py-1.5 text-[10px]">{o.type}</td>
                        <td className={`px-3 py-1.5 text-[10px] font-semibold ${o.side==="Buy"?"text-success":"text-destructive"}`}>{o.side}</td>
                        <td className="px-3 py-1.5 text-[10px] font-mono">${o.price}</td>
                        <td className="px-3 py-1.5 text-[10px] font-mono">{o.amount}</td>
                        <td className="px-3 py-1.5 text-[10px] text-muted-foreground">{o.filled}</td>
                        <td className="px-3 py-1.5 text-[10px] font-mono">${o.total}</td>
                        <td className="px-3 py-1.5">
                          <button className="text-[10px] text-destructive hover:text-destructive/70 transition-colors border border-destructive/30 rounded px-1.5 py-0.5">Cancel</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TabsContent>

              <TabsContent value="history" className="mt-0">
                <table className="w-full">
                  <thead className="bg-secondary/20"><tr>
                    {["Date","Pair","Type","Side","Price","Amount","Filled","Total","Status"].map(h=>(
                      <th key={h} className="px-3 py-1.5 text-left text-[9px] font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {ORDER_HISTORY.map(o=>(
                      <tr key={o.id} className="border-t border-border/40 hover:bg-secondary/15 transition-colors">
                        <td className="px-3 py-1.5 text-[10px] font-mono text-muted-foreground whitespace-nowrap">{o.time}</td>
                        <td className="px-3 py-1.5 text-[10px] font-mono font-medium">{o.pair}</td>
                        <td className="px-3 py-1.5 text-[10px]">{o.type}</td>
                        <td className={`px-3 py-1.5 text-[10px] font-semibold ${o.side==="Buy"?"text-success":"text-destructive"}`}>{o.side}</td>
                        <td className="px-3 py-1.5 text-[10px] font-mono">${o.price}</td>
                        <td className="px-3 py-1.5 text-[10px] font-mono">{o.amount}</td>
                        <td className="px-3 py-1.5 text-[10px] text-muted-foreground">{o.filled}</td>
                        <td className="px-3 py-1.5 text-[10px] font-mono">${o.total}</td>
                        <td className="px-3 py-1.5">
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${o.status==="Filled"?"bg-success/15 text-success":"bg-muted/30 text-muted-foreground"}`}>
                            {o.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TabsContent>

              <TabsContent value="trades" className="mt-0">
                <table className="w-full">
                  <thead className="bg-secondary/20"><tr>
                    {["Time","Price (USDT)","Amount","Total","Side"].map(h=>(
                      <th key={h} className="px-3 py-1.5 text-left text-[9px] font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {trades.slice(0, 10).map((t,i)=>(
                      <tr key={i} className="border-t border-border/40">
                        <td className="px-3 py-1 text-[10px] font-mono text-muted-foreground">{t.time}</td>
                        <td className={`px-3 py-1 text-[10px] font-mono ${t.side==="Buy"?"text-success":"text-destructive"}`}>${priceFormatted(t.price)}</td>
                        <td className="px-3 py-1 text-[10px] font-mono">{t.amount.toFixed(4)}</td>
                        <td className="px-3 py-1 text-[10px] font-mono">{(t.price*t.amount).toFixed(2)}</td>
                        <td className={`px-3 py-1 text-[10px] font-semibold ${t.side==="Buy"?"text-success":"text-destructive"}`}>{t.side}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TabsContent>

              <TabsContent value="funds" className="mt-0">
                <table className="w-full">
                  <thead className="bg-secondary/20"><tr>
                    {["Asset","Available","In Order","Total"].map(h=>(
                      <th key={h} className="px-3 py-1.5 text-left text-[9px] font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {[
                      { asset:"USDT", avail:"5,847.32", inorder:"3,175.00", total:"9,022.32" },
                      { asset:"BTC",  avail:"0.0854",   inorder:"0.0500",   total:"0.1354" },
                      { asset:"ETH",  avail:"2.5000",   inorder:"1.2000",   total:"3.7000" },
                    ].map(f=>(
                      <tr key={f.asset} className="border-t border-border/40 hover:bg-secondary/15">
                        <td className="px-3 py-1.5 text-[10px] font-mono font-semibold text-foreground">{f.asset}</td>
                        <td className="px-3 py-1.5 text-[10px] font-mono">{f.avail}</td>
                        <td className="px-3 py-1.5 text-[10px] font-mono text-muted-foreground">{f.inorder}</td>
                        <td className="px-3 py-1.5 text-[10px] font-mono font-medium text-foreground">{f.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* ─ COL 3: Recent Trades ─ */}
        <div ref={tradesRef} className="w-[130px] border-r border-border flex flex-col bg-background shrink-0 overflow-hidden">
          <div className="px-2 py-2 border-b border-border shrink-0">
            <div className="text-xs font-semibold text-foreground mb-1">Trades</div>
            <div className="grid grid-cols-2 text-[9px] text-muted-foreground">
              <span>Price</span>
              <span className="text-right">Qty</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {trades.slice(0, 40).map((t, i) => (
              <div key={i} className={`grid grid-cols-2 px-2 py-[2.5px] text-[10px] font-mono transition-colors ${i === 0 ? "bg-secondary/20" : ""}`}>
                <span className={t.side === "Buy" ? "text-success" : "text-destructive"}>
                  {priceFormatted(t.price)}
                </span>
                <span className={`text-right ${t.size === "lg" ? "text-foreground font-semibold" : t.size === "md" ? "text-foreground/80" : "text-muted-foreground"}`}>
                  {t.amount.toFixed(3)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ─ COL 4: Order Panel ─ */}
        <div className="w-[230px] flex flex-col bg-background shrink-0 overflow-y-auto">

          {/* Buy / Sell tabs */}
          <div className="grid grid-cols-2 border-b border-border shrink-0">
            <button data-testid="tab-buy" onClick={() => setOrderSide("buy")}
              className={`py-2.5 text-sm font-bold transition-all ${orderSide==="buy" ? "bg-success/10 text-success border-b-2 border-success" : "text-muted-foreground hover:text-success/70"}`}>
              Buy
            </button>
            <button data-testid="tab-sell" onClick={() => setOrderSide("sell")}
              className={`py-2.5 text-sm font-bold transition-all ${orderSide==="sell" ? "bg-destructive/10 text-destructive border-b-2 border-destructive" : "text-muted-foreground hover:text-destructive/70"}`}>
              Sell
            </button>
          </div>

          <div className="p-3 space-y-2.5">
            {/* Order type */}
            <div className="flex border border-border rounded overflow-hidden text-[10px]">
              {(["limit","market","stop-limit","oco"] as const).map(t => (
                <button key={t} data-testid={`order-type-${t}`} onClick={() => setOrderType(t)}
                  className={`flex-1 py-1.5 capitalize transition-colors whitespace-nowrap ${orderType===t ? "bg-primary/20 text-primary font-medium" : "text-muted-foreground hover:text-foreground"}`}>
                  {t === "stop-limit" ? "Stop" : t === "oco" ? "OCO" : t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>

            {/* Available balance bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px]">
                <span className="text-muted-foreground">Available</span>
                <span className="font-mono text-foreground">
                  {orderSide === "buy" ? `${availableBalance.toLocaleString("en-US",{minimumFractionDigits:2})} USDT` : `${availableAsset} ${selectedPair.symbol.split("/")[0]}`}
                </span>
              </div>
              <div className="h-1 bg-secondary rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${orderSide==="buy" ? "bg-success" : "bg-destructive"}`}
                  style={{ width: `${pct[0]}%` }} />
              </div>
            </div>

            {/* Stop price (for stop-limit / oco) */}
            {(orderType === "stop-limit" || orderType === "oco") && (
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Stop Price (USDT)</label>
                <Input data-testid="input-stop-price" type="number" value={stopPrice} onChange={e => setStopPrice(e.target.value)}
                  placeholder="0.00" className="font-mono text-xs bg-secondary border-border focus-visible:ring-primary h-8 text-xs" />
              </div>
            )}

            {/* Limit price */}
            {orderType !== "market" && (
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">
                  {orderType === "stop-limit" || orderType === "oco" ? "Limit Price (USDT)" : "Price (USDT)"}
                </label>
                <Input data-testid="input-price" type="number" value={price} onChange={e => setPrice(e.target.value)}
                  className="font-mono text-xs bg-secondary border-border focus-visible:ring-primary h-8" />
              </div>
            )}
            {orderType === "market" && (
              <div className="h-8 bg-secondary/40 border border-border rounded flex items-center px-3 text-xs text-muted-foreground italic">
                Market Price
              </div>
            )}

            {/* Amount */}
            <div>
              <div className="flex justify-between mb-1">
                <label className="text-[10px] text-muted-foreground">Amount ({selectedPair.symbol.split("/")[0]})</label>
              </div>
              <Input data-testid="input-amount" type="number" value={amount} onChange={e => setAmount(e.target.value)}
                placeholder="0.0000" className="font-mono text-xs bg-secondary border-border focus-visible:ring-primary h-8" />
            </div>

            {/* Slider */}
            <div className="space-y-1.5">
              <Slider data-testid="slider-pct" value={pct} onValueChange={handlePct} max={100} step={1} />
              <div className="flex justify-between">
                {[0,25,50,75,100].map(v => (
                  <button key={v} onClick={() => handlePct([v])}
                    className={`text-[9px] px-1 py-0.5 rounded border transition-colors ${pct[0]===v ? "border-primary text-primary" : "border-border text-muted-foreground hover:border-primary/50 hover:text-primary"}`}>
                    {v}%
                  </button>
                ))}
              </div>
            </div>

            {/* Total */}
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Total (USDT)</label>
              <Input readOnly value={total} className="font-mono text-xs bg-secondary/40 border-border h-8 cursor-default text-foreground" />
            </div>

            {/* TP/SL toggles */}
            <div className="flex gap-1.5">
              <button
                data-testid="btn-toggle-tp"
                onClick={() => setTpEnabled(v => !v)}
                className={`flex-1 text-[10px] py-1.5 rounded border font-medium transition-all ${tpEnabled ? "border-success/60 text-success bg-success/10" : "border-border text-muted-foreground hover:border-success/40 hover:text-success"}`}>
                {tpEnabled ? "✓" : "+"} TP
              </button>
              <button
                data-testid="btn-toggle-sl"
                onClick={() => setSlEnabled(v => !v)}
                className={`flex-1 text-[10px] py-1.5 rounded border font-medium transition-all ${slEnabled ? "border-destructive/60 text-destructive bg-destructive/10" : "border-border text-muted-foreground hover:border-destructive/40 hover:text-destructive"}`}>
                {slEnabled ? "✓" : "+"} SL
              </button>
            </div>

            {tpEnabled && (
              <div>
                <label className="text-[10px] text-success mb-1 block">Take Profit Price</label>
                <Input data-testid="input-tp" type="number" value={tpPrice} onChange={e => setTpPrice(e.target.value)}
                  placeholder="0.00" className="font-mono text-xs bg-secondary border-success/30 focus-visible:ring-success h-8" />
              </div>
            )}
            {slEnabled && (
              <div>
                <label className="text-[10px] text-destructive mb-1 block">Stop Loss Price</label>
                <Input data-testid="input-sl" type="number" value={slPrice} onChange={e => setSlPrice(e.target.value)}
                  placeholder="0.00" className="font-mono text-xs bg-secondary border-destructive/30 focus-visible:ring-destructive h-8" />
              </div>
            )}

            {/* Advanced options */}
            <div className="flex items-center justify-between pt-0.5">
              <div className="flex items-center gap-1.5">
                <button
                  data-testid="btn-post-only"
                  onClick={() => setPostOnly(v => !v)}
                  className={`w-7 h-3.5 rounded-full transition-colors ${postOnly ? "bg-primary" : "bg-secondary border border-border"}`}>
                  <span className={`block w-2.5 h-2.5 rounded-full bg-white transition-transform mx-0.5 ${postOnly ? "translate-x-3" : "translate-x-0"}`} />
                </button>
                <span className="text-[10px] text-muted-foreground">Post Only</span>
              </div>
              {/* TIF selector */}
              <div className="flex border border-border rounded overflow-hidden">
                {(["GTC","IOC","FOK"] as const).map(t => (
                  <button key={t} onClick={() => setTif(t)}
                    className={`px-1.5 py-0.5 text-[9px] transition-colors ${tif===t ? "bg-secondary text-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Order summary */}
            <div className="bg-secondary/30 border border-border rounded p-2 space-y-1 text-[10px]">
              <div className="flex justify-between text-muted-foreground">
                <span>Est. Fee ({orderSide === "buy" ? "Maker" : "Taker"})</span>
                <span className="font-mono text-foreground">{estFee} USDT</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Max Buy</span>
                <span className="font-mono text-foreground">{price ? (availableBalance / parseFloat(price)).toFixed(6) : "—"} {selectedPair.symbol.split("/")[0]}</span>
              </div>
              {(tpEnabled && tpPrice) && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Est. Profit</span>
                  <span className="font-mono text-success">
                    +{price && tpPrice && amount ? ((parseFloat(tpPrice) - parseFloat(price)) * parseFloat(amount)).toFixed(2) : "—"} USDT
                  </span>
                </div>
              )}
              {(slEnabled && slPrice) && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Est. Loss</span>
                  <span className="font-mono text-destructive">
                    -{price && slPrice && amount ? ((parseFloat(price) - parseFloat(slPrice)) * parseFloat(amount)).toFixed(2) : "—"} USDT
                  </span>
                </div>
              )}
            </div>

            {/* Submit button */}
            <Button
              data-testid={`btn-${orderSide}-submit`}
              className={`w-full font-bold h-10 text-sm transition-all ${
                orderSide === "buy"
                  ? "bg-success text-white hover:bg-success/90 shadow-[0_0_12px_rgba(14,203,129,0.25)] hover:shadow-[0_0_18px_rgba(14,203,129,0.4)]"
                  : "bg-destructive text-white hover:bg-destructive/90 shadow-[0_0_12px_rgba(246,70,93,0.25)] hover:shadow-[0_0_18px_rgba(246,70,93,0.4)]"
              }`}
            >
              {orderSide === "buy" ? "Buy / Long" : "Sell / Short"} {selectedPair.symbol.split("/")[0]}
            </Button>

            {/* Warning for stop */}
            {orderType === "stop-limit" && (
              <div className="flex items-start gap-1.5 text-[9px] text-muted-foreground">
                <AlertCircle size={10} className="shrink-0 mt-0.5 text-primary" />
                Stop-limit order: triggers a limit order at your set price when stop price is reached.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
