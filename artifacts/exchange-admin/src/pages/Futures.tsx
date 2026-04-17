import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronDown, Info, TrendingUp, TrendingDown, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ComposedChart, Bar, ReferenceLine
} from "recharts";
import { generateMockCandles, generateOrderBook } from "@/lib/mock-data";

const PAIRS = ["BTCUSDT PERP", "ETHUSDT PERP", "BNBUSDT PERP", "SOLUSDT PERP", "DOGEUSDT PERP"];
const INTERVALS = ["1m", "5m", "15m", "1H", "4H", "1D"];
const LEVERAGE_OPTIONS = [1, 2, 3, 5, 10, 20, 50, 100, 125];

const PAIR_INFO: Record<string, {
  price: number; change: number; high: number; low: number; volume: string;
  markPrice: number; indexPrice: number; funding: number; fundingCountdown: string; openInterest: string;
}> = {
  "BTCUSDT PERP": { price: 64250.50, change: 2.5, high: 65480, low: 62950, volume: "32.5B", markPrice: 64248.20, indexPrice: 64246.50, funding: 0.0102, fundingCountdown: "01:42:18", openInterest: "18.24B" },
  "ETHUSDT PERP": { price: 3180.20, change: -1.2, high: 3280, low: 3100, volume: "15.2B", markPrice: 3179.85, indexPrice: 3179.40, funding: 0.0087, fundingCountdown: "01:42:18", openInterest: "4.52B" },
  "BNBUSDT PERP": { price: 580.40, change: 5.4, high: 610, low: 555, volume: "2.1B", markPrice: 580.28, indexPrice: 580.15, funding: 0.0100, fundingCountdown: "01:42:18", openInterest: "320M" },
  "SOLUSDT PERP": { price: 142.60, change: 8.2, high: 155, low: 132, volume: "4.5B", markPrice: 142.55, indexPrice: 142.48, funding: 0.0125, fundingCountdown: "01:42:18", openInterest: "1.08B" },
  "DOGEUSDT PERP": { price: 0.1534, change: 12.5, high: 0.172, low: 0.140, volume: "1.2B", markPrice: 0.1533, indexPrice: 0.1532, funding: 0.0150, fundingCountdown: "01:42:18", openInterest: "430M" },
};

const POSITIONS = [
  { symbol: "BTCUSDT PERP", side: "Long", size: "0.050 BTC", entryPrice: "63,100.00", markPrice: "64,250.50", liqPrice: "58,420.00", pnl: "+57.25", pnlPct: "+1.81%", margin: "640.55", leverage: "5x", up: true },
];

const OPEN_ORDERS = [
  { time: "14:32:10", symbol: "BTCUSDT PERP", type: "Limit", side: "Buy", price: "63,500.00", amount: "0.02", filled: "0%", reduceOnly: false },
  { time: "13:15:44", symbol: "ETHUSDT PERP", type: "Stop Market", side: "Sell", price: "3,050.00", amount: "1.00", filled: "0%", reduceOnly: true },
];

const FUNDING_HISTORY = [
  { time: "2026-04-16 16:00", rate: "0.0102%", interval: "8h" },
  { time: "2026-04-16 08:00", rate: "0.0095%", interval: "8h" },
  { time: "2026-04-16 00:00", rate: "0.0110%", interval: "8h" },
  { time: "2026-04-15 16:00", rate: "0.0088%", interval: "8h" },
];

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-card border border-border rounded p-2 text-xs font-mono space-y-1 shadow-lg">
      <div className="text-muted-foreground">{d?.dateStr}</div>
      <div className="text-success">H: ${d?.high?.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
      <div className="text-destructive">L: ${d?.low?.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
      <div className="text-foreground">C: ${d?.close?.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
    </div>
  );
}

export default function Futures() {
  const [selectedPair, setSelectedPair] = useState("BTCUSDT PERP");
  const [showPairMenu, setShowPairMenu] = useState(false);
  const [interval, setInterval_] = useState("1H");
  const [chartType, setChartType] = useState<"area" | "bar">("area");
  const [candles, setCandles] = useState(() => generateMockCandles(80));
  const [orderBook, setOrderBook] = useState(() => generateOrderBook());
  const [side, setSide] = useState<"long" | "short">("long");
  const [orderType, setOrderType] = useState<"limit" | "market" | "stop">("limit");
  const [leverage, setLeverage] = useState(10);
  const [showLeverageModal, setShowLeverageModal] = useState(false);
  const [leverageSlider, setLeverageSlider] = useState([10]);
  const [price, setPrice] = useState("64250.50");
  const [amount, setAmount] = useState("");
  const [pct, setPct] = useState([0]);
  const [currentPrice, setCurrentPrice] = useState(PAIR_INFO[selectedPair].price);
  const prevPriceRef = useRef(currentPrice);
  const [fundingCountdown, setFundingCountdown] = useState("01:42:18");

  const info = PAIR_INFO[selectedPair];
  const availableMargin = 1240.50;

  useEffect(() => {
    const iv = window.setInterval(() => {
      setCurrentPrice(p => {
        const next = p * (1 + (Math.random() - 0.499) * 0.0008);
        prevPriceRef.current = p;
        return next;
      });
      setOrderBook(generateOrderBook());
    }, 1500);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    setCurrentPrice(PAIR_INFO[selectedPair].price);
    setPrice(PAIR_INFO[selectedPair].price.toString());
    setCandles(generateMockCandles(80));
  }, [selectedPair]);

  const priceUp = currentPrice >= prevPriceRef.current;

  const positionValue = price && amount ? parseFloat(price) * parseFloat(amount) : 0;
  const requiredMargin = positionValue / leverage;
  const liquidationPrice = price && amount
    ? side === "long"
      ? (parseFloat(price) * (1 - 1 / leverage + 0.004)).toFixed(2)
      : (parseFloat(price) * (1 + 1 / leverage - 0.004)).toFixed(2)
    : "—";

  const handlePctChange = useCallback((v: number[]) => {
    setPct(v);
    if (v[0] > 0 && price) {
      const a = ((availableMargin * leverage * v[0] / 100) / parseFloat(price)).toFixed(4);
      setAmount(a);
    }
  }, [price, leverage]);

  const applyLeverage = () => {
    setLeverage(leverageSlider[0]);
    setShowLeverageModal(false);
  };

  return (
    <div className="flex flex-col bg-background" style={{ height: "calc(100vh - 64px)" }}>
      {/* Top Bar */}
      <div className="border-b border-border bg-secondary/20 px-4 py-2 flex items-center gap-4 overflow-x-auto shrink-0">
        {/* Pair Selector */}
        <div className="relative shrink-0">
          <button
            data-testid="btn-futures-pair-selector"
            onClick={() => setShowPairMenu(v => !v)}
            className="flex items-center gap-2 px-3 py-1.5 bg-secondary border border-border rounded text-sm font-semibold hover:border-primary/50 transition-colors"
          >
            <span className="text-foreground">{selectedPair}</span>
            <span className="text-[10px] text-primary border border-primary/30 rounded px-1">PERP</span>
            <ChevronDown size={13} className="text-muted-foreground" />
          </button>
          {showPairMenu && (
            <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-50 min-w-[180px]">
              {PAIRS.map(p => (
                <button
                  key={p}
                  data-testid={`futures-pair-${p.replace(/\s/g, "-")}`}
                  onClick={() => { setSelectedPair(p); setShowPairMenu(false); }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-secondary transition-colors font-mono flex items-center justify-between ${selectedPair === p ? "text-primary" : "text-foreground"}`}
                >
                  <span>{p.replace(" PERP", "")}</span>
                  <span className="text-[10px] text-primary border border-primary/30 rounded px-1">PERP</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Price */}
        <div className="shrink-0">
          <span
            data-testid="futures-current-price"
            className={`text-xl font-mono font-bold transition-colors duration-300 ${priceUp ? "text-success" : "text-destructive"}`}
          >
            {currentPrice >= 1
              ? currentPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
              : currentPrice.toFixed(4)}
          </span>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-5 overflow-x-auto">
          {[
            { label: "24h Change", value: `${info.change >= 0 ? "+" : ""}${info.change}%`, colored: true, up: info.change >= 0 },
            { label: "Mark Price", value: info.markPrice >= 1 ? info.markPrice.toLocaleString("en-US", { minimumFractionDigits: 2 }) : info.markPrice.toFixed(4), colored: false },
            { label: "Index Price", value: info.indexPrice >= 1 ? info.indexPrice.toLocaleString("en-US", { minimumFractionDigits: 2 }) : info.indexPrice.toFixed(4), colored: false },
            { label: "Funding / Countdown", value: `${info.funding.toFixed(4)}% / ${fundingCountdown}`, colored: false },
            { label: "24h Volume", value: info.volume, colored: false },
            { label: "Open Interest", value: info.openInterest, colored: false },
          ].map(item => (
            <div key={item.label} className="shrink-0 hidden sm:block">
              <div className="text-[10px] text-muted-foreground">{item.label}</div>
              <div className={`text-xs font-mono font-medium ${item.colored ? (item.up ? "text-success" : "text-destructive") : "text-foreground"}`}>
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Grid */}
      <div className="flex-1 grid grid-cols-[1fr_3fr_1.2fr] gap-0 min-h-0 overflow-hidden">
        {/* Order Book */}
        <div className="border-r border-border flex flex-col bg-background overflow-hidden">
          <div className="px-3 py-2 border-b border-border flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">Order Book</span>
          </div>
          <div className="grid grid-cols-3 px-3 py-1.5 border-b border-border">
            {["Price", "Qty", "Total"].map(h => (
              <span key={h} className="text-[10px] text-muted-foreground text-right first:text-left">{h}</span>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="flex flex-col-reverse">
              {orderBook.asks.map((ask, i) => (
                <div key={i} className="relative grid grid-cols-3 px-3 py-[3px] hover:bg-destructive/5 cursor-pointer">
                  <div className="absolute inset-y-0 right-0 bg-destructive/10" style={{ width: `${ask.depth}%` }} />
                  <span className="text-xs font-mono text-destructive relative z-10">{ask.price}</span>
                  <span className="text-xs font-mono text-foreground relative z-10 text-right">{ask.amount}</span>
                  <span className="text-xs font-mono text-muted-foreground relative z-10 text-right">{ask.total}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-secondary/30 border-y border-border">
              <span className={`text-sm font-mono font-bold ${priceUp ? "text-success" : "text-destructive"}`}>
                {currentPrice >= 1
                  ? currentPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                  : currentPrice.toFixed(4)}
              </span>
            </div>
            {orderBook.bids.map((bid, i) => (
              <div key={i} className="relative grid grid-cols-3 px-3 py-[3px] hover:bg-success/5 cursor-pointer">
                <div className="absolute inset-y-0 right-0 bg-success/10" style={{ width: `${bid.depth}%` }} />
                <span className="text-xs font-mono text-success relative z-10">{bid.price}</span>
                <span className="text-xs font-mono text-foreground relative z-10 text-right">{bid.amount}</span>
                <span className="text-xs font-mono text-muted-foreground relative z-10 text-right">{bid.total}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Chart + Bottom */}
        <div className="flex flex-col border-r border-border overflow-hidden">
          {/* Chart Controls */}
          <div className="flex items-center gap-3 px-3 py-2 border-b border-border bg-secondary/10 shrink-0">
            <div className="flex border border-border rounded overflow-hidden text-xs">
              {(["area", "bar"] as const).map(t => (
                <button
                  key={t}
                  data-testid={`futures-chart-type-${t}`}
                  onClick={() => setChartType(t)}
                  className={`px-2.5 py-1 capitalize transition-colors ${chartType === t ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {t === "area" ? "Line" : "Volume"}
                </button>
              ))}
            </div>
            <div className="flex gap-0.5">
              {INTERVALS.map(iv => (
                <button
                  key={iv}
                  data-testid={`futures-interval-${iv}`}
                  onClick={() => setInterval_(iv)}
                  className={`px-2.5 py-1 text-xs rounded transition-colors ${interval === iv ? "bg-primary/20 text-primary font-medium" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {iv}
                </button>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="w-2 h-0.5 bg-primary inline-block" />
                Mark: <span className="text-foreground font-mono">{info.markPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
              </span>
            </div>
          </div>

          {/* Chart */}
          <div className="flex-1 min-h-0 p-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={candles} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                <defs>
                  <linearGradient id="futuresGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#fcd535" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#fcd535" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="dateStr" tick={{ fontSize: 9, fill: "#848e9c" }} tickLine={false} axisLine={false} interval={12} />
                <YAxis
                  domain={["auto", "auto"]}
                  tick={{ fontSize: 9, fill: "#848e9c", fontFamily: "monospace" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={v => `$${(v / 1000).toFixed(1)}k`}
                  width={50}
                  orientation="right"
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={info.markPrice} stroke="#fcd535" strokeWidth={1} strokeDasharray="4 4" />
                <ReferenceLine y={info.indexPrice} stroke="#848e9c" strokeWidth={1} strokeDasharray="4 4" />
                {chartType === "area" ? (
                  <Area
                    type="monotone"
                    dataKey="close"
                    stroke="#fcd535"
                    strokeWidth={1.5}
                    fill="url(#futuresGrad)"
                    dot={false}
                  />
                ) : (
                  <Bar dataKey="volume" fill="#fcd535" opacity={0.4} radius={[2, 2, 0, 0]} />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Bottom Tabs */}
          <div className="border-t border-border shrink-0 max-h-[220px] overflow-auto">
            <Tabs defaultValue="positions">
              <TabsList className="border-b border-border rounded-none bg-transparent h-auto px-2 pt-1 gap-0">
                {[
                  { value: "positions", label: `Positions (${POSITIONS.length})` },
                  { value: "orders", label: `Open Orders (${OPEN_ORDERS.length})` },
                  { value: "history", label: "Order History" },
                  { value: "funding", label: "Funding History" },
                ].map(tab => (
                  <TabsTrigger
                    key={tab.value}
                    data-testid={`futures-tab-${tab.value}`}
                    value={tab.value}
                    className="text-xs px-4 py-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground text-muted-foreground"
                  >
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="positions" className="mt-0">
                <table className="w-full text-xs">
                  <thead className="bg-secondary/30">
                    <tr>
                      {["Symbol", "Size", "Entry Price", "Mark Price", "Liq. Price", "Margin", "PnL (ROE%)", ""].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-muted-foreground font-medium whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {POSITIONS.map((pos, i) => (
                      <tr key={i} data-testid={`position-row-${i}`} className="border-t border-border/50 hover:bg-secondary/20">
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-medium text-foreground">{pos.symbol.replace(" PERP", "")}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${pos.side === "Long" ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"}`}>
                              {pos.side} {pos.leverage}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2 font-mono text-foreground">{pos.size}</td>
                        <td className="px-3 py-2 font-mono">${pos.entryPrice}</td>
                        <td className="px-3 py-2 font-mono">${pos.markPrice}</td>
                        <td className="px-3 py-2 font-mono text-destructive">${pos.liqPrice}</td>
                        <td className="px-3 py-2 font-mono">${pos.margin}</td>
                        <td className={`px-3 py-2 font-mono font-medium ${pos.up ? "text-success" : "text-destructive"}`}>
                          {pos.pnl} USDT ({pos.pnlPct})
                        </td>
                        <td className="px-3 py-2">
                          <button className="text-xs text-primary hover:text-primary/70 transition-colors mr-2">TP/SL</button>
                          <button className="text-xs text-destructive hover:text-destructive/70 transition-colors">Close</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TabsContent>

              <TabsContent value="orders" className="mt-0">
                <table className="w-full text-xs">
                  <thead className="bg-secondary/30">
                    <tr>
                      {["Time", "Symbol", "Type", "Side", "Price", "Amount", "Filled", "Reduce Only", ""].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-muted-foreground font-medium whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {OPEN_ORDERS.map((o, i) => (
                      <tr key={i} data-testid={`futures-order-${i}`} className="border-t border-border/50 hover:bg-secondary/20">
                        <td className="px-3 py-1.5 font-mono text-muted-foreground flex items-center gap-1"><Clock size={10} />{o.time}</td>
                        <td className="px-3 py-1.5 font-mono text-foreground">{o.symbol.replace(" PERP", "")}</td>
                        <td className="px-3 py-1.5">{o.type}</td>
                        <td className={`px-3 py-1.5 font-medium ${o.side === "Buy" ? "text-success" : "text-destructive"}`}>{o.side}</td>
                        <td className="px-3 py-1.5 font-mono">${o.price}</td>
                        <td className="px-3 py-1.5 font-mono">{o.amount}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">{o.filled}</td>
                        <td className="px-3 py-1.5">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${o.reduceOnly ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}>
                            {o.reduceOnly ? "Yes" : "No"}
                          </span>
                        </td>
                        <td className="px-3 py-1.5">
                          <button className="text-destructive hover:text-destructive/70 text-xs transition-colors">Cancel</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TabsContent>

              <TabsContent value="history" className="mt-0">
                <div className="px-4 py-6 text-center text-sm text-muted-foreground">No order history</div>
              </TabsContent>

              <TabsContent value="funding" className="mt-0">
                <table className="w-full text-xs">
                  <thead className="bg-secondary/30">
                    <tr>
                      {["Time", "Funding Rate", "Interval"].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-muted-foreground font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {FUNDING_HISTORY.map((f, i) => (
                      <tr key={i} className="border-t border-border/50 hover:bg-secondary/20">
                        <td className="px-3 py-1.5 font-mono text-muted-foreground">{f.time}</td>
                        <td className="px-3 py-1.5 font-mono text-success">{f.rate}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">{f.interval}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Long/Short Panel */}
        <div className="flex flex-col bg-background overflow-y-auto">
          {/* Long / Short Tabs */}
          <div className="grid grid-cols-2 border-b border-border shrink-0">
            <button
              data-testid="btn-futures-long"
              onClick={() => setSide("long")}
              className={`py-3 text-sm font-bold transition-all ${side === "long" ? "bg-success/10 text-success border-b-2 border-success" : "text-muted-foreground hover:text-success/80"}`}
            >
              Long / Buy
            </button>
            <button
              data-testid="btn-futures-short"
              onClick={() => setSide("short")}
              className={`py-3 text-sm font-bold transition-all ${side === "short" ? "bg-destructive/10 text-destructive border-b-2 border-destructive" : "text-muted-foreground hover:text-destructive/80"}`}
            >
              Short / Sell
            </button>
          </div>

          <div className="p-3 space-y-3">
            {/* Order Type */}
            <div className="flex border border-border rounded overflow-hidden text-xs">
              {(["limit", "market", "stop"] as const).map(t => (
                <button
                  key={t}
                  data-testid={`futures-order-type-${t}`}
                  onClick={() => setOrderType(t)}
                  className={`flex-1 py-1.5 capitalize transition-colors ${orderType === t ? "bg-primary/20 text-primary font-medium" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Leverage Selector */}
            <div className="relative">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                <span>Leverage</span>
                <button
                  data-testid="btn-leverage-selector"
                  onClick={() => setShowLeverageModal(v => !v)}
                  className="flex items-center gap-1 px-2 py-0.5 bg-primary/10 border border-primary/30 rounded text-primary font-mono font-bold hover:bg-primary/20 transition-colors"
                >
                  {leverage}x <ChevronDown size={10} />
                </button>
              </div>

              {showLeverageModal && (
                <div className="absolute top-8 right-0 z-50 bg-card border border-border rounded-lg p-4 w-56 shadow-xl">
                  <div className="text-xs font-semibold text-foreground mb-3">Adjust Leverage</div>
                  <div className="text-center font-mono text-2xl font-bold text-primary mb-3">{leverageSlider[0]}x</div>
                  <Slider
                    value={leverageSlider}
                    onValueChange={setLeverageSlider}
                    min={1}
                    max={125}
                    step={1}
                    className="mb-3"
                  />
                  <div className="flex flex-wrap gap-1 mb-3">
                    {LEVERAGE_OPTIONS.map(l => (
                      <button
                        key={l}
                        onClick={() => setLeverageSlider([l])}
                        className={`px-2 py-1 text-xs rounded border transition-colors ${leverageSlider[0] === l ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground hover:border-primary/50 hover:text-primary"}`}
                      >
                        {l}x
                      </button>
                    ))}
                  </div>
                  <div className="text-[10px] text-muted-foreground mb-3 flex items-start gap-1">
                    <Info size={10} className="shrink-0 mt-0.5" />
                    Maximum position at current leverage: {(availableMargin * leverageSlider[0]).toLocaleString()} USDT
                  </div>
                  <Button onClick={applyLeverage} data-testid="btn-confirm-leverage" className="w-full bg-primary text-primary-foreground h-8 text-xs font-semibold">
                    Confirm
                  </Button>
                </div>
              )}
            </div>

            {/* Available Margin */}
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Available Margin</span>
              <span className="font-mono text-foreground">{availableMargin.toFixed(2)} USDT</span>
            </div>

            {/* Price */}
            {orderType !== "market" && (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Price (USDT)</label>
                <Input
                  data-testid="futures-input-price"
                  type="number"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  className="font-mono text-sm bg-secondary border-border focus-visible:ring-primary h-9"
                />
              </div>
            )}

            {/* Amount */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Amount ({selectedPair.split("USDT")[0]})</label>
              <Input
                data-testid="futures-input-amount"
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.0000"
                className="font-mono text-sm bg-secondary border-border focus-visible:ring-primary h-9"
              />
            </div>

            {/* Percentage Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Size</span>
                <span className="text-primary font-medium">{pct[0]}%</span>
              </div>
              <Slider
                data-testid="futures-slider-pct"
                value={pct}
                onValueChange={handlePctChange}
                max={100}
                step={25}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                {[0, 25, 50, 75, 100].map(v => (
                  <button key={v} onClick={() => handlePctChange([v])} className={`hover:text-primary ${pct[0] === v ? "text-primary" : ""}`}>
                    {v}%
                  </button>
                ))}
              </div>
            </div>

            {/* Position Info */}
            <div className="space-y-1.5 bg-secondary/40 rounded p-2.5 border border-border">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Position Value</span>
                <span className="font-mono text-foreground">{positionValue.toFixed(2)} USDT</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Required Margin</span>
                <span className="font-mono text-foreground">{requiredMargin.toFixed(2)} USDT</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Est. Liq. Price</span>
                <span className="font-mono text-destructive">{liquidationPrice}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Max Position</span>
                <span className="font-mono text-foreground">{(availableMargin * leverage).toLocaleString()} USDT</span>
              </div>
            </div>

            {/* TP/SL Toggles */}
            <div className="flex gap-2">
              <button className="flex-1 text-xs border border-border rounded py-1.5 text-muted-foreground hover:border-success/50 hover:text-success transition-colors font-medium">
                + TP
              </button>
              <button className="flex-1 text-xs border border-border rounded py-1.5 text-muted-foreground hover:border-destructive/50 hover:text-destructive transition-colors font-medium">
                + SL
              </button>
            </div>

            {/* Submit */}
            <Button
              data-testid={`futures-btn-${side}`}
              className={`w-full font-bold h-11 text-sm tracking-wide transition-all ${
                side === "long"
                  ? "bg-success text-white hover:bg-success/90"
                  : "bg-destructive text-white hover:bg-destructive/90"
              }`}
            >
              {side === "long" ? (
                <span className="flex items-center gap-2"><TrendingUp size={15} /> Long / Buy {leverage}x</span>
              ) : (
                <span className="flex items-center gap-2"><TrendingDown size={15} /> Short / Sell {leverage}x</span>
              )}
            </Button>

            {/* Fees */}
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Maker / Taker</span>
              <span className="font-mono">0.02% / 0.05%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
