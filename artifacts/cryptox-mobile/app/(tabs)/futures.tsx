import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Platform, Modal
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

const PERP_PAIRS = ["BTCUSDT PERP","ETHUSDT PERP","BNBUSDT PERP","SOLUSDT PERP"];
const LEVERAGES = [1,2,3,5,10,15,20,25,50,75,100,125];

interface Position {
  symbol: string; side: "Long" | "Short"; size: string; entry: string;
  markPrice: string; liqPrice: string; margin: string; pnl: string; pnlPct: string;
}

const POSITIONS: Position[] = [
  { symbol: "BTCUSDT", side: "Long", size: "0.050 BTC", entry: "$63,100", markPrice: "$64,250", liqPrice: "$58,420", margin: "$640.55", pnl: "+$57.25", pnlPct: "+1.81%" },
];

export default function FuturesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [selectedPair, setSelectedPair] = useState("BTCUSDT PERP");
  const [showPairModal, setShowPairModal] = useState(false);
  const [leverage, setLeverage] = useState(10);
  const [showLevModal, setShowLevModal] = useState(false);
  const [side, setSide] = useState<"long" | "short">("long");
  const [orderType, setOrderType] = useState<"limit" | "market" | "stop">("limit");
  const [price, setPrice] = useState("64250.50");
  const [amount, setAmount] = useState("");
  const [pct, setPct] = useState(0);
  const [currentPrice, setCurrentPrice] = useState(64250.50);
  const [fundingRate, setFundingRate] = useState("0.0102%");
  const [countdown, setCountdown] = useState(6138);
  const [activeTab, setActiveTab] = useState<"positions" | "orders" | "history">("positions");
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  useEffect(() => {
    const iv = setInterval(() => {
      setCurrentPrice(p => p * (1 + (Math.random() - 0.499) * 0.0009));
      setCountdown(c => c > 0 ? c - 1 : 28800);
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  const fmt = (v: number) => v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtTime = (s: number) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
  };
  const posValue = price && amount ? (parseFloat(price) * parseFloat(amount)).toFixed(2) : "0.00";
  const reqMargin = posValue !== "0.00" ? (parseFloat(posValue) / leverage).toFixed(2) : "0.00";
  const estLiq = price && amount && reqMargin !== "0.00"
    ? (parseFloat(price) * (1 - 1 / leverage * 0.9)).toFixed(2) : "—";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => setShowPairModal(true)} style={styles.pairBtn}>
          <Text style={[styles.pairText, { color: colors.foreground }]}>{selectedPair}</Text>
          <View style={[styles.perpBadge, { backgroundColor: colors.primary + "22" }]}>
            <Text style={[styles.perpText, { color: colors.primary }]}>PERP</Text>
          </View>
          <Feather name="chevron-down" size={12} color={colors.mutedForeground} />
        </TouchableOpacity>
        <Text style={[styles.mainPrice, { color: colors.success }]}>{fmt(currentPrice)}</Text>
      </View>

      {/* Stats bar */}
      <View style={[styles.statsBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {[
          { label: "Mark Price", value: fmt(currentPrice * 0.9999) },
          { label: "Index Price", value: fmt(currentPrice * 0.9998) },
          { label: "Funding", value: fundingRate },
          { label: "Countdown", value: fmtTime(countdown) },
        ].map(s => (
          <View key={s.label} style={styles.statItem}>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
            <Text style={[styles.statValue, { color: s.label === "Funding" ? colors.success : colors.foreground }]}>{s.value}</Text>
          </View>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? bottomPad + 84 : 90 }}>

        {/* Order Form */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Long/Short */}
          <View style={[styles.sideTabs, { borderColor: colors.border }]}>
            <TouchableOpacity testID="btn-long" onPress={() => { setSide("long"); Haptics.selectionAsync(); }}
              style={[styles.sideTab, { borderBottomColor: side === "long" ? colors.success : "transparent", backgroundColor: side === "long" ? colors.success + "15" : "transparent" }]}>
              <Feather name="trending-up" size={14} color={side === "long" ? colors.success : colors.mutedForeground} style={{ marginRight: 4 }} />
              <Text style={[styles.sideTabText, { color: side === "long" ? colors.success : colors.mutedForeground }]}>Long / Buy</Text>
            </TouchableOpacity>
            <TouchableOpacity testID="btn-short" onPress={() => { setSide("short"); Haptics.selectionAsync(); }}
              style={[styles.sideTab, { borderBottomColor: side === "short" ? colors.destructive : "transparent", backgroundColor: side === "short" ? colors.destructive + "15" : "transparent" }]}>
              <Feather name="trending-down" size={14} color={side === "short" ? colors.destructive : colors.mutedForeground} style={{ marginRight: 4 }} />
              <Text style={[styles.sideTabText, { color: side === "short" ? colors.destructive : colors.mutedForeground }]}>Short / Sell</Text>
            </TouchableOpacity>
          </View>

          {/* Type + Leverage row */}
          <View style={styles.typeRow}>
            <View style={[styles.typeGroup, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              {(["limit","market","stop"] as const).map(t => (
                <TouchableOpacity key={t} onPress={() => setOrderType(t)}
                  style={[styles.typeBtn, { backgroundColor: orderType === t ? colors.accent : "transparent" }]}>
                  <Text style={[styles.typeText, { color: orderType === t ? colors.foreground : colors.mutedForeground }]}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity testID="btn-leverage" onPress={() => setShowLevModal(true)}
              style={[styles.levBtn, { backgroundColor: colors.primary + "22", borderColor: colors.primary }]}>
              <Text style={[styles.levText, { color: colors.primary }]}>{leverage}x</Text>
              <Feather name="chevron-down" size={10} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Available margin */}
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Available Margin</Text>
            <Text style={[styles.value, { color: colors.foreground }]}>1,240.50 USDT</Text>
          </View>

          {/* Price */}
          {orderType !== "market" && (
            <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.secondary }]}>
              <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Price (USDT)</Text>
              <TextInput
                testID="input-price"
                value={price}
                onChangeText={setPrice}
                keyboardType="numeric"
                style={[styles.inputField, { color: colors.foreground }]}
              />
            </View>
          )}

          {/* Amount */}
          <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.secondary }]}>
            <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Amount (BTC)</Text>
            <TextInput
              testID="input-amount"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder="0.0000"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.inputField, { color: colors.foreground }]}
            />
          </View>

          {/* Pct row */}
          <View style={styles.pctRow}>
            {[0, 25, 50, 75, 100].map(p => (
              <TouchableOpacity key={p} onPress={() => setPct(p)}
                style={[styles.pctBtn, {
                  borderColor: pct === p ? (side === "long" ? colors.success : colors.destructive) : colors.border,
                  backgroundColor: pct === p ? (side === "long" ? colors.success : colors.destructive) + "18" : "transparent"
                }]}>
                <Text style={[styles.pctText, { color: pct === p ? (side === "long" ? colors.success : colors.destructive) : colors.mutedForeground }]}>{p}%</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Order summary */}
          <View style={[styles.summary, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            {[
              { l: "Position Value", v: `${posValue} USDT` },
              { l: "Required Margin", v: `${reqMargin} USDT` },
              { l: "Est. Liq. Price", v: estLiq === "—" ? "—" : `$${estLiq}` },
            ].map(r => (
              <View key={r.l} style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>{r.l}</Text>
                <Text style={[styles.summaryValue, { color: colors.foreground }]}>{r.v}</Text>
              </View>
            ))}
          </View>

          {/* TP/SL */}
          <View style={styles.tpslRow}>
            <TouchableOpacity style={[styles.tpslBtn, { borderColor: colors.success + "60" }]}>
              <Text style={[styles.tpslText, { color: colors.success }]}>+ Take Profit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tpslBtn, { borderColor: colors.destructive + "60" }]}>
              <Text style={[styles.tpslText, { color: colors.destructive }]}>+ Stop Loss</Text>
            </TouchableOpacity>
          </View>

          {/* Submit */}
          <TouchableOpacity
            testID="btn-submit-futures"
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)}
            style={[styles.submitBtn, { backgroundColor: side === "long" ? colors.success : colors.destructive }]}
          >
            <Feather name={side === "long" ? "trending-up" : "trending-down"} size={16} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.submitText}>{side === "long" ? "Long / Buy" : "Short / Sell"} {leverage}x</Text>
          </TouchableOpacity>

          <Text style={[styles.feeNote, { color: colors.mutedForeground }]}>Maker / Taker: 0.02% / 0.05%</Text>
        </View>

        {/* Bottom tabs */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.tabRow, { borderBottomColor: colors.border }]}>
            {(["positions","orders","history"] as const).map(t => (
              <TouchableOpacity key={t} onPress={() => setActiveTab(t)}
                style={[styles.bottomTab, { borderBottomColor: activeTab === t ? colors.primary : "transparent" }]}>
                <Text style={[styles.bottomTabText, { color: activeTab === t ? colors.primary : colors.mutedForeground }]}>
                  {t === "positions" ? "Positions (1)" : t === "orders" ? "Open Orders" : "History"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {activeTab === "positions" && POSITIONS.map((pos, i) => (
            <View key={i} style={[styles.positionCard, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <View style={styles.posHeader}>
                <Text style={[styles.posSymbol, { color: colors.foreground }]}>{pos.symbol}</Text>
                <View style={[styles.sideBadge, { backgroundColor: pos.side === "Long" ? colors.success + "22" : colors.destructive + "22" }]}>
                  <Text style={[styles.sideBadgeText, { color: pos.side === "Long" ? colors.success : colors.destructive }]}>
                    {pos.side} {leverage}x
                  </Text>
                </View>
                <Text style={[styles.posPnl, { color: colors.success }]}>{pos.pnl}</Text>
                <Text style={[styles.posPnlPct, { color: colors.success }]}>{pos.pnlPct}</Text>
              </View>
              <View style={styles.posGrid}>
                {[
                  ["Size", pos.size], ["Entry", pos.entry], ["Mark", pos.markPrice],
                  ["Liq.", pos.liqPrice], ["Margin", pos.margin],
                ].map(([l, v]) => (
                  <View key={l} style={styles.posItem}>
                    <Text style={[styles.posLabel, { color: colors.mutedForeground }]}>{l}</Text>
                    <Text style={[styles.posValue, { color: l === "Liq." ? colors.destructive : colors.foreground }]}>{v}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.posActions}>
                <TouchableOpacity style={[styles.closeBtn, { backgroundColor: colors.destructive + "18", borderColor: colors.destructive }]}>
                  <Text style={[styles.closeBtnText, { color: colors.destructive }]}>Close</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.editBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                  <Text style={[styles.editBtnText, { color: colors.foreground }]}>TP/SL</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {activeTab === "orders" && (
            <View style={styles.emptyState}>
              <Feather name="list" size={28} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No open orders</Text>
            </View>
          )}

          {activeTab === "history" && (
            <View style={styles.emptyState}>
              <Feather name="clock" size={28} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No order history</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Pair Modal */}
      <Modal visible={showPairModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Select Contract</Text>
            {PERP_PAIRS.map(p => (
              <TouchableOpacity key={p} onPress={() => { setSelectedPair(p); setShowPairModal(false); Haptics.selectionAsync(); }}
                style={[styles.pairOption, { borderTopColor: colors.border, backgroundColor: selectedPair === p ? colors.secondary : "transparent" }]}>
                <Text style={[styles.pairOptionText, { color: selectedPair === p ? colors.primary : colors.foreground }]}>{p}</Text>
                {selectedPair === p && <Feather name="check" size={16} color={colors.primary} />}
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setShowPairModal(false)} style={[styles.cancelModalBtn, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.cancelModalText, { color: colors.mutedForeground }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Leverage Modal */}
      <Modal visible={showLevModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Select Leverage</Text>
            <View style={styles.levGrid}>
              {LEVERAGES.map(l => (
                <TouchableOpacity key={l} testID={`leverage-${l}`} onPress={() => { setLeverage(l); setShowLevModal(false); Haptics.selectionAsync(); }}
                  style={[styles.levOption, {
                    backgroundColor: leverage === l ? colors.primary + "22" : colors.secondary,
                    borderColor: leverage === l ? colors.primary : colors.border
                  }]}>
                  <Text style={[styles.levOptionText, { color: leverage === l ? colors.primary : colors.foreground }]}>{l}x</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity onPress={() => setShowLevModal(false)} style={[styles.cancelModalBtn, { backgroundColor: colors.secondary, marginTop: 12 }]}>
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
  pairBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  pairText: { fontSize: 15, fontFamily: "Inter_700Bold" },
  perpBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  perpText: { fontSize: 9, fontFamily: "Inter_700Bold" },
  mainPrice: { fontSize: 20, fontFamily: "Inter_700Bold" },
  statsBar: { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1 },
  statItem: { flex: 1, alignItems: "center" },
  statLabel: { fontSize: 9, fontFamily: "Inter_400Regular", marginBottom: 2 },
  statValue: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  card: { margin: 8, borderRadius: 14, borderWidth: 1, padding: 12 },
  sideTabs: { flexDirection: "row", borderBottomWidth: 1, marginBottom: 12 },
  sideTab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 10, borderBottomWidth: 2 },
  sideTabText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  typeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  typeGroup: { flex: 1, flexDirection: "row", borderRadius: 8, overflow: "hidden", borderWidth: 1 },
  typeBtn: { flex: 1, paddingVertical: 6, alignItems: "center" },
  typeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  levBtn: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  levText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  label: { fontSize: 11, fontFamily: "Inter_400Regular" },
  value: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  inputWrap: { flexDirection: "row", alignItems: "center", borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8 },
  inputLabel: { fontSize: 11, fontFamily: "Inter_500Medium", flex: 1 },
  inputField: { flex: 1, fontSize: 13, fontFamily: "Inter_600SemiBold", textAlign: "right", padding: 0 },
  pctRow: { flexDirection: "row", gap: 6, marginBottom: 10 },
  pctBtn: { flex: 1, paddingVertical: 5, borderRadius: 6, borderWidth: 1, alignItems: "center" },
  pctText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  summary: { borderRadius: 10, borderWidth: 1, padding: 10, marginBottom: 10 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  summaryLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  summaryValue: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  tpslRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  tpslBtn: { flex: 1, borderWidth: 1, borderRadius: 8, paddingVertical: 8, alignItems: "center" },
  tpslText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  submitBtn: { flexDirection: "row", borderRadius: 10, paddingVertical: 14, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  submitText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff" },
  feeNote: { fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center" },
  tabRow: { flexDirection: "row", borderBottomWidth: 1, marginBottom: 12 },
  bottomTab: { flex: 1, paddingVertical: 10, alignItems: "center", borderBottomWidth: 2 },
  bottomTabText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  positionCard: { borderRadius: 10, borderWidth: 1, padding: 10, marginBottom: 8 },
  posHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  posSymbol: { fontSize: 13, fontFamily: "Inter_700Bold" },
  sideBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5 },
  sideBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  posPnl: { marginLeft: "auto", fontSize: 12, fontFamily: "Inter_700Bold" },
  posPnlPct: { fontSize: 11, fontFamily: "Inter_500Medium" },
  posGrid: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginBottom: 8 },
  posItem: { width: "30%", marginBottom: 4 },
  posLabel: { fontSize: 9, fontFamily: "Inter_400Regular" },
  posValue: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  posActions: { flexDirection: "row", gap: 8 },
  closeBtn: { flex: 1, borderWidth: 1, borderRadius: 8, paddingVertical: 8, alignItems: "center" },
  closeBtnText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  editBtn: { flex: 1, borderWidth: 1, borderRadius: 8, paddingVertical: 8, alignItems: "center" },
  editBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  emptyState: { alignItems: "center", paddingVertical: 32, gap: 8 },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "#00000088" },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, padding: 16, paddingBottom: 32 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  modalTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 12 },
  pairOption: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 14, borderTopWidth: 1 },
  pairOptionText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  cancelModalBtn: { borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  cancelModalText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  levGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  levOption: { width: "22%", paddingVertical: 10, borderRadius: 8, borderWidth: 1, alignItems: "center" },
  levOptionText: { fontSize: 13, fontFamily: "Inter_700Bold" },
} as any);
