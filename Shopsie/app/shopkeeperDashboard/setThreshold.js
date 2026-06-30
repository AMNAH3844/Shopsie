import React, { useEffect, useState } from "react";
import { API_URLS } from "../../src/services/apiConfig";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Platform,
  StatusBar,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import BottomNav from "./BottomNav.js";

export default function SetThreshold() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [thresholds, setThresholds] = useState({});

  // const API_URL = "http://172.20.140.250:5000/api/shopkeeper";

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        const res = await fetch(API_URLS.GET_PRODUCTS, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setProducts(data);
      } catch (err) {
        console.error("Error fetching products:", err);
      }
    };
    fetchProducts();
  }, []);

  const setThreshold = async (id) => {
    if (!thresholds[id]) {
      Alert.alert("Error", "Please enter a value first.");
      return;
    }

    const token = await AsyncStorage.getItem("token");
    try {
      const res = await fetch(`${API_URLS.SET_THRESHOLD}/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ threshold: Number(thresholds[id]) }),
      });

      if (!res.ok) throw new Error("Failed");

      const updated = await res.json();
      setProducts((prev) =>
        prev.map((p) => (p.id === updated.id ? updated : p)),
      );
      setThresholds({ ...thresholds, [id]: "" });
      Alert.alert("Success", "Threshold updated!");
    } catch (err) {
      Alert.alert("Error", "Could not set threshold");
    }
  };

  const deleteThreshold = async (id) => {
    const token = await AsyncStorage.getItem("token");
    try {
      const res = await fetch(`${API_URLS.SET_THRESHOLD}/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ threshold: null }),
      });
      if (!res.ok) throw new Error("Failed");
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, threshold: null } : p)),
      );
      Alert.alert("Deleted", "Threshold removed successfully.");
    } catch (err) {
      Alert.alert("Error", "Could not delete threshold");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={localStyles.mainContainer}>
        {/* EXACT HEADER IMPLEMENTATION */}
        <LinearGradient
          colors={["#eef4fe", "#2e4466"]}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 0 }}
          style={localStyles.gradientHeader}
        >
          <TouchableOpacity
            onPress={() =>
              router.canGoBack()
                ? router.back()
                : router.replace("/shopkeeperDashboard")
            }
          >
            <Ionicons name="chevron-back" size={28} color="#eef4fe" />
          </TouchableOpacity>
          <View style={localStyles.headerCenterContainer}>
            <Text style={localStyles.headerTitleText}>Set Threshold</Text>
          </View>
          <View style={{ width: 28 }} />
        </LinearGradient>

        {/* PRODUCT LIST BODY */}
        <FlatList
          data={products}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={localStyles.scrollContainer}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={localStyles.sectionHeading}>Inventory Status</Text>
          }
          renderItem={({ item }) => {
            const isLowStock =
              item.threshold != null && item.quantity <= item.threshold;

            return (
              <View
                style={[
                  localStyles.card,
                  isLowStock && localStyles.lowStockCard,
                ]}
              >
                <View style={localStyles.productHeaderRow}>
                  <Text style={localStyles.productTitle}>{item.name}</Text>
                  {isLowStock && (
                    <View style={localStyles.lowStockPill}>
                      <Text style={localStyles.lowStockPillText}>
                        Fill stock
                      </Text>
                    </View>
                  )}
                </View>

                <Text
                  style={[
                    localStyles.stockLine,
                    isLowStock && localStyles.lowStockText,
                  ]}
                >
                  Current Stock: {item.quantity}
                </Text>

                {item.threshold ? (
                  <View style={localStyles.badgeRow}>
                    <View
                      style={[
                        localStyles.statusBadge,
                        isLowStock && localStyles.lowStatusBadge,
                      ]}
                    >
                      <Text
                        style={[
                          localStyles.statusBadgeText,
                          isLowStock && localStyles.lowStockText,
                        ]}
                      >
                        Current Alert Line: {item.threshold} units
                      </Text>
                    </View>
                  </View>
                ) : null}

                <Text style={localStyles.fieldLabel}>
                  Configure Alert Limit
                </Text>
                <View style={localStyles.actionContainer}>
                  <View style={localStyles.inputWrapper}>
                    <Ionicons
                      name="speedometer-outline"
                      size={20}
                      color="#64748B"
                      style={localStyles.inputIcon}
                    />
                    <TextInput
                      placeholder="Set Threshold"
                      keyboardType="numeric"
                      placeholderTextColor="#94A3B8"
                      style={localStyles.baseInputOverride}
                      value={thresholds[item.id] || ""}
                      onChangeText={(t) =>
                        setThresholds({ ...thresholds, [item.id]: t })
                      }
                    />
                  </View>

                  <TouchableOpacity
                    style={localStyles.inlineSetButton}
                    onPress={() => setThreshold(item.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={localStyles.inlineSetButtonText}>Set</Text>
                  </TouchableOpacity>

                  {item.threshold && (
                    <TouchableOpacity
                      onPress={() =>
                        Alert.alert(
                          "Remove Threshold",
                          "Are you sure you want to remove this threshold?",
                          [
                            { text: "Cancel", style: "cancel" },
                            {
                              text: "Remove",
                              style: "destructive",
                              onPress: () => deleteThreshold(item.id),
                            },
                          ],
                        )
                      }
                    >
                      <MaterialIcons
                        name="delete-forever"
                        size={26}
                        color="#EF4444"
                      />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          }}
        />

        {/* EXACT FOOTER NAVIGATION */}
        <BottomNav />
      </View>
    </SafeAreaView>
  );
}

const localStyles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: "#F8FAFC" },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingBottom: 75,
  },
  gradientHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 26,
    width: "100%",
    elevation: 3,
  },
  headerCenterContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2e4466",
    textAlign: "center",
    letterSpacing: -0.3,
  },

  sectionHeading: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginTop: 22,
    marginBottom: 6,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginTop: 6,
    marginBottom: 10,
    shadowColor: "#475569",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  lowStockCard: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FCA5A5",
    borderWidth: 1.5,
  },
  productHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  productTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 8,
  },
  stockLine: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
  },
  lowStockPill: {
    backgroundColor: "#EF4444",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
  },
  lowStockPillText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
  lowStockText: { color: "#991B1B" },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  badgeRow: { flexDirection: "row", marginBottom: 14 },
  statusBadge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  lowStatusBadge: { backgroundColor: "#FEE2E2", borderColor: "#FCA5A5" },
  statusBadgeText: { color: "#1E40AF", fontSize: 13, fontWeight: "600" },

  actionContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },
  inputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: "#FFFFFF",
    height: 48,
  },
  inputIcon: { marginRight: 8 },
  baseInputOverride: {
    flex: 1,
    borderWidth: 0,
    height: "100%",
    paddingLeft: 0,
    margin: 0,
    backgroundColor: "transparent",
    fontSize: 15,
    color: "#0F172A",
    ...Platform.select({ web: { outlineStyle: "none" } }),
  },

  inlineSetButton: {
    backgroundColor: "#22C55E",
    height: 48,
    paddingHorizontal: 20,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
    shadowColor: "#22C55E",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  inlineSetButtonText: { color: "white", fontWeight: "700", fontSize: 15 },
  inlineDeleteButton: {
    marginLeft: 10,
    justifyContent: "center",
    alignItems: "center",
    height: 48,
  },
});
