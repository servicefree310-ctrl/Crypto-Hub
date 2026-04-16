import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

const ASSETS = [
  { symbol: "USDT", name: "Tether",   amount: "5,847.32",  value: "5,847.32",  pct: 48.2, color: "#26A17B" },
  { symbol: "BTC",  name: "Bitcoin",  amount: "0.1354",    value: "8,704.57",  pct: 31.5, color: "#F7931A" },
  { symbol: "ETH",  name: "Ethereum", amount: "3.7000",    value: "11,766.74", pct: 14.8, color: "#627EEA" },
  { symbol: "BNB",  name: "BNB",      amount: "5.00",      value: "2,902.00",  pct: 5.5,  color: "#F3BA2F" },
];

const TXS = [
  { type: "deposit",  asset: "USDT",  amount: "+1,000.00", time: "Today 14:32",  status: "Completed" },
  { type: "buy",      asset: "BTC",   amount: "+0.0500",   time: "Today 13:15",  status: "Completed" },
  { type: "sell",     asset: "ETH",   amount: "-1.2000",   time: "Yesterday",    status: "Completed" },
  { type: "withdraw", asset: "USDT",  amount: "-500.00",   time: "Apr 14",       status: "Completed" },
  { type: "buy",      asset: "BNB",   amount: "+5.00",     time: "Apr 13",       status: "Completed" },
];

const TX_ICONS: Record<string, string> = { deposit: "download", withdraw: "upload", buy: "shopping-cart", sell: "tag" };
const TX_COLORS: Record<string, string> = { deposit: "#0ecb81", withdraw: "#f6465d", buy: "#fcd535", sell: "#f6465d" };

const TOTAL = 29220.63;
const DAILY_PNL = +247.35;
const DAILY_PCT = +0.85;

function MiniPieChart({ assets }: { assets: typeof ASSETS }) {
  const size = 120;
  const cx = size / 2, cy = size / 2, r = 42, stroke = 18;
  const total = assets.reduce((s, a) => s + a.pct, 0);
  let startAngle = -Math.PI / 2;

  return (
    <View style={{ width: size, height: size }}>
      {assets.map((a, i) => {
        const sweep = (a.pct / total) * 2 * Math.PI;
        const endAngle = startAngle + sweep;
        const x1 = cx + r * Math.cos(startAngle);
        const y1 = cy + r * Math.sin(startAngle);
        const x2 = cx + r * Math.cos(endAngle);
        const y2 = cy + r * Math.sin(endAngle);
        const largeArc = sweep > Math.PI ? 1 : 0;
        const result = (
          <View key={a.symbol} style={{
            position: "absolute",
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: a.color,
            left: cx + (r + 24) * Math.cos(startAngle + sweep / 2) - 4,
            top: cy + (r + 24) * Math.sin(startAngle + sweep / 2) - 4,
          }} />
        );
        startAngle = endAngle;
        return result;
      })}
      <View style={{
        position: "absolute",
        top: cy - r - stroke / 2,
        left: cx - r - stroke / 2,
        width: (r + stroke / 2) * 2,
        height: (r + stroke / 2) * 2,
        borderRadius: (r + stroke / 2),
        borderWidth: stroke,
        borderColor: "#1e2329",
        overflow: "hidden",
      }} />
      <View style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }]}>
        <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: "#848e9c" }}>Portfolio</Text>
        <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: "#eaecef" }}>$29.2K</Text>
      </View>
    </View>
  );
}

export default function WalletScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [hideBalance, setHideBalance] = useState(false);
  const [activeTab, setActiveTab] = useState<"assets" | "txs">("assets");
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? bottomPad + 84 : 90 }}>

        {/* Header */}
        <View style={[styles.headerCard, { paddingTop: topPad + 12, backgroundColor: colors.card }]}>
          <View style={styles.headerTop}>
            <Text style={[styles.headerLabel, { color: colors.mutedForeground }]}>Total Balance (USDT)</Text>
            <TouchableOpacity onPress={() => { setHideBalance(v => !v); Haptics.selectionAsync(); }}>
              <Feather name={hideBalance ? "eye-off" : "eye"} size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.totalBalance, { color: colors.foreground }]}>
            {hideBalance ? "••••••" : `$${TOTAL.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
          </Text>
          <View style={styles.pnlRow}>
            <Feather name={DAILY_PNL >= 0 ? "trending-up" : "trending-down"} size={14} color={DAILY_PNL >= 0 ? colors.success : colors.destructive} />
            <Text style={[styles.pnlText, { color: DAILY_PNL >= 0 ? colors.success : colors.destructive }]}>
              {DAILY_PNL >= 0 ? "+" : ""}{DAILY_PNL.toFixed(2)} ({DAILY_PCT >= 0 ? "+" : ""}{DAILY_PCT.toFixed(2)}%) today
            </Text>
          </View>

          {/* Action buttons */}
          <View style={styles.actionRow}>
            {[
              { icon: "download", label: "Deposit" },
              { icon: "upload", label: "Withdraw" },
              { icon: "repeat", label: "Transfer" },
              { icon: "shopping-cart", label: "Buy Crypto" },
            ].map(a => (
              <TouchableOpacity key={a.label} onPress={() => Haptics.selectionAsync()} style={styles.actionBtn}>
                <View style={[styles.actionIcon, { backgroundColor: colors.secondary }]}>
                  <Feather name={a.icon as any} size={18} color={colors.primary} />
                </View>
                <Text style={[styles.actionLabel, { color: colors.mutedForeground }]}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Portfolio + Allocation */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Allocation</Text>
          <View style={styles.allocationRow}>
            <MiniPieChart assets={ASSETS} />
            <View style={styles.legendCol}>
              {ASSETS.map(a => (
                <View key={a.symbol} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: a.color }]} />
                  <Text style={[styles.legendSym, { color: colors.foreground }]}>{a.symbol}</Text>
                  <Text style={[styles.legendPct, { color: colors.mutedForeground }]}>{a.pct}%</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.tabRow, { borderBottomColor: colors.border }]}>
            {(["assets","txs"] as const).map(t => (
              <TouchableOpacity key={t} onPress={() => setActiveTab(t)}
                style={[styles.tab, { borderBottomColor: activeTab === t ? colors.primary : "transparent" }]}>
                <Text style={[styles.tabText, { color: activeTab === t ? colors.primary : colors.mutedForeground }]}>
                  {t === "assets" ? "Assets" : "Transactions"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {activeTab === "assets" && (
            <View>
              {ASSETS.map((a, i) => (
                <View key={a.symbol} style={[styles.assetRow, { borderTopColor: colors.border, borderTopWidth: i > 0 ? 1 : 0 }]}>
                  <View style={[styles.assetLogo, { backgroundColor: a.color + "22" }]}>
                    <Text style={[styles.assetLogoText, { color: a.color }]}>{a.symbol[0]}</Text>
                  </View>
                  <View style={styles.assetInfo}>
                    <Text style={[styles.assetSym, { color: colors.foreground }]}>{a.symbol}</Text>
                    <Text style={[styles.assetName, { color: colors.mutedForeground }]}>{a.name}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={[styles.assetAmount, { color: colors.foreground }]}>{a.amount}</Text>
                    <Text style={[styles.assetValue, { color: colors.mutedForeground }]}>${a.value}</Text>
                  </View>
                  {/* Progress bar */}
                  <View style={[styles.assetBar, { backgroundColor: colors.border }]}>
                    <View style={[styles.assetBarFill, { backgroundColor: a.color, width: `${a.pct}%` as any }]} />
                  </View>
                </View>
              ))}
            </View>
          )}

          {activeTab === "txs" && (
            <View>
              {TXS.map((tx, i) => (
                <View key={i} style={[styles.txRow, { borderTopColor: colors.border, borderTopWidth: i > 0 ? 1 : 0 }]}>
                  <View style={[styles.txIcon, { backgroundColor: TX_COLORS[tx.type] + "22" }]}>
                    <Feather name={TX_ICONS[tx.type] as any} size={16} color={TX_COLORS[tx.type]} />
                  </View>
                  <View style={styles.txInfo}>
                    <Text style={[styles.txType, { color: colors.foreground }]}>
                      {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)} {tx.asset}
                    </Text>
                    <Text style={[styles.txTime, { color: colors.mutedForeground }]}>{tx.time}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={[styles.txAmount, { color: tx.amount.startsWith("+") ? colors.success : colors.destructive }]}>
                      {tx.amount}
                    </Text>
                    <Text style={[styles.txStatus, { color: colors.success }]}>{tx.status}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerCard: { paddingHorizontal: 20, paddingBottom: 20 },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  headerLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  totalBalance: { fontSize: 36, fontFamily: "Inter_700Bold", marginBottom: 4 },
  pnlRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 20 },
  pnlText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  actionRow: { flexDirection: "row", justifyContent: "space-between" },
  actionBtn: { alignItems: "center", gap: 6 },
  actionIcon: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  actionLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  card: { margin: 8, borderRadius: 14, borderWidth: 1, padding: 14 },
  cardTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 12 },
  allocationRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  legendCol: { flex: 1, gap: 8 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendSym: { flex: 1, fontSize: 12, fontFamily: "Inter_600SemiBold" },
  legendPct: { fontSize: 12, fontFamily: "Inter_500Medium" },
  tabRow: { flexDirection: "row", borderBottomWidth: 1, marginBottom: 12 },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center", borderBottomWidth: 2 },
  tabText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  assetRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, gap: 10, flexWrap: "wrap" },
  assetLogo: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  assetLogoText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  assetInfo: { flex: 1 },
  assetSym: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  assetName: { fontSize: 11, fontFamily: "Inter_400Regular" },
  assetAmount: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  assetValue: { fontSize: 11, fontFamily: "Inter_400Regular" },
  assetBar: { width: "100%", height: 3, borderRadius: 2, marginTop: 4 },
  assetBarFill: { height: 3, borderRadius: 2 },
  txRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, gap: 10 },
  txIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  txInfo: { flex: 1 },
  txType: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  txTime: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  txAmount: { fontSize: 13, fontFamily: "Inter_700Bold" },
  txStatus: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 2 },
});
