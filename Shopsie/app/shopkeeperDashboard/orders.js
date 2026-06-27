import React, { useCallback, useState } from "react";
import { API_URLS } from '../../src/services/apiConfig';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import BottomNav from "./BottomNav.js";

// const API_URL = "http://172.20.140.250:5000/api/shopkeeper";

export default function ShopkeeperOrders() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  const fetchOrders = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(API_URLS.SHOP_ORDERS, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load orders");
      setOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      Alert.alert("Error", error.message || "Could not fetch orders");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [fetchOrders])
  );

  const respondToOrder = async (id, action) => {
    try {
      setSavingId(id);
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(`${API_URLS.SHOP_ORDERS}/${id}/respond`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not update order");

      setOrders((prev) => prev.map((order) => (order.id === id ? data : order)));
      Alert.alert("Success", action === "approve" ? "Stock updated." : "Purchase rejected.");
    } catch (error) {
      Alert.alert("Error", error.message || "Could not update order");
    } finally {
      setSavingId(null);
    }
  };

  const renderOrder = ({ item }) => {
    const isPending = item.status === "PENDING";
    const statusStyle =
      item.status === "APPROVED"
        ? localStyles.approvedBadge
        : item.status === "REJECTED"
        ? localStyles.rejectedBadge
        : localStyles.pendingBadge;

    return (
      <View style={localStyles.card}>
        <View style={localStyles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={localStyles.productTitle}>
              {item.productName}
              {item.specification ? ` - ${item.specification}` : ""}
            </Text>
            <Text style={localStyles.messageText}>{item.message}</Text>
          </View>
          <View style={[localStyles.statusBadge, statusStyle]}>
            <Text style={localStyles.statusText}>{item.status}</Text>
          </View>
        </View>

        <View style={localStyles.metaBox}>
          <Text style={localStyles.metaText}>Quantity: {item.quantity}</Text>
          <Text style={localStyles.metaText}>Shop: {item.shopName || "Your shop"}</Text>
          {item.riderName ? <Text style={localStyles.metaText}>Rider: {item.riderName}</Text> : null}
          {item.product ? (
            <Text style={localStyles.metaText}>Current stock: {item.product.quantity}</Text>
          ) : null}
        </View>

        {isPending ? (
          <View style={localStyles.actionRow}>
            <TouchableOpacity
              style={[localStyles.actionButton, localStyles.approveButton]}
              onPress={() => respondToOrder(item.id, "approve")}
              disabled={savingId === item.id}
            >
              <Ionicons name="checkmark" size={20} color="#fff" />
              <Text style={localStyles.actionText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[localStyles.actionButton, localStyles.rejectButton]}
              onPress={() => respondToOrder(item.id, "reject")}
              disabled={savingId === item.id}
            >
              <Ionicons name="close" size={20} color="#fff" />
              <Text style={localStyles.actionText}>Reject</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <View style={localStyles.mainContainer}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={["#eef4fe", "#2e4466"]}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 0 }}
        style={localStyles.gradientHeader}
      >
        <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace("/shopkeeperDashboard"))}>
          <Ionicons name="chevron-back" size={28} color="#eef4fe" />
        </TouchableOpacity>
        <View style={localStyles.headerCenterContainer}>
          <Text style={localStyles.headerTitleText}>Orders</Text>
        </View>
        <TouchableOpacity onPress={fetchOrders}>
          <Ionicons name="refresh" size={24} color="#2e4466" />
        </TouchableOpacity>
      </LinearGradient>

      {loading ? (
        <View style={localStyles.center}>
          <ActivityIndicator size="large" color="#2e4466" />
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={localStyles.scrollContainer}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={<Text style={localStyles.sectionHeading}>Purchase Approvals</Text>}
          ListEmptyComponent={<Text style={localStyles.emptyText}>No rider purchases yet.</Text>}
          renderItem={renderOrder}
        />
      )}

      <BottomNav />
    </View>
  );
}

const localStyles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: "#F8FAFC" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scrollContainer: { paddingHorizontal: 20, paddingBottom: 100 },
  gradientHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 26,
    width: "100%",
    elevation: 3,
  },
  headerCenterContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  headerTitleText: { fontSize: 20, fontWeight: "700", color: "#2e4466", textAlign: "center" },
  sectionHeading: { fontSize: 16, fontWeight: "700", color: "#1E293B", marginTop: 22, marginBottom: 6 },
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
  cardHeader: { flexDirection: "row", alignItems: "flex-start" },
  productTitle: { fontSize: 17, fontWeight: "800", color: "#0F172A", marginRight: 8 },
  messageText: { color: "#475569", fontSize: 13, marginTop: 4, lineHeight: 18 },
  metaBox: { backgroundColor: "#F8FAFC", borderRadius: 12, padding: 10, marginTop: 12, borderWidth: 1, borderColor: "#E2E8F0" },
  metaText: { color: "#334155", fontSize: 13, fontWeight: "600", marginTop: 2 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, borderWidth: 1 },
  pendingBadge: { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" },
  approvedBadge: { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0" },
  rejectedBadge: { backgroundColor: "#FEF2F2", borderColor: "#FCA5A5" },
  statusText: { color: "#1E293B", fontSize: 11, fontWeight: "800" },
  actionRow: { flexDirection: "row", marginTop: 14, gap: 10 },
  actionButton: { flex: 1, height: 44, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  approveButton: { backgroundColor: "#22C55E" },
  rejectButton: { backgroundColor: "#EF4444" },
  actionText: { color: "#fff", fontWeight: "800", marginLeft: 6 },
  emptyText: { textAlign: "center", color: "#94A3B8", marginTop: 40, fontWeight: "700" },
});
