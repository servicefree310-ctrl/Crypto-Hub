import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform, Switch
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

interface SettingRow {
  icon: string; label: string; value?: string; type: "nav" | "toggle" | "badge";
  badge?: string; badgeColor?: string; toggled?: boolean;
}

export default function AccountScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [biometric, setBiometric] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [priceAlert, setPriceAlert] = useState(false);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const sections: { title: string; items: SettingRow[] }[] = [
    {
      title: "Security",
      items: [
        { icon: "shield", label: "Identity Verification", type: "badge", badge: "Verified", badgeColor: colors.success },
        { icon: "key", label: "Change Password", type: "nav" },
        { icon: "smartphone", label: "Biometric Login", type: "toggle", toggled: biometric },
        { icon: "lock", label: "Anti-Phishing Code", type: "nav", value: "Enabled" },
        { icon: "wifi-off", label: "Withdrawal Whitelist", type: "nav", value: "Off" },
      ],
    },
    {
      title: "Account",
      items: [
        { icon: "dollar-sign", label: "Referral Program", type: "nav", value: "Earn up to 40%" },
        { icon: "credit-card", label: "Payment Methods", type: "nav" },
        { icon: "code", label: "API Management", type: "nav" },
        { icon: "activity", label: "Login Activity", type: "nav" },
      ],
    },
    {
      title: "Preferences",
      items: [
        { icon: "bell", label: "Push Notifications", type: "toggle", toggled: notifications },
        { icon: "trending-up", label: "Price Alerts", type: "toggle", toggled: priceAlert },
        { icon: "globe", label: "Language", type: "nav", value: "English" },
        { icon: "dollar-sign", label: "Currency", type: "nav", value: "USD" },
      ],
    },
    {
      title: "Support",
      items: [
        { icon: "help-circle", label: "Help Center", type: "nav" },
        { icon: "message-circle", label: "Live Chat", type: "nav" },
        { icon: "file-text", label: "Terms of Service", type: "nav" },
        { icon: "eye", label: "Privacy Policy", type: "nav" },
      ],
    },
  ];

  const handleToggle = (label: string, v: boolean) => {
    Haptics.selectionAsync();
    if (label === "Biometric Login") setBiometric(v);
    if (label === "Push Notifications") setNotifications(v);
    if (label === "Price Alerts") setPriceAlert(v);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? bottomPad + 84 : 90 }}>

        {/* Profile card */}
        <View style={[styles.profileCard, { paddingTop: topPad + 12, backgroundColor: colors.card }]}>
          <View style={styles.avatarWrap}>
            <View style={[styles.avatar, { backgroundColor: colors.primary + "22" }]}>
              <Text style={[styles.avatarText, { color: colors.primary }]}>C</Text>
            </View>
            <View style={[styles.verifiedBadge, { backgroundColor: colors.success }]}>
              <Feather name="check" size={8} color="#fff" />
            </View>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.foreground }]}>CryptoX User</Text>
            <Text style={[styles.profileEmail, { color: colors.mutedForeground }]}>user@cryptox.com</Text>
          </View>
          <TouchableOpacity style={[styles.editBtn, { borderColor: colors.border }]}>
            <Feather name="edit-2" size={14} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={[styles.statsRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {[
            { label: "UID", value: "581 234 789" },
            { label: "VIP Level", value: "VIP 0" },
            { label: "Maker Fee", value: "0.10%" },
            { label: "Taker Fee", value: "0.10%" },
          ].map((s, i) => (
            <View key={s.label} style={[styles.statItem, { borderLeftWidth: i > 0 ? 1 : 0, borderLeftColor: colors.border }]}>
              <Text style={[styles.statValue, { color: colors.foreground }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Settings sections */}
        {sections.map(section => (
          <View key={section.title} style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{section.title}</Text>
            {section.items.map((item, i) => (
              <TouchableOpacity
                key={item.label}
                testID={`setting-${item.label.replace(/\s+/g, "-").toLowerCase()}`}
                onPress={() => item.type !== "toggle" && Haptics.selectionAsync()}
                activeOpacity={item.type === "toggle" ? 1 : 0.7}
                style={[styles.settingRow, { borderTopColor: colors.border, borderTopWidth: i > 0 ? 1 : 0 }]}
              >
                <View style={[styles.settingIcon, { backgroundColor: colors.secondary }]}>
                  <Feather name={item.icon as any} size={16} color={colors.primary} />
                </View>
                <Text style={[styles.settingLabel, { color: colors.foreground }]}>{item.label}</Text>
                <View style={styles.settingRight}>
                  {item.type === "nav" && item.value && (
                    <Text style={[styles.settingValue, { color: colors.mutedForeground }]}>{item.value}</Text>
                  )}
                  {item.type === "badge" && (
                    <View style={[styles.badge, { backgroundColor: (item.badgeColor || colors.success) + "22" }]}>
                      <Text style={[styles.badgeText, { color: item.badgeColor || colors.success }]}>{item.badge}</Text>
                    </View>
                  )}
                  {item.type === "toggle" && (
                    <Switch
                      value={item.label === "Biometric Login" ? biometric : item.label === "Push Notifications" ? notifications : priceAlert}
                      onValueChange={v => handleToggle(item.label, v)}
                      trackColor={{ false: colors.border, true: colors.primary + "80" }}
                      thumbColor={item.toggled ? colors.primary : colors.mutedForeground}
                    />
                  )}
                  {item.type === "nav" && (
                    <Feather name="chevron-right" size={15} color={colors.mutedForeground} />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ))}

        {/* Logout */}
        <TouchableOpacity
          testID="btn-logout"
          onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
          style={[styles.logoutBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Feather name="log-out" size={16} color={colors.destructive} />
          <Text style={[styles.logoutText, { color: colors.destructive }]}>Log Out</Text>
        </TouchableOpacity>

        <Text style={[styles.versionText, { color: colors.mutedForeground }]}>CryptoX v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  profileCard: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingBottom: 20, gap: 14 },
  avatarWrap: { position: "relative" },
  avatar: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 28, fontFamily: "Inter_700Bold" },
  verifiedBadge: { position: "absolute", bottom: 0, right: 0, width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#0b0e11" },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 18, fontFamily: "Inter_700Bold" },
  profileEmail: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  editBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  statsRow: { flexDirection: "row", marginHorizontal: 8, marginBottom: 8, borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  statItem: { flex: 1, alignItems: "center", paddingVertical: 14 },
  statValue: { fontSize: 12, fontFamily: "Inter_700Bold", marginBottom: 2 },
  statLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
  section: { marginHorizontal: 8, marginBottom: 8, borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  sectionTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  settingRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  settingIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  settingLabel: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  settingRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  settingValue: { fontSize: 12, fontFamily: "Inter_400Regular" },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginHorizontal: 8, marginBottom: 8, borderRadius: 14, borderWidth: 1, paddingVertical: 16 },
  logoutText: { fontSize: 15, fontFamily: "Inter_700Bold" },
  versionText: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", marginBottom: 8 },
});
