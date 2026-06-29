import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URLS } from "../../src/services/apiConfig"; // Adjust the path if necessary

export default function BottomNav() {
  const router = useRouter();
  const [orderCount, setOrderCount] = useState(0);

  // ================= FETCH ORDER COUNT =================
  const fetchOrderCount = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      // Using the exact config key that matches your ShopkeeperOrders screen
      const res = await fetch(API_URLS.SHOP_ORDER_NOTIFICATION_COUNT, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      setOrderCount(data.count || 0);
    } catch (err) {
      console.log("Order badge error in BottomNav:", err);
    }
  };

  // ================= LIVE POLLING INTERVAL =================
  useEffect(() => {
    fetchOrderCount();

    const interval = setInterval(() => {
      fetchOrderCount();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const items = [
    { 
      label: "Home", 
      icon: <Ionicons name="home" size={22} color="white" />, 
      path: "/shopkeeperDashboard" 
    },
    { 
      label: "Stock", 
      icon: <MaterialCommunityIcons name="package-variant-closed" size={24} color="white" />, 
      path: "/shopkeeperDashboard/viewStock" 
    },
    { 
      label: "Orders", 
      icon: <Ionicons name="receipt" size={24} color="white" />, 
      path: "/shopkeeperDashboard/orders" 
    },
  ];

  return (
    <View style={styles.bottomNav}>
      {items.map((item) => (
        <TouchableOpacity 
          key={item.label} 
          style={styles.navItem} 
          onPress={() => router.replace(item.path)}
        >
          <View style={{ position: "relative" }}>
            {item.icon}

            {/* Render Red Badge Count on Orders Icon Only */}
            {item.label === "Orders" && orderCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{orderCount}</Text>
              </View>
            )}
          </View>
          
          <Text style={styles.navText}>{item.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
bottomNav: {
  position: "absolute",
  left: 0,
  right: 0,
  bottom: 0,

  height: 55,

  backgroundColor: "#2e4466",
  flexDirection: "row",
  justifyContent: "space-around",
  alignItems: "center",

  elevation: 0,
  borderTopWidth: 0,
  zIndex: 1000,
},
 navItem: {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  paddingVertical: 4,
},
 navText: {
  color: "white",
  fontSize: 12,
  marginTop: 0,
  textAlign: "center",
  fontWeight: "500",
},
  badge: {
    position: "absolute",
    top: -6,
    right: -10,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "900",
  },
});