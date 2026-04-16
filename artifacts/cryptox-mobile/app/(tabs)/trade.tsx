import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Platform, Modal, FlatList, Animated
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

interface Candle { open: number; high: number; low: number; close: number; vol: number }
interface OrderEntry { price: string; amount: string; depth: number }

const PAIRS = ["BTC/USDT","ETH/USDT","BNB/USDT","SOL/USDT","ADA/USDT"];
const INTERVALS = ["1m","5m","15m","1H","4H","1D"];
const PAIR_BASE = { "BTC/USDT": 64250, "ETH/USDT": 3180, "BNB/USDT": 580, "SOL/USDT": 142, "ADA/USDT": 0.45 };

function genCandles(base: number, n = 40): Candle[] {
  const out: Candle[] = [];
  let p = base * 0.97;
  for (let i = 0; i < n; i++) {
    const open = p;
    const move = (Math.random() - 0.48) * base * 0.015;
    const close = open + move;
    const high = Math.max(open, close) + Math.random() * base * 0.005;
    const low  = Math.min(open, close) - Math.random() * base * 0.005;
    const vol = Math.random() * 100 + 10;
    out.push({ open, high, low, close, vol });
    p = close;
  }
  return out;
}

function genOrderBook(base: number): { asks: OrderEntry[]; bids: OrderEntry[] } {
  let cum = 0;
  const asks: OrderEntry[] = Array.from({ length: 8 }, (_, i) => {
    const price = (base + (8 - i) * base * 0.0002).toFixed(2);
    const amount = (Math.random() * 2 + 0.1).toFixed(4);
    cum += parseFloat(amount);
    return { price, amount, depth: Math.random() * 70 + 20 };
  });
  cum = 0;
  const bids: OrderEntry[] = Array.from({ length: 8 }, (_, i) => {
    const price = (base - i * base * 0.0002).toFixed(2);
    const amount = (Math.random() * 2 + 0.1).toFixed(4);
    cum += parseFloat(amount);
    return { price, amount, depth: Math.random() * 70 + 20 };
  });
  return { asks, bids };
}

function CandleChart({ candles, width, height }: { candles: Candle[]; width: number; height: number }) {
  if (!candles.length || !width) return null;
  const prices = candles.flatMap(c => [c.high, c.low]);
  const minP = Math.min(...prices), maxP = Math.max(...prices);
  const range = maxP - minP || 1;
  const candleW = Math.max(3, (width / candles.length) - 1.5);
  const py = (v: number) => ((maxP - v) / range) * height;

  return (
    <View style={{ width, height, overflow: "hidden" }}>
      {candles.map((c, i) => {
        const x = i * (width / candles.length);
        const isGreen = c.close >= c.open;
        const color = isGreen ? "#0ecb81" : "#f6465d";
        const bodyTop = py(Math.max(c.open, c.close));
        const bodyH = Math.max(1, Math.abs(py(c.open) - py(c.close)));
        const wickTop = py(c.high);
        const wickH = Math.abs(py(c.high) - py(c.low));
        return (
          <View key={i} style={[StyleSheet.absoluteFillObject, { left: 0, top: 0 }]} pointerEvents="none">
            {/* Wick */}
            <View style={{
              position: "absolute",
              left: x + candleW / 2 - 0.5,
              top: wickTop,
              width: 1,
              height: Math.max(1, wickH),
              backgroundColor: color,
              opacity: 0.8,
            }} />
            {/* Body */}
            <View style={{
              position: "absolute",
              left: x,
              top: bodyTop,
              width: candleW,
              height: bodyH,
              backgroundColor: color,
              opacity: 0.9,
            }} />
          </View>
        );
      })}
    </View>
  );
}

export default function TradeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [pair, setPair] = useState("BTC/USDT");
  const [showPairModal, setShowPairModal] = useState(false);
  const [interval_, setInterval_] = useState("1H");
  const [candles, setCandles] = useState<Candle[]>(() => genCandles(64250));
  const [orderBook, setOrderBook] = useState(() => genOrderBook(64250));
  const [currentPrice, setCurrentPrice] = useState(64250.50);
  const prevPrice = useRef(64250.50);
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [orderType, setOrderType] = useState<"limit" | "market" | "stop">("limit");
  const [price, setPrice] = useState("64250.50");
  const [amount, setAmount] = useState("");
  const [pct, setPct] = useState(0);
  const [chartWidth, setChartWidth] = useState(0);
  const [showOrderBook, setShowOrderBook] = useState(true);
  const priceFlash = useRef(new Animated.Value(0)).current;
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const basePrice = PAIR_BASE[pair as keyof typeof PAIR_BASE] || 64250;

  useEffect(() => {
    setCurrentPrice(basePrice);
    setPrice(basePrice.toFixed(2));
    setCandles(genCandles(basePrice));
    setOrderBook(genOrderBook(basePrice));
  }, [pair]);

  useEffect(() => {
    const iv = setInterval(() => {
      setCurrentPrice(p => {
        const next = p * (1 + (Math.random() - 0.499) * 0.0009);
        prevPrice.current = p;
        return next;
      });
      setOrderBook(genOrderBook(currentPrice));
    }, 1400);
    return () => clearInterval(iv);
  }, [currentPrice]);

  const priceUp = currentPrice >= prevPrice.current;
  const fmtP = (v: number) => v >= 1 ? v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : v.toFixed(4);
  const base = pair.split("/")[0];
  const total = price && amount ? (parseFloat(price) * parseFloat(amount)).toFixed(2) : "0.00";

  const handlePct = useCallback((p: number) => {
    setPct(p);
    const balance = side === "buy" ? 5847.32 : 0.0854;
    const computed = side === "buy"
      ? ((balance * p / 100) / parseFloat(price || "1")).toFixed(6)
      : (balance * p / 100).toFixed(6);
    setAmount(computed);
  }, [price, side]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <TouchableOpacity
          testID="btn-pair-selector"
          onPress={() => setShowPairModal(true)}
          style={styles.pairBtn}
        >
          <Text style={[styles.pairText, { color: colors.foreground }]}>{pair}</Text>
          <Feather name="chevron-down" size={14} color={colors.mutedForeground} />
        </TouchableOpacity>
        <View style={styles.priceBlock}>
          <Text style={[styles.mainPrice, { color: priceUp ? colors.success : colors.destructive }]}>
            {fmtP(currentPrice)}
          </Text>
          <Text style={[styles.priceChange, { color: priceUp ? colors.success : colors.destructive }]}>
            +2.5% 24h
          </Text>
        </View>
        <TouchableOpacity onPress={() => setShowOrderBook(v => !v)}>
          <Feather name="sidebar" size={18} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? bottomPad + 84 : 90 }}>

        {/* Interval tabs */}
        <View style={[styles.intervalRow, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
          {INTERVALS.map(iv => (
            <TouchableOpacity key={iv} testID={`interval-${iv}`} onPress={() => { setInterval_(iv); setCandles(genCandles(basePrice)); }}>
              <Text style={[styles.intervalTab, { color: interval_ === iv ? colors.primary : colors.mutedForeground, borderBottomColor: interval_ === iv ? colors.primary : "transparent" }]}>
                {iv}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Chart */}
        <View
          style={[styles.chartContainer, { backgroundColor: colors.card }]}
          onLayout={e => setChartWidth(e.nativeEvent.layout.width - 8)}
        >
          <CandleChart candles={candles} width={chartWidth} height={160} />
          {/* Y-axis labels */}
          <View style={[StyleSheet.absoluteFill, { justifyContent: "space-between", paddingVertical: 4, pointerEvents: "none" } as any]}>
            {[0, 1, 2, 3, 4].map(i => {
              const prices = candles.flatMap(c => [c.high, c.low]);
              const minP = Math.min(...prices), maxP = Math.max(...prices);
              const v = maxP - (i / 4) * (maxP - minP);
              return (
                <Text key={i} style={[styles.yLabel, { color: colors.mutedForeground }]}>
                  {v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(2)}
                </Text>
              );
            })}
          </View>
        </View>

        {/* Order book + Order form layout */}
        <View style={styles.mainRow}>
          {/* Order Book */}
          {showOrderBook && (
            <View style={[styles.orderBook, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Order Book</Text>
              {/* Asks */}
              {[...orderBook.asks].reverse().slice(0, 5).map((a, i) => (
                <View key={`ask-${i}`} style={styles.obRow}>
                  <View style={[styles.obDepth, { right: 0, backgroundColor: "#f6465d12", width: `${a.depth * 0.6}%` as any }]} />
                  <Text style={[styles.obPrice, { color: colors.destructive }]}>{a.price}</Text>
                  <Text style={[styles.obAmount, { color: colors.mutedForeground }]}>{a.amount}</Text>
                </View>
              ))}
              {/* Spread */}
              <View style={[styles.spreadRow, { backgroundColor: colors.secondary }]}>
                <Text style={[styles.spreadPrice, { color: priceUp ? colors.success : colors.destructive }]}>
                  {fmtP(currentPrice)}
                </Text>
                <Feather name={priceUp ? "trending-up" : "trending-down"} size={10} color={priceUp ? colors.success : colors.destructive} />
              </View>
              {/* Bids */}
              {orderBook.bids.slice(0, 5).map((b, i) => (
                <View key={`bid-${i}`} style={styles.obRow}>
                  <View style={[styles.obDepth, { right: 0, backgroundColor: "#0ecb8112", width: `${b.depth * 0.6}%` as any }]} />
                  <Text style={[styles.obPrice, { color: colors.success }]}>{b.price}</Text>
                  <Text style={[styles.obAmount, { color: colors.mutedForeground }]}>{b.amount}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Order Form */}
          <View style={[styles.orderForm, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Buy/Sell */}
            <View style={[styles.sideTabs, { borderColor: colors.border }]}>
              <TouchableOpacity testID="btn-buy" onPress={() => { setSide("buy"); Haptics.selectionAsync(); }}
                style={[styles.sideTab, { borderBottomColor: side === "buy" ? colors.success : "transparent", backgroundColor: side === "buy" ? colors.success + "15" : "transparent" }]}>
                <Text style={[styles.sideTabText, { color: side === "buy" ? colors.success : colors.mutedForeground }]}>Buy</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="btn-sell" onPress={() => { setSide("sell"); Haptics.selectionAsync(); }}
                style={[styles.sideTab, { borderBottomColor: side === "sell" ? colors.destructive : "transparent", backgroundColor: side === "sell" ? colors.destructive + "15" : "transparent" }]}>
                <Text style={[styles.sideTabText, { color: side === "sell" ? colors.destructive : colors.mutedForeground }]}>Sell</Text>
              </TouchableOpacity>
            </View>

            {/* Order type */}
            <View style={[styles.typeRow, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              {(["limit","market","stop"] as const).map(t => (
                <TouchableOpacity key={t} testID={`order-type-${t}`} onPress={() => setOrderType(t)}
                  style={[styles.typeBtn, { backgroundColor: orderType === t ? colors.accent : "transparent" }]}>
                  <Text style={[styles.typeText, { color: orderType === t ? colors.foreground : colors.mutedForeground }]}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Available */}
            <View style={styles.availRow}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Available</Text>
              <Text style={[styles.value, { color: colors.foreground }]}>
                {side === "buy" ? "5,847.32 USDT" : `0.0854 ${base}`}
              </Text>
            </View>

            {/* Price input */}
            {orderType !== "market" && (
              <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.secondary }]}>
                <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Price</Text>
                <TextInput
                  testID="input-price"
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="numeric"
                  style={[styles.input, { color: colors.foreground }]}
                  placeholderTextColor={colors.mutedForeground}
                />
                <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>USDT</Text>
              </View>
            )}

            {/* Amount */}
            <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.secondary }]}>
              <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Amount</Text>
              <TextInput
                testID="input-amount"
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                style={[styles.input, { color: colors.foreground }]}
                placeholder="0.0000"
                placeholderTextColor={colors.mutedForeground}
              />
              <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>{base}</Text>
            </View>

            {/* % quick buttons */}
            <View style={styles.pctRow}>
              {[25, 50, 75, 100].map(p => (
                <TouchableOpacity key={p} onPress={() => handlePct(p)}
                  style={[styles.pctBtn, { borderColor: pct === p ? (side === "buy" ? colors.success : colors.destructive) : colors.border,
                    backgroundColor: pct === p ? (side === "buy" ? colors.success : colors.destructive) + "18" : "transparent" }]}>
                  <Text style={[styles.pctText, { color: pct === p ? (side === "buy" ? colors.success : colors.destructive) : colors.mutedForeground }]}>{p}%</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Total */}
            <View style={styles.availRow}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Total</Text>
              <Text style={[styles.value, { color: colors.foreground }]}>{total} USDT</Text>
            </View>

            {/* Submit */}
            <TouchableOpacity
              testID={`btn-${side}-submit`}
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
              style={[styles.submitBtn, { backgroundColor: side === "buy" ? colors.success : colors.destructive }]}
            >
              <Text style={styles.submitText}>{side === "buy" ? "Buy" : "Sell"} {base}</Text>
            </TouchableOpacity>

            <Text style={[styles.feeText, { color: colors.mutedForeground }]}>Maker/Taker: 0.1% / 0.1%</Text>
          </View>
        </View>

        {/* Open Orders */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 10 }]}>Open Orders (2)</Text>
          {[
            { pair: "BTC/USDT", type: "Limit", side: "Buy",  price: "63,500", amount: "0.05", filled: "0%" },
            { pair: "ETH/USDT", type: "Stop",  side: "Sell", price: "3,050",  amount: "1.20", filled: "0%" },
          ].map((o, i) => (
            <View key={i} style={[styles.orderRow, { borderTopColor: colors.border }]}>
              <View>
                <Text style={[styles.orderPair, { color: colors.foreground }]}>{o.pair}</Text>
                <Text style={[styles.orderMeta, { color: colors.mutedForeground }]}>{o.type} · {o.filled}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={[styles.orderSide, { color: o.side === "Buy" ? colors.success : colors.destructive }]}>{o.side}</Text>
                <Text style={[styles.orderPrice, { color: colors.foreground }]}>${o.price} · {o.amount}</Text>
              </View>
              <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.destructive }]}>
                <Text style={[styles.cancelText, { color: colors.destructive }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Pair selector modal */}
      <Modal visible={showPairModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Select Pair</Text>
            {PAIRS.map(p => (
              <TouchableOpacity key={p} onPress={() => { setPair(p); setShowPairModal(false); Haptics.selectionAsync(); }}
                style={[styles.pairOption, { borderTopColor: colors.border, backgroundColor: pair === p ? colors.secondary : "transparent" }]}>
                <Text style={[styles.pairOptionText, { color: pair === p ? colors.primary : colors.foreground }]}>{p}</Text>
                {pair === p && <Feather name="check" size={16} color={colors.primary} />}
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setShowPairModal(false)} style={[styles.cancelModalBtn, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.cancelModalText, { color: colors.mutedForeground }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: 1 },
  pairBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  pairText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  priceBlock: { alignItems: "center" },
  mainPrice: { fontSize: 20, fontFamily: "Inter_700Bold" },
  priceChange: { fontSize: 11, fontFamily: "Inter_500Medium" },
  intervalRow: { flexDirection: "row", paddingHorizontal: 16, paddingVertical: 8, gap: 4, borderBottomWidth: 1 },
  intervalTab: { paddingHorizontal: 10, paddingVertical: 6, fontSize: 12, fontFamily: "Inter_600SemiBold", borderBottomWidth: 2 },
  chartContainer: { margin: 8, borderRadius: 12, padding: 4, height: 170, overflow: "hidden" },
  mainRow: { flexDirection: "row", gap: 8, marginHorizontal: 8, marginBottom: 8 },
  orderBook: { width: "40%", borderRadius: 12, borderWidth: 1, padding: 8, overflow: "hidden" },
  obRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2.5, overflow: "hidden" },
  obDepth: { position: "absolute", top: 0, bottom: 0 },
  obPrice: { fontSize: 9.5, fontFamily: "Inter_500Medium", zIndex: 1 },
  obAmount: { fontSize: 9.5, fontFamily: "Inter_400Regular", zIndex: 1 },
  spreadRow: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 4, paddingHorizontal: 2, borderRadius: 4, marginVertical: 2 },
  spreadPrice: { fontSize: 10, fontFamily: "Inter_700Bold" },
  orderForm: { flex: 1, borderRadius: 12, borderWidth: 1, overflow: "hidden", padding: 10 },
  sideTabs: { flexDirection: "row", borderBottomWidth: 1, marginBottom: 8 },
  sideTab: { flex: 1, alignItems: "center", paddingVertical: 8, borderBottomWidth: 2 },
  sideTabText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  typeRow: { flexDirection: "row", borderRadius: 8, overflow: "hidden", borderWidth: 1, marginBottom: 8 },
  typeBtn: { flex: 1, paddingVertical: 5, alignItems: "center" },
  typeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  availRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  label: { fontSize: 10, fontFamily: "Inter_400Regular" },
  value: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  inputWrap: { flexDirection: "row", alignItems: "center", borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 6, marginBottom: 8 },
  inputLabel: { fontSize: 10, fontFamily: "Inter_500Medium" },
  input: { flex: 1, fontSize: 12, fontFamily: "Inter_600SemiBold", textAlign: "right", paddingHorizontal: 4, padding: 0 },
  pctRow: { flexDirection: "row", gap: 4, marginBottom: 8 },
  pctBtn: { flex: 1, paddingVertical: 4, borderRadius: 6, borderWidth: 1, alignItems: "center" },
  pctText: { fontSize: 9.5, fontFamily: "Inter_600SemiBold" },
  submitBtn: { borderRadius: 8, paddingVertical: 10, alignItems: "center", marginBottom: 6 },
  submitText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#fff" },
  feeText: { fontSize: 9, fontFamily: "Inter_400Regular", textAlign: "center" },
  section: { margin: 8, borderRadius: 12, borderWidth: 1, padding: 12 },
  sectionTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  orderRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderTopWidth: 1, gap: 8 },
  orderPair: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  orderMeta: { fontSize: 10, fontFamily: "Inter_400Regular" },
  orderSide: { fontSize: 11, fontFamily: "Inter_700Bold" },
  orderPrice: { fontSize: 10, fontFamily: "Inter_500Medium" },
  cancelBtn: { borderWidth: 1, borderRadius: 5, paddingHorizontal: 8, paddingVertical: 3, marginLeft: "auto" },
  cancelText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "#00000088" },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, padding: 16, paddingBottom: 32 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  modalTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 12 },
  pairOption: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 14, borderTopWidth: 1 },
  pairOptionText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  cancelModalBtn: { borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 12 },
  cancelModalText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  yLabel: { fontSize: 8, fontFamily: "Inter_400Regular", textAlign: "right", paddingRight: 4 },
} as any);
