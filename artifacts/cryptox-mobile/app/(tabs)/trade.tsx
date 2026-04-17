import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Platform, Modal, Animated
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

interface Candle { open: number; high: number; low: number; close: number; vol: number; time: string }
interface OrderEntry { price: string; amount: string; total: string; depth: number }
interface Trade { id: string; price: string; amount: string; time: string; up: boolean }

const PAIRS = ["BTC/USDT","ETH/USDT","BNB/USDT","SOL/USDT","ADA/USDT","XRP/USDT","DOGE/USDT"];
const INTERVALS = ["1m","5m","15m","30m","1H","4H","1D","1W"];
const PAIR_BASE: Record<string, number> = {
  "BTC/USDT":64250,"ETH/USDT":3180,"BNB/USDT":580,"SOL/USDT":142,
  "ADA/USDT":0.45,"XRP/USDT":0.59,"DOGE/USDT":0.168
};
const PAIR_CHANGE: Record<string, number> = {
  "BTC/USDT":2.5,"ETH/USDT":-1.2,"BNB/USDT":5.4,"SOL/USDT":8.2,
  "ADA/USDT":-0.5,"XRP/USDT":1.8,"DOGE/USDT":3.1
};

function genCandles(base: number, n = 50): Candle[] {
  const out: Candle[] = [];
  let p = base * 0.96;
  const now = Date.now();
  for (let i = 0; i < n; i++) {
    const open = p;
    const move = (Math.random() - 0.47) * base * 0.014;
    const close = Math.max(base * 0.5, open + move);
    const high = Math.max(open, close) + Math.random() * base * 0.004;
    const low  = Math.min(open, close) - Math.random() * base * 0.004;
    const vol = Math.random() * 120 + 8;
    const d = new Date(now - (n - i) * 3600000);
    out.push({ open, high, low, close, vol, time: `${d.getHours()}:00` });
    p = close;
  }
  return out;
}

function genOrderBook(base: number) {
  const asks: OrderEntry[] = Array.from({ length: 10 }, (_, i) => {
    const price = base + (10 - i) * base * 0.00018;
    const amount = Math.random() * 3 + 0.05;
    return {
      price: price.toFixed(base < 1 ? 5 : 2),
      amount: amount.toFixed(base < 1 ? 0 : 4),
      total: (price * amount).toFixed(2),
      depth: Math.random() * 80 + 10,
    };
  });
  const bids: OrderEntry[] = Array.from({ length: 10 }, (_, i) => {
    const price = base - i * base * 0.00018;
    const amount = Math.random() * 3 + 0.05;
    return {
      price: price.toFixed(base < 1 ? 5 : 2),
      amount: amount.toFixed(base < 1 ? 0 : 4),
      total: (price * amount).toFixed(2),
      depth: Math.random() * 80 + 10,
    };
  });
  return { asks, bids };
}

function genTrades(base: number): Trade[] {
  const now = Date.now();
  return Array.from({ length: 20 }, (_, i) => {
    const price = base * (1 + (Math.random() - 0.5) * 0.003);
    const up = Math.random() > 0.45;
    const d = new Date(now - i * 4000);
    return {
      id: `t${i}`,
      price: price.toFixed(base < 1 ? 5 : 2),
      amount: (Math.random() * 0.8 + 0.01).toFixed(4),
      time: `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}:${String(d.getSeconds()).padStart(2,"0")}`,
      up,
    };
  });
}

function CandleChart({ candles, width, height, showMA, showBB }: {
  candles: Candle[]; width: number; height: number; showMA: boolean; showBB: boolean;
}) {
  if (!candles.length || !width) return null;
  const volH = 36;
  const chartH = height - volH - 4;
  const prices = candles.flatMap(c => [c.high, c.low]);
  const minP = Math.min(...prices), maxP = Math.max(...prices);
  const range = maxP - minP || 1;
  const vols = candles.map(c => c.vol);
  const maxVol = Math.max(...vols);
  const candleW = Math.max(3, (width / candles.length) - 1.5);
  const py = (v: number) => ((maxP - v) / range) * chartH;
  const slot = width / candles.length;

  // Simple 20-period MA
  const ma: number[] = candles.map((_, i) => {
    if (i < 19) return -1;
    const slice = candles.slice(i - 19, i + 1).map(c => (c.open + c.close) / 2);
    return slice.reduce((s, v) => s + v, 0) / 20;
  });

  // Simple Bollinger upper/lower (20-period, 2σ)
  const bb = candles.map((_, i) => {
    if (i < 19) return { upper: -1, lower: -1 };
    const slice = candles.slice(i - 19, i + 1).map(c => (c.open + c.close) / 2);
    const mean = slice.reduce((s, v) => s + v, 0) / 20;
    const std = Math.sqrt(slice.reduce((s, v) => s + (v - mean) ** 2, 0) / 20);
    return { upper: mean + 2 * std, lower: mean - 2 * std };
  });

  return (
    <View style={{ width, overflow: "hidden" }}>
      <View style={{ width, height: chartH, overflow: "hidden" }}>
        {/* Y-grid lines */}
        {[0,1,2,3,4].map(i => (
          <View key={`g${i}`} style={{
            position: "absolute", left: 0, right: 0,
            top: (i / 4) * chartH, height: 1, backgroundColor: "#2b2f3622",
          }} />
        ))}
        {/* Candles */}
        {candles.map((c, i) => {
          const x = i * slot + (slot - candleW) / 2;
          const isGreen = c.close >= c.open;
          const color = isGreen ? "#0ecb81" : "#f6465d";
          const bodyTop = py(Math.max(c.open, c.close));
          const bodyH = Math.max(1.5, Math.abs(py(c.open) - py(c.close)));
          const wickTop = py(c.high);
          const wickH = Math.max(1, Math.abs(py(c.high) - py(c.low)));
          return (
            <View key={i} pointerEvents="none">
              <View style={{ position:"absolute", left: x + candleW/2 - 0.5, top: wickTop, width: 1, height: wickH, backgroundColor: color, opacity: 0.8 }} />
              <View style={{ position:"absolute", left: x, top: bodyTop, width: candleW, height: bodyH, backgroundColor: color, borderRadius: 1 }} />
            </View>
          );
        })}
        {/* MA line */}
        {showMA && ma.slice(0,-1).map((v, i) => {
          if (v < 0 || ma[i+1] < 0) return null;
          const x1 = i * slot + slot/2, y1 = py(v);
          const x2 = (i+1)*slot + slot/2, y2 = py(ma[i+1]);
          const len = Math.sqrt((x2-x1)**2+(y2-y1)**2);
          const angle = Math.atan2(y2-y1, x2-x1) * (180/Math.PI);
          return (
            <View key={`ma${i}`} style={{
              position:"absolute", left: x1, top: y1, width: len, height: 1.5,
              backgroundColor: "#fcd535", opacity: 0.8,
              transform:[{rotate:`${angle}deg`}], transformOrigin:"0 50%",
            } as any} pointerEvents="none" />
          );
        })}
        {/* Bollinger bands */}
        {showBB && bb.slice(0,-1).map((b, i) => {
          if (b.upper < 0) return null;
          const nb = bb[i+1];
          const x1 = i*slot+slot/2, x2 = (i+1)*slot+slot/2;
          const renderLine = (y1: number, y2: number, color: string, key: string) => {
            const len = Math.sqrt((x2-x1)**2+(y2-y1)**2);
            const angle = Math.atan2(y2-y1, x2-x1) * (180/Math.PI);
            return (
              <View key={key} style={{
                position:"absolute", left: x1, top: y1, width: len, height: 1,
                backgroundColor: color, opacity: 0.5,
                transform:[{rotate:`${angle}deg`}], transformOrigin:"0 50%",
              } as any} pointerEvents="none" />
            );
          };
          return [
            renderLine(py(b.upper), py(nb.upper), "#627EEA", `bbu${i}`),
            renderLine(py(b.lower), py(nb.lower), "#627EEA", `bbl${i}`),
          ];
        })}
      </View>
      {/* Volume bars */}
      <View style={{ width, height: volH, flexDirection: "row", alignItems: "flex-end", marginTop: 4 }}>
        {candles.map((c, i) => {
          const isGreen = c.close >= c.open;
          const barH = Math.max(2, (c.vol / maxVol) * (volH - 4));
          return (
            <View key={i} style={{
              width: Math.max(2, candleW), marginHorizontal: (slot - candleW) / 2,
              height: barH, backgroundColor: isGreen ? "#0ecb8140" : "#f6465d40",
              borderTopLeftRadius: 1, borderTopRightRadius: 1,
            }} />
          );
        })}
      </View>
    </View>
  );
}

const BOTTOM_TABS = ["Open Orders","Order History","Trade History","Funds"] as const;
type BottomTab = typeof BOTTOM_TABS[number];

export default function TradeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [pair, setPair] = useState("BTC/USDT");
  const [showPairModal, setShowPairModal] = useState(false);
  const [interval_, setInterval_] = useState("1H");
  const [candles, setCandles] = useState<Candle[]>(() => genCandles(64250));
  const [orderBook, setOrderBook] = useState(() => genOrderBook(64250));
  const [trades, setTrades] = useState<Trade[]>(() => genTrades(64250));
  const [currentPrice, setCurrentPrice] = useState(64250.50);
  const prevPrice = useRef(64250.50);
  const [side, setSide] = useState<"buy"|"sell">("buy");
  const [orderType, setOrderType] = useState<"limit"|"market"|"stop-limit"|"oco">("limit");
  const [tif, setTif] = useState<"GTC"|"IOC"|"FOK">("GTC");
  const [postOnly, setPostOnly] = useState(false);
  const [price, setPrice] = useState("64250.50");
  const [stopPrice, setStopPrice] = useState("");
  const [tpPrice, setTpPrice] = useState("");
  const [slPrice, setSlPrice] = useState("");
  const [amount, setAmount] = useState("");
  const [pct, setPct] = useState(0);
  const [chartWidth, setChartWidth] = useState(0);
  const [showOB, setShowOB] = useState(true);
  const [showRecentTrades, setShowRecentTrades] = useState(false);
  const [showMA, setShowMA] = useState(true);
  const [showBB, setShowBB] = useState(false);
  const [showTpSl, setShowTpSl] = useState(false);
  const [activeBottomTab, setActiveBottomTab] = useState<BottomTab>("Open Orders");
  const [showTifModal, setShowTifModal] = useState(false);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;
  const base = pair.split("/")[0];
  const basePrice = PAIR_BASE[pair] || 64250;
  const change24h = PAIR_CHANGE[pair] || 0;
  const fmtP = (v: number) => v >= 1 ? v.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}) : v.toFixed(5);
  const total = price && amount ? (parseFloat(price||"0")*parseFloat(amount||"0")).toFixed(2) : "0.00";
  const priceUp = currentPrice >= prevPrice.current;

  useEffect(() => {
    setCurrentPrice(basePrice);
    setPrice(basePrice.toFixed(2));
    setCandles(genCandles(basePrice));
    setOrderBook(genOrderBook(basePrice));
    setTrades(genTrades(basePrice));
  }, [pair]);

  useEffect(() => {
    const iv = setInterval(() => {
      const next = currentPrice * (1 + (Math.random() - 0.499) * 0.0008);
      prevPrice.current = currentPrice;
      setCurrentPrice(next);
      setOrderBook(genOrderBook(next));
      setTrades(prev => {
        const t = genTrades(next);
        return [t[0], ...prev.slice(0, 19)];
      });
    }, 1200);
    return () => clearInterval(iv);
  }, [currentPrice]);

  const handlePct = useCallback((p: number) => {
    setPct(p);
    const balance = side === "buy" ? 5847.32 : 0.0854;
    const pr = parseFloat(price||"1") || 1;
    setAmount(side === "buy" ? ((balance*p/100)/pr).toFixed(6) : (balance*p/100).toFixed(6));
  }, [price, side]);

  const obRows = showOB ? 8 : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 6, borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <TouchableOpacity testID="btn-pair-selector" onPress={() => setShowPairModal(true)} style={styles.pairBtn}>
          <Text style={[styles.pairText, { color: colors.foreground }]}>{pair}</Text>
          <Feather name="chevron-down" size={13} color={colors.mutedForeground} />
        </TouchableOpacity>
        <View style={styles.priceBlock}>
          <Text style={[styles.mainPrice, { color: priceUp ? colors.success : colors.destructive }]}>{fmtP(currentPrice)}</Text>
          <Text style={[styles.priceChange, { color: change24h >= 0 ? colors.success : colors.destructive }]}>
            {change24h >= 0 ? "+" : ""}{change24h}% 24h
          </Text>
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity onPress={() => setShowRecentTrades(v => !v)} style={[styles.smallBtn, { backgroundColor: showRecentTrades ? colors.primary + "22" : colors.secondary }]}>
            <Feather name="list" size={14} color={showRecentTrades ? colors.primary : colors.mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowOB(v => !v)} style={[styles.smallBtn, { backgroundColor: showOB ? colors.primary + "22" : colors.secondary }]}>
            <Feather name="sidebar" size={14} color={showOB ? colors.primary : colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 24H Stats */}
      <View style={[styles.statsBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {[
          { l:"24H High", v: fmtP(basePrice*1.015), c: colors.success },
          { l:"24H Low",  v: fmtP(basePrice*0.978), c: colors.destructive },
          { l:"24H Vol",  v: `${basePrice > 1000 ? "32.5B" : basePrice > 100 ? "4.5B" : "2.1B"}`, c: colors.foreground },
          { l:"USDT Vol", v: "2.08B", c: colors.foreground },
        ].map(s => (
          <View key={s.l} style={styles.statItem}>
            <Text style={[styles.statL, { color: colors.mutedForeground }]}>{s.l}</Text>
            <Text style={[styles.statV, { color: s.c }]}>{s.v}</Text>
          </View>
        ))}
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? bottomPad + 84 : 90 }}>

        {/* Interval + Indicators */}
        <View style={[styles.intervalRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 2 }}>
            {INTERVALS.map(iv => (
              <TouchableOpacity key={iv} onPress={() => { setInterval_(iv); setCandles(genCandles(basePrice)); }}>
                <Text style={[styles.intervalTab, { color: interval_ === iv ? colors.primary : colors.mutedForeground, borderBottomColor: interval_ === iv ? colors.primary : "transparent" }]}>{iv}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={styles.indicatorRow}>
            <TouchableOpacity onPress={() => setShowMA(v => !v)}
              style={[styles.indBtn, { backgroundColor: showMA ? "#fcd53520" : colors.secondary, borderColor: showMA ? "#fcd535" : colors.border }]}>
              <Text style={[styles.indText, { color: showMA ? "#fcd535" : colors.mutedForeground }]}>MA</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowBB(v => !v)}
              style={[styles.indBtn, { backgroundColor: showBB ? "#627EEA20" : colors.secondary, borderColor: showBB ? "#627EEA" : colors.border }]}>
              <Text style={[styles.indText, { color: showBB ? "#627EEA" : colors.mutedForeground }]}>BB</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Chart */}
        <View style={[styles.chartWrap, { backgroundColor: colors.card }]}
          onLayout={e => setChartWidth(e.nativeEvent.layout.width - 8)}>
          <CandleChart candles={candles} width={chartWidth} height={210} showMA={showMA} showBB={showBB} />
          {/* Y-axis price labels */}
          {chartWidth > 0 && candles.length > 0 && (
            <View style={[StyleSheet.absoluteFill, { right: 0, width: 42, justifyContent:"space-between", paddingVertical: 2 }]} pointerEvents="none">
              {[0,1,2,3,4].map(i => {
                const ps = candles.flatMap(c => [c.high, c.low]);
                const mn = Math.min(...ps), mx = Math.max(...ps);
                const v = mx - (i/4)*(mx-mn);
                return <Text key={i} style={[styles.yLabel,{color:colors.mutedForeground,textAlign:"right"}]}>
                  {v>=1000?`${(v/1000).toFixed(1)}k`:v.toFixed(basePrice<1?4:1)}
                </Text>;
              })}
            </View>
          )}
        </View>

        {/* Order book + Trades + Form */}
        <View style={styles.mainRow}>
          {/* Left: Order Book or Recent Trades */}
          {(showOB || showRecentTrades) && (
            <View style={[styles.leftPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {/* Header tabs */}
              <View style={styles.obTabRow}>
                {showOB && (
                  <TouchableOpacity onPress={() => setShowRecentTrades(false)}
                    style={[styles.obTab, { borderBottomColor: !showRecentTrades ? colors.primary : "transparent" }]}>
                    <Text style={[styles.obTabText, { color: !showRecentTrades ? colors.primary : colors.mutedForeground }]}>OB</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setShowRecentTrades(true)}
                  style={[styles.obTab, { borderBottomColor: showRecentTrades ? colors.primary : "transparent" }]}>
                  <Text style={[styles.obTabText, { color: showRecentTrades ? colors.primary : colors.mutedForeground }]}>Trades</Text>
                </TouchableOpacity>
              </View>

              {!showRecentTrades ? (
                <>
                  {/* OB column headers */}
                  <View style={styles.obColRow}>
                    <Text style={[styles.obColText, { color: colors.mutedForeground }]}>Price</Text>
                    <Text style={[styles.obColText, { color: colors.mutedForeground, textAlign:"right" }]}>Qty</Text>
                  </View>
                  {[...orderBook.asks].reverse().slice(0, obRows).map((a, i) => (
                    <View key={`ask${i}`} style={styles.obRow}>
                      <View style={[styles.obBar, { right: 0, backgroundColor: "#f6465d0e", width: `${a.depth * 0.7}%` as any }]} />
                      <Text style={[styles.obPrice, { color: colors.destructive }]}>{a.price}</Text>
                      <Text style={[styles.obAmt, { color: colors.mutedForeground }]}>{a.amount}</Text>
                    </View>
                  ))}
                  <View style={[styles.spreadRow, { backgroundColor: colors.secondary }]}>
                    <Text style={[styles.spreadP, { color: priceUp ? colors.success : colors.destructive }]}>{fmtP(currentPrice)}</Text>
                    <Feather name={priceUp ? "arrow-up" : "arrow-down"} size={9} color={priceUp ? colors.success : colors.destructive} />
                  </View>
                  {orderBook.bids.slice(0, obRows).map((b, i) => (
                    <View key={`bid${i}`} style={styles.obRow}>
                      <View style={[styles.obBar, { right: 0, backgroundColor: "#0ecb810e", width: `${b.depth * 0.7}%` as any }]} />
                      <Text style={[styles.obPrice, { color: colors.success }]}>{b.price}</Text>
                      <Text style={[styles.obAmt, { color: colors.mutedForeground }]}>{b.amount}</Text>
                    </View>
                  ))}
                </>
              ) : (
                <>
                  <View style={styles.obColRow}>
                    <Text style={[styles.obColText, { color: colors.mutedForeground }]}>Price</Text>
                    <Text style={[styles.obColText, { color: colors.mutedForeground, textAlign:"right" }]}>Amt</Text>
                  </View>
                  {trades.slice(0, 18).map(t => (
                    <View key={t.id} style={styles.obRow}>
                      <Text style={[styles.obPrice, { color: t.up ? colors.success : colors.destructive }]}>{t.price}</Text>
                      <Text style={[styles.obAmt, { color: colors.mutedForeground }]}>{t.amount}</Text>
                    </View>
                  ))}
                </>
              )}
            </View>
          )}

          {/* Order Form */}
          <View style={[styles.orderForm, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.sideTabs]}>
              <TouchableOpacity testID="btn-buy" onPress={() => { setSide("buy"); Haptics.selectionAsync(); }}
                style={[styles.sideTab, { borderBottomColor: side==="buy" ? colors.success : "transparent", backgroundColor: side==="buy" ? colors.success+"15" : "transparent" }]}>
                <Text style={[styles.sideTabTxt, { color: side==="buy" ? colors.success : colors.mutedForeground }]}>Buy</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="btn-sell" onPress={() => { setSide("sell"); Haptics.selectionAsync(); }}
                style={[styles.sideTab, { borderBottomColor: side==="sell" ? colors.destructive : "transparent", backgroundColor: side==="sell" ? colors.destructive+"15" : "transparent" }]}>
                <Text style={[styles.sideTabTxt, { color: side==="sell" ? colors.destructive : colors.mutedForeground }]}>Sell</Text>
              </TouchableOpacity>
            </View>

            {/* Order type */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
              <View style={[styles.typeRow, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                {(["limit","market","stop-limit","oco"] as const).map(t => (
                  <TouchableOpacity key={t} onPress={() => setOrderType(t)}
                    style={[styles.typeBtn, { backgroundColor: orderType===t ? colors.accent : "transparent" }]}>
                    <Text style={[styles.typeText, { color: orderType===t ? colors.foreground : colors.mutedForeground }]}>
                      {t === "stop-limit" ? "Stop" : t === "oco" ? "OCO" : t.charAt(0).toUpperCase()+t.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Available */}
            <View style={styles.dataRow}>
              <Text style={[styles.lbl, { color: colors.mutedForeground }]}>Avail.</Text>
              <Text style={[styles.val, { color: colors.foreground }]}>{side==="buy"?"5,847 USDT":`0.0854 ${base}`}</Text>
            </View>

            {/* Stop Price (stop-limit/oco) */}
            {(orderType === "stop-limit" || orderType === "oco") && (
              <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.secondary }]}>
                <Text style={[styles.inputLbl, { color: colors.mutedForeground }]}>Stop</Text>
                <TextInput value={stopPrice} onChangeText={setStopPrice} keyboardType="numeric"
                  placeholder="0.00" placeholderTextColor={colors.mutedForeground}
                  style={[styles.inputField, { color: colors.foreground }]} />
                <Text style={[styles.inputLbl, { color: colors.mutedForeground }]}>USDT</Text>
              </View>
            )}

            {/* Price */}
            {orderType !== "market" && (
              <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.secondary }]}>
                <Text style={[styles.inputLbl, { color: colors.mutedForeground }]}>Price</Text>
                <TextInput testID="input-price" value={price} onChangeText={setPrice} keyboardType="numeric"
                  style={[styles.inputField, { color: colors.foreground }]} placeholderTextColor={colors.mutedForeground} />
                <Text style={[styles.inputLbl, { color: colors.mutedForeground }]}>USDT</Text>
              </View>
            )}

            {/* Amount */}
            <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.secondary }]}>
              <Text style={[styles.inputLbl, { color: colors.mutedForeground }]}>Amt</Text>
              <TextInput testID="input-amount" value={amount} onChangeText={setAmount} keyboardType="numeric"
                placeholder="0.0000" placeholderTextColor={colors.mutedForeground}
                style={[styles.inputField, { color: colors.foreground }]} />
              <Text style={[styles.inputLbl, { color: colors.mutedForeground }]}>{base}</Text>
            </View>

            {/* Pct buttons */}
            <View style={styles.pctRow}>
              {[25,50,75,100].map(p => (
                <TouchableOpacity key={p} onPress={() => handlePct(p)}
                  style={[styles.pctBtn, {
                    borderColor: pct===p ? (side==="buy"?colors.success:colors.destructive) : colors.border,
                    backgroundColor: pct===p ? (side==="buy"?colors.success:colors.destructive)+"18" : "transparent"
                  }]}>
                  <Text style={[styles.pctTxt, { color: pct===p?(side==="buy"?colors.success:colors.destructive):colors.mutedForeground }]}>{p}%</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Total */}
            <View style={styles.dataRow}>
              <Text style={[styles.lbl, { color: colors.mutedForeground }]}>Total</Text>
              <Text style={[styles.val, { color: colors.foreground }]}>{total} USDT</Text>
            </View>

            {/* TIF + Post Only (only Limit) */}
            {orderType === "limit" && (
              <View style={styles.optionsRow}>
                <TouchableOpacity onPress={() => setShowTifModal(true)}
                  style={[styles.tifBtn, { borderColor: colors.border, backgroundColor: colors.secondary }]}>
                  <Text style={[styles.tifTxt, { color: colors.foreground }]}>{tif}</Text>
                  <Feather name="chevron-down" size={10} color={colors.mutedForeground} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setPostOnly(v=>!v); Haptics.selectionAsync(); }}
                  style={[styles.postOnlyBtn, { borderColor: postOnly ? colors.primary : colors.border, backgroundColor: postOnly ? colors.primary+"18" : "transparent" }]}>
                  <View style={[styles.checkBox, { borderColor: postOnly ? colors.primary : colors.border, backgroundColor: postOnly ? colors.primary : "transparent" }]}>
                    {postOnly && <Feather name="check" size={8} color="#000" />}
                  </View>
                  <Text style={[styles.postOnlyTxt, { color: postOnly ? colors.primary : colors.mutedForeground }]}>Post Only</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* TP/SL toggle */}
            <TouchableOpacity onPress={() => { setShowTpSl(v=>!v); Haptics.selectionAsync(); }}
              style={[styles.tpslToggle, { borderColor: showTpSl ? colors.primary + "60" : colors.border }]}>
              <Feather name="target" size={11} color={showTpSl ? colors.primary : colors.mutedForeground} />
              <Text style={[styles.tpslToggleTxt, { color: showTpSl ? colors.primary : colors.mutedForeground }]}>TP / SL</Text>
              <Feather name={showTpSl ? "chevron-up" : "chevron-down"} size={11} color={colors.mutedForeground} />
            </TouchableOpacity>

            {showTpSl && (
              <View style={{ gap: 6 }}>
                <View style={[styles.inputWrap, { borderColor: colors.success+"60", backgroundColor: colors.secondary }]}>
                  <Text style={[styles.inputLbl, { color: colors.success }]}>TP</Text>
                  <TextInput value={tpPrice} onChangeText={setTpPrice} keyboardType="numeric"
                    placeholder="Take Profit" placeholderTextColor={colors.mutedForeground}
                    style={[styles.inputField, { color: colors.foreground }]} />
                  <Text style={[styles.inputLbl, { color: colors.mutedForeground }]}>USDT</Text>
                </View>
                <View style={[styles.inputWrap, { borderColor: colors.destructive+"60", backgroundColor: colors.secondary }]}>
                  <Text style={[styles.inputLbl, { color: colors.destructive }]}>SL</Text>
                  <TextInput value={slPrice} onChangeText={setSlPrice} keyboardType="numeric"
                    placeholder="Stop Loss" placeholderTextColor={colors.mutedForeground}
                    style={[styles.inputField, { color: colors.foreground }]} />
                  <Text style={[styles.inputLbl, { color: colors.mutedForeground }]}>USDT</Text>
                </View>
              </View>
            )}

            <TouchableOpacity
              testID={`btn-${side}-submit`}
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
              style={[styles.submitBtn, { backgroundColor: side==="buy" ? colors.success : colors.destructive }]}>
              <Text style={styles.submitTxt}>{side==="buy"?"Buy":"Sell"} {base}</Text>
            </TouchableOpacity>
            <Text style={[styles.feeTxt, { color: colors.mutedForeground }]}>Fee: 0.1%/0.1%</Text>
          </View>
        </View>

        {/* Bottom Tab Panel */}
        <View style={[styles.bottomCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bottomTabRow}>
            {BOTTOM_TABS.map(t => (
              <TouchableOpacity key={t} onPress={() => setActiveBottomTab(t)}
                style={[styles.bottomTab, { borderBottomColor: activeBottomTab===t ? colors.primary : "transparent" }]}>
                <Text style={[styles.bottomTabTxt, { color: activeBottomTab===t ? colors.primary : colors.mutedForeground }]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {activeBottomTab === "Open Orders" && (
            <View>
              {[
                { pair:"BTC/USDT", type:"Limit", side:"Buy",  price:"63,500.00", amount:"0.0500 BTC", filled:"0/0.05",  time:"14:32" },
                { pair:"ETH/USDT", type:"Stop",  side:"Sell", price:"3,050.00",  amount:"1.2000 ETH", filled:"0/1.20",  time:"13:15" },
              ].map((o,i) => (
                <View key={i} style={[styles.orderRow, { borderTopColor: colors.border }]}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.orderHead}>
                      <Text style={[styles.orderPair, { color: colors.foreground }]}>{o.pair}</Text>
                      <Text style={[styles.orderType, { color: colors.mutedForeground }]}>{o.type}</Text>
                      <Text style={[styles.orderTime, { color: colors.mutedForeground }]}>{o.time}</Text>
                    </View>
                    <View style={styles.orderBody}>
                      <Text style={[styles.orderSide, { color: o.side==="Buy"?colors.success:colors.destructive }]}>{o.side}</Text>
                      <Text style={[styles.orderPrice, { color: colors.foreground }]}>${o.price}</Text>
                      <Text style={[styles.orderAmt, { color: colors.mutedForeground }]}>{o.amount}</Text>
                    </View>
                    <View style={[styles.filledBar, { backgroundColor: colors.border }]}>
                      <View style={[styles.filledFill, { backgroundColor: o.side==="Buy"?colors.success:colors.destructive, width:"0%" as any }]} />
                    </View>
                  </View>
                  <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.destructive }]}
                    onPress={() => Haptics.selectionAsync()}>
                    <Text style={[styles.cancelTxt, { color: colors.destructive }]}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {activeBottomTab === "Order History" && (
            <View>
              {[
                { pair:"BTC/USDT", side:"Buy",  price:"63,120.00", amount:"0.1000 BTC", status:"Filled",   time:"Apr 16 10:22" },
                { pair:"SOL/USDT", side:"Sell", price:"144.50",    amount:"10.00 SOL",  status:"Filled",   time:"Apr 15 08:45" },
                { pair:"ETH/USDT", side:"Buy",  price:"3,200.00",  amount:"0.5000 ETH", status:"Cancelled",time:"Apr 14 17:30" },
              ].map((o,i) => (
                <View key={i} style={[styles.orderRow, { borderTopColor: colors.border }]}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.orderHead}>
                      <Text style={[styles.orderPair, { color: colors.foreground }]}>{o.pair}</Text>
                      <Text style={[styles.orderTime, { color: colors.mutedForeground }]}>{o.time}</Text>
                    </View>
                    <View style={styles.orderBody}>
                      <Text style={[styles.orderSide, { color: o.side==="Buy"?colors.success:colors.destructive }]}>{o.side}</Text>
                      <Text style={[styles.orderPrice, { color: colors.foreground }]}>${o.price}</Text>
                      <Text style={[styles.orderAmt, { color: colors.mutedForeground }]}>{o.amount}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: (o.status==="Filled"?colors.success:colors.mutedForeground)+"22" }]}>
                        <Text style={[styles.statusTxt, { color: o.status==="Filled"?colors.success:colors.mutedForeground }]}>{o.status}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {activeBottomTab === "Trade History" && (
            <View>
              {trades.slice(0,10).map((t,i) => (
                <View key={t.id} style={[styles.orderRow, { borderTopColor: colors.border }]}>
                  <Text style={[styles.orderPair, { color: colors.foreground }]}>{pair}</Text>
                  <Text style={[styles.orderPrice, { color: t.up ? colors.success : colors.destructive }]}>${t.price}</Text>
                  <Text style={[styles.orderAmt, { color: colors.mutedForeground }]}>{t.amount}</Text>
                  <Text style={[styles.orderTime, { color: colors.mutedForeground }]}>{t.time}</Text>
                </View>
              ))}
            </View>
          )}

          {activeBottomTab === "Funds" && (
            <View>
              {[
                { asset:"USDT", avail:"5,847.32", locked:"500.00", total:"6,347.32" },
                { asset:"BTC",  avail:"0.0854",   locked:"0.0500", total:"0.1354" },
                { asset:"ETH",  avail:"3.7000",   locked:"1.2000", total:"4.9000" },
              ].map((f,i) => (
                <View key={f.asset} style={[styles.fundRow, { borderTopColor: colors.border, borderTopWidth: i>0?1:0 }]}>
                  <Text style={[styles.fundAsset, { color: colors.foreground }]}>{f.asset}</Text>
                  <View style={{ flex:1 }}>
                    <Text style={[styles.fundVal, { color: colors.foreground }]}>Avail: {f.avail}</Text>
                    <Text style={[styles.fundLock, { color: colors.mutedForeground }]}>Locked: {f.locked}</Text>
                  </View>
                  <Text style={[styles.fundTotal, { color: colors.foreground }]}>{f.total}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Pair Modal */}
      <Modal visible={showPairModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Select Pair</Text>
            {PAIRS.map(p => (
              <TouchableOpacity key={p} onPress={() => { setPair(p); setShowPairModal(false); Haptics.selectionAsync(); }}
                style={[styles.pairOpt, { borderTopColor: colors.border, backgroundColor: pair===p?colors.secondary:"transparent" }]}>
                <View>
                  <Text style={[styles.pairOptTxt, { color: pair===p?colors.primary:colors.foreground }]}>{p}</Text>
                  <Text style={[styles.pairOptChange, { color: PAIR_CHANGE[p]>=0?colors.success:colors.destructive }]}>
                    {PAIR_CHANGE[p]>=0?"+":""}{PAIR_CHANGE[p]}%
                  </Text>
                </View>
                <Text style={[styles.pairOptPrice, { color: colors.foreground }]}>{fmtP(PAIR_BASE[p])}</Text>
                {pair===p && <Feather name="check" size={15} color={colors.primary} />}
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setShowPairModal(false)} style={[styles.cancelModal, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.cancelModalTxt, { color: colors.mutedForeground }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* TIF Modal */}
      <Modal visible={showTifModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Time In Force</Text>
            {([
              { val:"GTC", desc:"Good Till Cancelled" },
              { val:"IOC", desc:"Immediate Or Cancel" },
              { val:"FOK", desc:"Fill Or Kill" },
            ] as const).map(t => (
              <TouchableOpacity key={t.val} onPress={() => { setTif(t.val); setShowTifModal(false); Haptics.selectionAsync(); }}
                style={[styles.pairOpt, { borderTopColor: colors.border, backgroundColor: tif===t.val?colors.secondary:"transparent" }]}>
                <View>
                  <Text style={[styles.pairOptTxt, { color: tif===t.val?colors.primary:colors.foreground }]}>{t.val}</Text>
                  <Text style={[styles.pairOptChange, { color: colors.mutedForeground }]}>{t.desc}</Text>
                </View>
                {tif===t.val && <Feather name="check" size={15} color={colors.primary} />}
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setShowTifModal(false)} style={[styles.cancelModal, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.cancelModalTxt, { color: colors.mutedForeground }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection:"row", alignItems:"center", justifyContent:"space-between", paddingHorizontal:14, paddingBottom:8, borderBottomWidth:1 },
  pairBtn: { flexDirection:"row", alignItems:"center", gap:4 },
  pairText: { fontSize:15, fontFamily:"Inter_700Bold" },
  priceBlock: { alignItems:"center" },
  mainPrice: { fontSize:19, fontFamily:"Inter_700Bold" },
  priceChange: { fontSize:10, fontFamily:"Inter_500Medium" },
  headerIcons: { flexDirection:"row", gap:6 },
  smallBtn: { width:30, height:30, borderRadius:15, alignItems:"center", justifyContent:"center" },
  statsBar: { flexDirection:"row", paddingHorizontal:10, paddingVertical:6, borderBottomWidth:1 },
  statItem: { flex:1, alignItems:"center" },
  statL: { fontSize:8.5, fontFamily:"Inter_400Regular", marginBottom:1 },
  statV: { fontSize:10, fontFamily:"Inter_600SemiBold" },
  intervalRow: { flexDirection:"row", alignItems:"center", paddingHorizontal:12, paddingVertical:6, borderBottomWidth:1, gap:4 },
  intervalTab: { paddingHorizontal:8, paddingVertical:5, fontSize:11, fontFamily:"Inter_600SemiBold", borderBottomWidth:2 },
  indicatorRow: { flexDirection:"row", gap:5, marginLeft:"auto" },
  indBtn: { paddingHorizontal:8, paddingVertical:3, borderRadius:6, borderWidth:1 },
  indText: { fontSize:10, fontFamily:"Inter_700Bold" },
  chartWrap: { marginHorizontal:6, marginVertical:4, borderRadius:10, padding:4, overflow:"hidden" },
  yLabel: { fontSize:7.5, fontFamily:"Inter_400Regular" },
  mainRow: { flexDirection:"row", gap:6, marginHorizontal:6, marginBottom:6 },
  leftPanel: { width:"42%", borderRadius:12, borderWidth:1, padding:6, overflow:"hidden" },
  obTabRow: { flexDirection:"row", borderBottomWidth:1, borderBottomColor:"#2b2f36", marginBottom:4 },
  obTab: { flex:1, alignItems:"center", paddingVertical:4, borderBottomWidth:1.5 },
  obTabText: { fontSize:10, fontFamily:"Inter_600SemiBold" },
  obColRow: { flexDirection:"row", justifyContent:"space-between", marginBottom:2 },
  obColText: { fontSize:8.5, fontFamily:"Inter_500Medium" },
  obRow: { flexDirection:"row", justifyContent:"space-between", paddingVertical:2.5, overflow:"hidden", position:"relative" },
  obBar: { position:"absolute", top:0, bottom:0 },
  obPrice: { fontSize:9, fontFamily:"Inter_500Medium", zIndex:1 },
  obAmt: { fontSize:9, fontFamily:"Inter_400Regular", zIndex:1 },
  spreadRow: { flexDirection:"row", alignItems:"center", gap:3, paddingVertical:3, paddingHorizontal:3, borderRadius:4, marginVertical:1 },
  spreadP: { fontSize:9.5, fontFamily:"Inter_700Bold" },
  orderForm: { flex:1, borderRadius:12, borderWidth:1, overflow:"hidden", padding:9 },
  sideTabs: { flexDirection:"row", borderBottomWidth:1, borderBottomColor:"#2b2f36", marginBottom:8 },
  sideTab: { flex:1, alignItems:"center", paddingVertical:7, borderBottomWidth:2 },
  sideTabTxt: { fontSize:12, fontFamily:"Inter_700Bold" },
  typeRow: { flexDirection:"row", borderRadius:8, overflow:"hidden", borderWidth:1 },
  typeBtn: { paddingHorizontal:8, paddingVertical:5, alignItems:"center" },
  typeText: { fontSize:9.5, fontFamily:"Inter_600SemiBold" },
  dataRow: { flexDirection:"row", justifyContent:"space-between", marginBottom:5 },
  lbl: { fontSize:9.5, fontFamily:"Inter_400Regular" },
  val: { fontSize:9.5, fontFamily:"Inter_600SemiBold" },
  inputWrap: { flexDirection:"row", alignItems:"center", borderRadius:7, borderWidth:1, paddingHorizontal:7, paddingVertical:5, marginBottom:6 },
  inputLbl: { fontSize:9, fontFamily:"Inter_500Medium" },
  inputField: { flex:1, fontSize:11, fontFamily:"Inter_600SemiBold", textAlign:"right", padding:0, paddingHorizontal:3 },
  pctRow: { flexDirection:"row", gap:4, marginBottom:6 },
  pctBtn: { flex:1, paddingVertical:4, borderRadius:5, borderWidth:1, alignItems:"center" },
  pctTxt: { fontSize:9, fontFamily:"Inter_600SemiBold" },
  optionsRow: { flexDirection:"row", gap:6, marginBottom:6 },
  tifBtn: { flexDirection:"row", alignItems:"center", gap:3, borderWidth:1, borderRadius:6, paddingHorizontal:7, paddingVertical:4 },
  tifTxt: { fontSize:10, fontFamily:"Inter_600SemiBold" },
  postOnlyBtn: { flex:1, flexDirection:"row", alignItems:"center", gap:4, borderWidth:1, borderRadius:6, paddingHorizontal:7, paddingVertical:4 },
  postOnlyTxt: { fontSize:10, fontFamily:"Inter_500Medium" },
  checkBox: { width:12, height:12, borderRadius:3, borderWidth:1, alignItems:"center", justifyContent:"center" },
  tpslToggle: { flexDirection:"row", alignItems:"center", gap:5, borderWidth:1, borderRadius:7, paddingHorizontal:8, paddingVertical:5, marginBottom:6 },
  tpslToggleTxt: { flex:1, fontSize:10, fontFamily:"Inter_600SemiBold" },
  submitBtn: { borderRadius:7, paddingVertical:9, alignItems:"center", marginBottom:4, marginTop:4 },
  submitTxt: { fontSize:12, fontFamily:"Inter_700Bold", color:"#fff" },
  feeTxt: { fontSize:8.5, fontFamily:"Inter_400Regular", textAlign:"center", color:"#848e9c" },
  bottomCard: { marginHorizontal:6, marginBottom:6, borderRadius:12, borderWidth:1 },
  bottomTabRow: { paddingHorizontal:12, gap:4, paddingTop:8 },
  bottomTab: { paddingHorizontal:10, paddingVertical:8, borderBottomWidth:2 },
  bottomTabTxt: { fontSize:11, fontFamily:"Inter_600SemiBold", whiteSpace:"nowrap" } as any,
  orderRow: { flexDirection:"row", alignItems:"center", paddingHorizontal:12, paddingVertical:10, borderTopWidth:1, gap:8 },
  orderHead: { flexDirection:"row", alignItems:"center", gap:8, marginBottom:3 },
  orderBody: { flexDirection:"row", alignItems:"center", gap:6 },
  orderPair: { fontSize:11, fontFamily:"Inter_600SemiBold" },
  orderType: { fontSize:9, fontFamily:"Inter_400Regular" },
  orderTime: { fontSize:9, fontFamily:"Inter_400Regular" },
  orderSide: { fontSize:10, fontFamily:"Inter_700Bold" },
  orderPrice: { fontSize:10, fontFamily:"Inter_500Medium" },
  orderAmt: { fontSize:10, fontFamily:"Inter_400Regular" },
  filledBar: { height:2, borderRadius:1, marginTop:4, overflow:"hidden" },
  filledFill: { height:2 },
  statusBadge: { paddingHorizontal:5, paddingVertical:1, borderRadius:4 },
  statusTxt: { fontSize:9, fontFamily:"Inter_600SemiBold" },
  cancelBtn: { borderWidth:1, borderRadius:5, paddingHorizontal:7, paddingVertical:4, marginLeft:"auto" },
  cancelTxt: { fontSize:10, fontFamily:"Inter_600SemiBold" },
  fundRow: { flexDirection:"row", alignItems:"center", paddingHorizontal:12, paddingVertical:10, gap:10 },
  fundAsset: { width:40, fontSize:12, fontFamily:"Inter_700Bold" },
  fundVal: { fontSize:10, fontFamily:"Inter_500Medium" },
  fundLock: { fontSize:9, fontFamily:"Inter_400Regular" },
  fundTotal: { fontSize:11, fontFamily:"Inter_600SemiBold" },
  modalOverlay: { flex:1, justifyContent:"flex-end", backgroundColor:"#00000088" },
  modalSheet: { borderTopLeftRadius:20, borderTopRightRadius:20, borderWidth:1, padding:16, paddingBottom:36 },
  handle: { width:40, height:4, borderRadius:2, alignSelf:"center", marginBottom:14 },
  modalTitle: { fontSize:16, fontFamily:"Inter_700Bold", marginBottom:12 },
  pairOpt: { flexDirection:"row", alignItems:"center", paddingVertical:13, borderTopWidth:1, gap:8 },
  pairOptTxt: { fontSize:14, fontFamily:"Inter_600SemiBold" },
  pairOptChange: { fontSize:11, fontFamily:"Inter_500Medium" },
  pairOptPrice: { marginLeft:"auto", fontSize:13, fontFamily:"Inter_600SemiBold" },
  cancelModal: { borderRadius:12, paddingVertical:14, alignItems:"center", marginTop:12 },
  cancelModalTxt: { fontSize:14, fontFamily:"Inter_600SemiBold" },
} as any);
