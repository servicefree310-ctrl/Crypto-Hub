import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronDown, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ComposedChart, Bar
} from "recharts";
import { generateMockCandles, generateOrderBook } from "@/lib/mock-data";

const PAIRS = ["BTC/USDT", "ETH/USDT", "BNB/USDT", "SOL/USDT", "ADA/USDT"];
const INTERVALS = ["1m", "5m", "15m", "1H", "4H", "1D"];

const PAIR_INFO: Record<string, { price: number; change: number; high: number; low: number; volume: string }> = {
  "BTC/USDT": { price: 64250.50, change: 2.5, high: 65480, low: 62950, volume: "32.5B" },
  "ETH/USDT": { price: 3180.20, change: -1.2, high: 3280, low: 3100, volume: "15.2B" },
  "BNB/USDT": { price: 580.40, change: 5.4, high: 610, low: 555, volume: "2.1B" },
  "SOL/USDT": { price: 142.60, change: 8.2, high: 155, low: 132, volume: "4.5B" },
  "ADA/USDT": { price: 0.4512, change: -0.5, high: 0.47, low: 0.43, volume: "350M" },
};

const OPEN_ORDERS = [
  { id: "1", pair: "BTC/USDT", type: "Limit", side: "Buy", price: "63,500.00", amount: "0.05", filled: "0%", total: "3,175.00", time: "14:32:10" },
  { id: "2", pair: "ETH/USDT", type: "Limit", side: "Sell", price: "3,250.00", amount: "1.2", filled: "0%", total: "3,900.00", time: "13:15:44" },
];

const TRADE_HISTORY = [
  { time: "14:35:02", price: "64,251.20", amount: "0.012", side: "Buy" },
  { time: "14:34:58", price: "64,248.80", amount: "0.085", side: "Sell" },
  { time: "14:34:51", price: "64,255.00", amount: "0.031", side: "Buy" },
  { time: "14:34:47", price: "64,252.50", amount: "0.044", side: "Sell" },
  { time: "14:34:40", price: "64,249.70", amount: "0.092", side: "Buy" },
  { time: "14:34:35", price: "64,246.30", amount: "0.015", side: "Sell" },
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

export default function Trade() {
  const [selectedPair, setSelectedPair] = useState("BTC/USDT");
  const [showPairMenu, setShowPairMenu] = useState(false);
  const [interval, setInterval_] = useState("1H");
  const [chartType, setChartType] = useState<"area" | "bar">("area");
  const [candles, setCandles] = useState(() => generateMockCandles(80));
  const [orderBook, setOrderBook] = useState(() => generateOrderBook());
  const [orderSide, setOrderSide] = useState<"buy" | "sell">("buy");
  const [orderType, setOrderType] = useState<"limit" | "market" | "stop">("limit");
  const [price, setPrice] = useState("64250.50");
  const [amount, setAmount] = useState("");
  const [pct, setPct] = useState([0]);
  const [currentPrice, setCurrentPrice] = useState(PAIR_INFO[selectedPair].price);
  const prevPriceRef = useRef(currentPrice);

  const info = PAIR_INFO[selectedPair];

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
  const availableBalance = 5847.32;
  const total = price && amount ? (parseFloat(price) * parseFloat(amount)).toFixed(2) : "0.00";

  const handlePctChange = useCallback((v: number[]) => {
    setPct(v);
    if (v[0] > 0 && orderType !== "market" && price) {
      const a = ((availableBalance * v[0] / 100) / parseFloat(price)).toFixed(6);
      setAmount(a);
    }
  }, [price, orderType]);

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-background overflow-hidden">
      {/* Pair Selector Bar */}
      <div className="border-b border-border bg-secondary/20 px-4 py-2 flex items-center gap-6 overflow-x-auto shrink-0">
        <div className="relative shrink-0">
          <button
            data-testid="btn-pair-selector"
            onClick={() => setShowPairMenu(v => !v)}
            className="flex items-center gap-2 px-3 py-1.5 bg-secondary border border-border rounded text-sm font-semibold hover:border-primary/50 transition-colors"
          >
            <span className="text-foreground">{selectedPair}</span>
            <ChevronDown size={14} className="text-muted-foreground" />
          </button>
          {showPairMenu && (
            <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-50 min-w-[160px]">
              {PAIRS.map(p => (
                <button
                  key={p}
                  data-testid={`pair-option-${p.replace("/", "-")}`}
                  onClick={() => { setSelectedPair(p); setShowPairMenu(false); }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-secondary transition-colors font-mono ${selectedPair === p ? "text-primary" : "text-foreground"}`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <span
            data-testid="current-price"
            className={`text-xl font-mono font-bold transition-colors duration-300 ${priceUp ? "text-success" : "text-destructive"}`}
          >
            ${currentPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        {[
          { label: "24h Change", value: `${info.change >= 0 ? "+" : ""}${info.change}%`, colored: true, up: info.change >= 0 },
          { label: "24h High", value: `$${info.high.toLocaleString()}`, colored: false },
          { label: "24h Low", value: `$${info.low.toLocaleString()}`, colored: false },
          { label: "24h Volume", value: info.volume, colored: false },
        ].map(item => (
          <div key={item.label} className="shrink-0 hidden sm:block">
            <div className="text-xs text-muted-foreground">{item.label}</div>
            <div className={`text-xs font-mono font-medium ${item.colored ? (item.up ? "text-success" : "text-destructive") : "text-foreground"}`}>
              {item.value}
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="flex-1 grid grid-cols-[1fr_3fr_1.2fr] gap-0 min-h-0 overflow-hidden">
        {/* Order Book */}
        <div className="border-r border-border flex flex-col bg-background overflow-hidden">
          <div className="px-3 py-2 border-b border-border">
            <span className="text-xs font-semibold text-foreground">Order Book</span>
          </div>

          <div className="grid grid-cols-3 px-3 py-1.5 border-b border-border">
            {["Price(USDT)", "Amount", "Total"].map(h => (
              <span key={h} className="text-[10px] text-muted-foreground text-right first:text-left">{h}</span>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Asks */}
            <div className="flex flex-col-reverse">
              {orderBook.asks.map((ask, i) => (
                <div key={i} data-testid={`ask-row-${i}`} className="relative grid grid-cols-3 px-3 py-[3px] hover:bg-destructive/5 cursor-pointer">
                  <div className="absolute inset-y-0 right-0 bg-destructive/10" style={{ width: `${ask.depth}%` }} />
                  <span className="text-xs font-mono text-destructive relative z-10">{ask.price}</span>
                  <span className="text-xs font-mono text-foreground relative z-10 text-right">{ask.amount}</span>
                  <span className="text-xs font-mono text-muted-foreground relative z-10 text-right">{ask.total}</span>
                </div>
              ))}
            </div>

            {/* Spread */}
            <div className="flex items-center gap-2 px-3 py-2 bg-secondary/30 border-y border-border">
              <span className={`text-sm font-mono font-bold ${priceUp ? "text-success" : "text-destructive"}`}>
                {currentPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-muted-foreground">Spread: $2.10</span>
            </div>

            {/* Bids */}
            {orderBook.bids.map((bid, i) => (
              <div key={i} data-testid={`bid-row-${i}`} className="relative grid grid-cols-3 px-3 py-[3px] hover:bg-success/5 cursor-pointer">
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
                  data-testid={`chart-type-${t}`}
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
                  data-testid={`interval-${iv}`}
                  onClick={() => setInterval_(iv)}
                  className={`px-2.5 py-1 text-xs rounded transition-colors ${interval === iv ? "bg-primary/20 text-primary font-medium" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {iv}
                </button>
              ))}
            </div>
          </div>

          {/* Chart */}
          <div className="flex-1 min-h-0 p-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={candles} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                <defs>
                  <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
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
                {chartType === "area" ? (
                  <Area
                    type="monotone"
                    dataKey="close"
                    stroke="#fcd535"
                    strokeWidth={1.5}
                    fill="url(#priceGrad)"
                    dot={false}
                  />
                ) : (
                  <Bar dataKey="volume" fill="#fcd535" opacity={0.4} radius={[2, 2, 0, 0]} />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Bottom Tabs */}
          <div className="border-t border-border shrink-0 max-h-[200px] overflow-auto">
            <Tabs defaultValue="open">
              <TabsList className="border-b border-border rounded-none bg-transparent h-auto px-2 pt-1 gap-0">
                <TabsTrigger data-testid="tab-open-orders" value="open" className="text-xs px-4 py-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground text-muted-foreground">
                  Open Orders ({OPEN_ORDERS.length})
                </TabsTrigger>
                <TabsTrigger data-testid="tab-order-history" value="history" className="text-xs px-4 py-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground text-muted-foreground">
                  Order History
                </TabsTrigger>
                <TabsTrigger data-testid="tab-trade-history" value="trades" className="text-xs px-4 py-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground text-muted-foreground">
                  Trade History
                </TabsTrigger>
              </TabsList>
              <TabsContent value="open" className="mt-0">
                <table className="w-full text-xs">
                  <thead className="bg-secondary/30">
                    <tr>
                      {["Date", "Pair", "Type", "Side", "Price", "Amount", "Filled", "Total", ""].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-muted-foreground font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {OPEN_ORDERS.map(o => (
                      <tr key={o.id} data-testid={`open-order-${o.id}`} className="border-t border-border/50 hover:bg-secondary/20">
                        <td className="px-3 py-2 font-mono text-muted-foreground flex items-center gap-1"><Clock size={10} />{o.time}</td>
                        <td className="px-3 py-2 font-mono">{o.pair}</td>
                        <td className="px-3 py-2">{o.type}</td>
                        <td className={`px-3 py-2 font-medium ${o.side === "Buy" ? "text-success" : "text-destructive"}`}>{o.side}</td>
                        <td className="px-3 py-2 font-mono">${o.price}</td>
                        <td className="px-3 py-2 font-mono">{o.amount}</td>
                        <td className="px-3 py-2 text-muted-foreground">{o.filled}</td>
                        <td className="px-3 py-2 font-mono">${o.total}</td>
                        <td className="px-3 py-2">
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
              <TabsContent value="trades" className="mt-0">
                <table className="w-full text-xs">
                  <thead className="bg-secondary/30">
                    <tr>
                      {["Time", "Price", "Amount", "Side"].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-muted-foreground font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {TRADE_HISTORY.map((t, i) => (
                      <tr key={i} data-testid={`trade-row-${i}`} className="border-t border-border/50">
                        <td className="px-3 py-1.5 font-mono text-muted-foreground">{t.time}</td>
                        <td className={`px-3 py-1.5 font-mono ${t.side === "Buy" ? "text-success" : "text-destructive"}`}>${t.price}</td>
                        <td className="px-3 py-1.5 font-mono">{t.amount}</td>
                        <td className={`px-3 py-1.5 font-medium text-xs ${t.side === "Buy" ? "text-success" : "text-destructive"}`}>{t.side}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Buy/Sell Panel */}
        <div className="flex flex-col bg-background overflow-y-auto">
          <Tabs defaultValue="buy" onValueChange={v => setOrderSide(v as "buy" | "sell")}>
            <TabsList className="w-full rounded-none bg-transparent border-b border-border h-auto p-0">
              <TabsTrigger
                data-testid="tab-buy"
                value="buy"
                className="flex-1 rounded-none py-3 text-sm font-semibold border-b-2 border-transparent data-[state=active]:border-success data-[state=active]:bg-success/10 data-[state=active]:text-success text-muted-foreground transition-all"
              >
                Buy
              </TabsTrigger>
              <TabsTrigger
                data-testid="tab-sell"
                value="sell"
                className="flex-1 rounded-none py-3 text-sm font-semibold border-b-2 border-transparent data-[state=active]:border-destructive data-[state=active]:bg-destructive/10 data-[state=active]:text-destructive text-muted-foreground transition-all"
              >
                Sell
              </TabsTrigger>
            </TabsList>

            {(["buy", "sell"] as const).map(side => (
              <TabsContent key={side} value={side} className="mt-0 p-3 space-y-3">
                {/* Order Type */}
                <div className="flex border border-border rounded overflow-hidden text-xs">
                  {(["limit", "market", "stop"] as const).map(t => (
                    <button
                      key={t}
                      data-testid={`order-type-${t}`}
                      onClick={() => setOrderType(t)}
                      className={`flex-1 py-1.5 capitalize transition-colors ${orderType === t ? "bg-primary/20 text-primary font-medium" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                {/* Available */}
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Available</span>
                  <span className="font-mono text-foreground">
                    {side === "buy"
                      ? `${availableBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })} USDT`
                      : "0.0854 BTC"}
                  </span>
                </div>

                {/* Price Input */}
                {orderType !== "market" && (
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Price (USDT)</label>
                    <Input
                      data-testid="input-price"
                      type="number"
                      value={price}
                      onChange={e => setPrice(e.target.value)}
                      className="font-mono text-sm bg-secondary border-border focus-visible:ring-primary h-9"
                    />
                  </div>
                )}

                {/* Amount Input */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Amount ({selectedPair.split("/")[0]})</label>
                  <Input
                    data-testid="input-amount"
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="font-mono text-sm bg-secondary border-border focus-visible:ring-primary h-9"
                  />
                </div>

                {/* Percentage Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Percentage</span>
                    <span className="text-primary font-medium">{pct[0]}%</span>
                  </div>
                  <Slider
                    data-testid="slider-amount-pct"
                    value={pct}
                    onValueChange={handlePctChange}
                    max={100}
                    step={25}
                    className="cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    {[0, 25, 50, 75, 100].map(v => (
                      <button
                        key={v}
                        onClick={() => handlePctChange([v])}
                        className={`hover:text-primary transition-colors ${pct[0] === v ? "text-primary" : ""}`}
                      >
                        {v}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* Total */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Total (USDT)</label>
                  <div className="bg-secondary border border-border rounded px-3 py-2 text-sm font-mono text-foreground h-9 flex items-center">
                    {total}
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  data-testid={`btn-${side}-submit`}
                  className={`w-full font-semibold h-10 text-sm transition-all ${
                    side === "buy"
                      ? "bg-success text-white hover:bg-success/90"
                      : "bg-destructive text-white hover:bg-destructive/90"
                  }`}
                >
                  {side === "buy" ? "Buy" : "Sell"} {selectedPair.split("/")[0]}
                </Button>

                {/* Fee Info */}
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Maker / Taker Fee</span>
                  <span>0.1% / 0.1%</span>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>
    </div>
  );
}
