import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

export default function BottomNav() {
  const router = useRouter();

  const items = [
    { label: "Home", icon: <Ionicons name="home-outline" size={22} color="#fff" />, path: "/shopkeeperDashboard" },
    { label: "Orders", icon: <Ionicons name="receipt-outline" size={22} color="#fff" />, path: "/shopkeeperDashboard/orders" },
    { label: "Reports", icon: <MaterialCommunityIcons name="flag-outline" size={22} color="#fff" />, path: "/shopkeeperDashboard/reports" },
    {
      label: "Profile",
      icon: <Ionicons name="person-circle-outline" size={22} color="#fff" />,
      path: { pathname: "/settings", params: { role: "shopkeeper" } },
    },
  ];

  return (
    <View style={styles.bottomNav}>
      {items.map((item) => (
        <TouchableOpacity key={item.label} style={styles.navItem} onPress={() => router.push(item.path)}>
          {item.icon}
          <Text style={styles.navText}>{item.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNav: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 14,
    height: 68,
    borderRadius: 18,
    backgroundColor: "#2e4466",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  navItem: { flex: 1, alignItems: "center", justifyContent: "center" },
  navText: { color: "#fff", fontSize: 11, fontWeight: "800", marginTop: 4 },
});
