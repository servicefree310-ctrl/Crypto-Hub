import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, StatusBar, Platform, Animated
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

interface Coin {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change: number;
  volume: string;
  mcap: string;
  color: string;
  history: number[];
}

const BASE_COINS: Coin[] = [
  { id: "btc", symbol: "BTC", name: "Bitcoin",   price: 64250.50, change:  2.5,  volume: "32.5B", mcap: "1.26T", color: "#F7931A", history: [61000,62200,61800,63400,62900,64100,63800,65200,64500,64251] },
  { id: "eth", symbol: "ETH", name: "Ethereum",  price:  3180.20, change: -1.2,  volume: "15.2B", mcap: "382B",  color: "#627EEA", history: [3280,3210,3310,3180,3220,3150,3190,3100,3200,3180] },
  { id: "bnb", symbol: "BNB", name: "BNB",       price:   580.40, change:  5.4,  volume: "2.1B",  mcap: "84B",   color: "#F3BA2F", history: [555,560,558,568,572,576,574,580,578,580] },
  { id: "sol", symbol: "SOL", name: "Solana",    price:   142.60, change:  8.2,  volume: "4.5B",  mcap: "65B",   color: "#9945FF", history: [130,133,135,138,140,137,142,145,143,143] },
  { id: "ada", symbol: "ADA", name: "Cardano",   price:     0.45, change: -0.5,  volume: "350M",  mcap: "16B",   color: "#0033AD", history: [0.46,0.455,0.46,0.458,0.452,0.456,0.45,0.448,0.452,0.45] },
  { id: "xrp", symbol: "XRP", name: "XRP",       price:     0.59, change:  1.8,  volume: "1.2B",  mcap: "32B",   color: "#00AAE4", history: [0.575,0.578,0.58,0.585,0.582,0.588,0.586,0.590,0.588,0.59] },
  { id: "doge",symbol: "DOGE",name: "Dogecoin",  price:    0.168, change:  3.1,  volume: "890M",  mcap: "24B",   color: "#C2A633", history: [0.160,0.162,0.161,0.163,0.165,0.164,0.166,0.165,0.167,0.168] },
  { id: "dot", symbol: "DOT", name: "Polkadot",  price:     7.82, change: -2.1,  volume: "310M",  mcap: "10B",   color: "#E6007A", history: [8.1,8.0,7.9,7.85,7.88,7.82,7.78,7.80,7.83,7.82] },
  { id: "avax",symbol: "AVAX",name: "Avalanche", price:    38.40, change:  4.6,  volume: "520M",  mcap: "16B",   color: "#E84142", history: [36,36.5,37,37.5,38,37.8,38.2,38.5,38.3,38.4] },
  { id: "link",symbol: "LINK",name: "Chainlink", price:    14.80, change:  1.2,  volume: "280M",  mcap: "8.7B",  color: "#2A5ADA", history: [14.2,14.4,14.3,14.5,14.6,14.4,14.7,14.8,14.75,14.80] },
];

function Sparkline({ data, color, width = 60, height = 28 }: { data: number[]; color: string; width?: number; height?: number }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const segW = width / (data.length - 1);
  return (
    <View style={{ width, height, overflow: "hidden" }}>
      {data.slice(0, -1).map((val, i) => {
        const nextVal = data[i + 1];
        const x1 = i * segW;
        const y1 = height - ((val - min) / range) * height;
        const y2 = height - ((nextVal - min) / range) * height;
        const segHeight = Math.abs(y2 - y1) || 1;
        const topY = Math.min(y1, y2);
        const angle = Math.atan2(y2 - y1, segW) * (180 / Math.PI);
        const len = Math.sqrt(segW * segW + (y2 - y1) * (y2 - y1));
        return (
          <View
            key={i}
            style={{
              position: "absolute",
              left: x1,
              top: topY,
              width: len,
              height: 1.5,
              backgroundColor: color,
              opacity: 0.9,
              transform: [{ rotate: `${angle}deg` }, { translateX: 0 }],
              transformOrigin: "0 50%",
            } as any}
          />
        );
      })}
    </View>
  );
}

function CoinRow({ item, onPress }: { item: Coin; onPress: () => void }) {
  const colors = useColors();
  const priceAnim = useRef(new Animated.Value(1)).current;
  const isUp = item.change >= 0;

  const flash = () => {
    Animated.sequence([
      Animated.timing(priceAnim, { toValue: 1.06, duration: 120, useNativeDriver: true }),
      Animated.timing(priceAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  useEffect(() => { flash(); }, [item.price]);

  const fmtPrice = (p: number) =>
    p >= 1
      ? p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : p.toFixed(4);

  return (
    <TouchableOpacity
      testID={`coin-row-${item.id}`}
      onPress={() => { onPress(); Haptics.selectionAsync(); }}
      activeOpacity={0.7}
      style={[styles.coinRow, { borderBottomColor: colors.border }]}
    >
      <View style={[styles.coinLogo, { backgroundColor: item.color + "22" }]}>
        <Text style={[styles.coinLogoText, { color: item.color }]}>{item.symbol[0]}</Text>
      </View>
      <View style={styles.coinInfo}>
        <Text style={[styles.coinSymbol, { color: colors.foreground }]}>{item.symbol}</Text>
        <Text style={[styles.coinName, { color: colors.mutedForeground }]}>{item.name}</Text>
      </View>
      <View style={styles.coinSparkline}>
        <Sparkline data={item.history} color={isUp ? "#0ecb81" : "#f6465d"} />
      </View>
      <View style={styles.coinPriceBlock}>
        <Animated.Text style={[styles.coinPrice, { color: colors.foreground, transform: [{ scale: priceAnim }] }]}>
          ${fmtPrice(item.price)}
        </Animated.Text>
        <View style={[styles.changeBadge, { backgroundColor: (isUp ? "#0ecb81" : "#f6465d") + "22" }]}>
          <Text style={[styles.changeText, { color: isUp ? "#0ecb81" : "#f6465d" }]}>
            {isUp ? "+" : ""}{item.change.toFixed(2)}%
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const CATEGORIES = ["All", "Gainers", "Losers", "⭐"];

export default function MarketsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [coins, setCoins] = useState<Coin[]>(BASE_COINS);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [sortBy, setSortBy] = useState<"price" | "change" | "vol">("vol");
  const [favorites, setFavorites] = useState<string[]>(["btc", "eth"]);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  useEffect(() => {
    const iv = setInterval(() => {
      setCoins(prev => prev.map(c => ({
        ...c,
        price: c.price * (1 + (Math.random() - 0.499) * 0.0012),
        history: [...c.history.slice(1), c.price * (1 + (Math.random() - 0.499) * 0.0012)],
      })));
    }, 1800);
    return () => clearInterval(iv);
  }, []);

  const filtered = coins
    .filter(c => {
      const q = search.toLowerCase();
      const matchSearch = c.symbol.toLowerCase().includes(q) || c.name.toLowerCase().includes(q);
      if (category === "Gainers") return matchSearch && c.change > 0;
      if (category === "Losers") return matchSearch && c.change < 0;
      if (category === "⭐") return matchSearch && favorites.includes(c.id);
      return matchSearch;
    })
    .sort((a, b) => {
      if (sortBy === "change") return b.change - a.change;
      if (sortBy === "price") return b.price - a.price;
      return 0;
    });

  const ListHeader = () => (
    <View>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 10 }]}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.primary }]}>CryptoX</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>Live Markets</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={[styles.iconBtn, { backgroundColor: colors.secondary }]}>
            <Feather name="bell" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.iconBtn, { backgroundColor: colors.secondary }]}>
            <Feather name="search" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View style={[styles.searchBar, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
        <Feather name="search" size={15} color={colors.mutedForeground} style={{ marginRight: 8 }} />
        <TextInput
          testID="search-input"
          value={search}
          onChangeText={setSearch}
          placeholder="Search coin..."
          placeholderTextColor={colors.mutedForeground}
          style={[styles.searchInput, { color: colors.foreground }]}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Feather name="x" size={15} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>

      {/* Category tabs */}
      <View style={styles.catRow}>
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat}
            testID={`cat-${cat}`}
            onPress={() => setCategory(cat)}
            style={[
              styles.catTab,
              { borderColor: category === cat ? colors.primary : "transparent", backgroundColor: category === cat ? colors.primary + "18" : "transparent" }
            ]}
          >
            <Text style={[styles.catText, { color: category === cat ? colors.primary : colors.mutedForeground }]}>{cat}</Text>
          </TouchableOpacity>
        ))}
        <View style={{ flex: 1 }} />
        {/* Sort toggle */}
        {(["vol","change","price"] as const).map(s => (
          <TouchableOpacity key={s} onPress={() => setSortBy(s)} style={[styles.sortBtn, { backgroundColor: sortBy === s ? colors.accent : "transparent" }]}>
            <Text style={[styles.sortText, { color: sortBy === s ? colors.foreground : colors.mutedForeground }]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Column headers */}
      <View style={[styles.colHeader, { borderBottomColor: colors.border }]}>
        <Text style={[styles.colHeaderText, { color: colors.mutedForeground, flex: 2 }]}>Name</Text>
        <Text style={[styles.colHeaderText, { color: colors.mutedForeground, width: 70, textAlign: "center" }]}>7D</Text>
        <Text style={[styles.colHeaderText, { color: colors.mutedForeground, flex: 2, textAlign: "right" }]}>Price / 24h</Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        ListHeaderComponent={ListHeader}
        renderItem={({ item }) => (
          <CoinRow
            item={item}
            onPress={() => {}}
          />
        )}
        contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? bottomPad + 84 : 90 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12 },
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  headerRight: { flexDirection: "row", gap: 8 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  searchBar: { flexDirection: "row", alignItems: "center", marginHorizontal: 16, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, borderWidth: 1, marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", padding: 0 },
  catRow: { flexDirection: "row", paddingHorizontal: 12, gap: 6, marginBottom: 4, alignItems: "center" },
  catTab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  catText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  sortBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  sortText: { fontSize: 10, fontFamily: "Inter_500Medium" },
  colHeader: { flexDirection: "row", paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, marginTop: 4 },
  colHeaderText: { fontSize: 10, fontFamily: "Inter_500Medium" },
  coinRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  coinLogo: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", marginRight: 10 },
  coinLogoText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  coinInfo: { flex: 2 },
  coinSymbol: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  coinName: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  coinSparkline: { width: 70, alignItems: "center" },
  coinPriceBlock: { flex: 2, alignItems: "flex-end" },
  coinPrice: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  changeBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5, marginTop: 3 },
  changeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
});
