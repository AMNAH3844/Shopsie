import React, { useEffect, useState } from "react";
import { API_URLS } from "../../src/services/apiConfig";
import {
  View,
  Text,
  FlatList,
  TextInput,
  Alert,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import BottomNav from "../shopkeeperDashboard/BottomNav";

export default function ViewStock() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        const res = await fetch(API_URLS.GET_PRODUCTS, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setProducts(Array.isArray(data) ? data : []);
      } catch (err) {
        Alert.alert("Error", "Failed to fetch products");
      }
    };

    fetchProducts();
  }, []);

  const filteredProducts = products.filter((p) =>
    p.name?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={localStyles.mainContainer}>
        {/* EXACT FIXED HEADER IMPLEMENTATION */}
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
            <Text style={localStyles.headerTitleText}>View Stock</Text>
          </View>
          <View style={{ width: 28 }} />
        </LinearGradient>

        {/* SEARCH CONTAINER SECTION */}
        <View style={localStyles.searchSectionWrapper}>
          <View style={localStyles.searchBarContainer}>
            <Ionicons
              name="search-outline"
              size={20}
              color="#64748B"
              style={localStyles.inputIcon}
            />
            <TextInput
              placeholder="Search by product name..."
              placeholderTextColor="#94A3B8"
              value={search}
              onChangeText={setSearch}
              style={localStyles.baseInputOverride}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* STOCK INVENTORY DATA ENGINE */}
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={localStyles.scrollContainer}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={localStyles.sectionHeading}>
              Current Inventory Status
            </Text>
          }
          renderItem={({ item }) => {
            const isLowStock = item.quantity <= (item.threshold || 0);

            return (
              <View style={localStyles.card}>
                <View style={localStyles.cardHeaderRow}>
                  <Text style={localStyles.productTitle}>{item.name}</Text>

                  {/* DYNAMIC ALERT LIMIT BADGE STATUS */}
                  <View
                    style={[
                      localStyles.stockBadge,
                      isLowStock
                        ? localStyles.lowStockBadge
                        : localStyles.normalStockBadge,
                    ]}
                  >
                    <Text
                      style={[
                        localStyles.stockBadgeText,
                        isLowStock
                          ? localStyles.lowStockText
                          : localStyles.normalStockText,
                      ]}
                    >
                      {isLowStock
                        ? `⚠️ Low Stock: ${item.quantity}`
                        : `${item.quantity} Available`}
                    </Text>
                  </View>
                </View>

                {/* Information Grid Section */}
                <View style={localStyles.infoGrid}>
                  <View style={localStyles.infoColumn}>
                    <Text style={localStyles.fieldLabel}>Price</Text>
                    <Text style={localStyles.infoValue}>Rs. {item.price}</Text>
                  </View>

                  <View style={localStyles.infoColumn}>
                    <Text style={localStyles.fieldLabel}>Alert Limit</Text>
                    <Text
                      style={[
                        localStyles.infoValue,
                        isLowStock && { color: "#EF4444" },
                      ]}
                    >
                      {item.threshold || "None Set"}
                    </Text>
                  </View>
                </View>

                {/* Bottom Full Specifications Panel */}
                <View style={localStyles.specContainer}>
                  <Text style={localStyles.fieldLabel}>Specifications</Text>
                  <Text style={localStyles.specValueText} numberOfLines={2}>
                    {item.specification ||
                      "No supplemental details provided for this inventory stock profile."}
                  </Text>
                </View>
              </View>
            );
          }}
        />

        {/* FIXED BOTTOM NAVBAR IMPLEMENTATION */}
        <BottomNav />
      </View>
    </SafeAreaView>
  );
}

const localStyles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: "#F8FAFC" },
  searchSectionWrapper: { paddingHorizontal: 20, marginTop: 16 },

  // ADJUSTED: Increased bottom padding from 100 to 110 to clear the absolute BottomNav cleanly
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

  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: "#FFFFFF",
    height: 50,
  },
  inputIcon: { marginRight: 8 },
  baseInputOverride: {
    flex: 1,
    borderWidth: 0,
    height: "100%",
    paddingLeft: 0,
    margin: 0,
    backgroundColor: "transparent",
    fontSize: 14,
    color: "#0F172A",
    ...Platform.select({ web: { outlineStyle: "none" } }),
  },

  sectionHeading: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginTop: 14,
    marginBottom: 6,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginTop: 6,
    marginBottom: 12,
    shadowColor: "#475569",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
    width: "100%",
  },
  productTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
    flex: 1,
    marginRight: 8,
  },

  stockBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  normalStockBadge: { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0" },
  normalStockText: { color: "#065F46" },
  lowStockBadge: { backgroundColor: "#FEF2F2", borderColor: "#FCA5A5" },
  lowStockText: { color: "#991B1B" },
  stockBadgeText: { fontSize: 12, fontWeight: "700" },

  infoGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#FAFAFA",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    marginBottom: 12,
  },

  // ADJUSTED: Changed center to left/start alignment to create a unified design system look with the update page
  infoColumn: { flex: 1, alignItems: "flex-start", paddingLeft: 4 },
  fieldLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748B",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoValue: { fontSize: 14, fontWeight: "700", color: "#1E293B" },

  specContainer: { borderTopWidth: 1, borderColor: "#F1F5F9", paddingTop: 10 },
  specValueText: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 18,
    marginTop: 2,
  },
});
