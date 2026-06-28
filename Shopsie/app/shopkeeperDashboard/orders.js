import React, { useCallback, useState, useRef, useEffect } from "react";
import { API_URLS } from '../../src/services/apiConfig';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  Modal,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import BottomNav from "./BottomNav.js";
import { BackHandler } from "react-native";

export default function ShopkeeperOrders() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [orderCount, setOrderCount] = useState(0); 

  // ─── ACTION CONFIRMATION MODAL STATES ───────────────────────
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [pendingAction, setPendingAction] = useState({ id: null, type: "", productName: "" });

  // ─── TRANSIENT WARNING NOTIFICATION STATE ───────────────────
  const [warningMessage, setWarningMessage] = useState("");
  const warningTimerRef = useRef(null);

  const triggerWarningNotification = (msg) => {
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    setWarningMessage(msg);
    warningTimerRef.current = setTimeout(() => {
      setWarningMessage("");
    }, 4500); 
  };

  useEffect(() => {
    return () => {
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    };
  }, []);

  // ================= FETCH ORDER COUNT METRIC =================
  const fetchOrderCount = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(API_URLS.SHOP_ORDER_NOTIFICATION_COUNT, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setOrderCount(data.count || 0);
    } catch (error) {
      console.log("Order count fetching error:", error);
    }
  }, []);

  // ================= CLEAR ORDERS BADGE METRIC =================
  const markOrderNotificationsAsRead = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      await fetch(API_URLS.SHOP_ORDER_NOTIFICATIONS_READ_ALL, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrderCount(0);
    } catch (error) {
      console.log("Mark orders read error:", error);
    }
  }, []);

  useEffect(() => {
  const backAction = () => {
    router.replace("/shopkeeperDashboard");
    return true;
  };

  const backHandler = BackHandler.addEventListener(
    "hardwareBackPress",
    backAction
  );

  return () => backHandler.remove();
}, []);
  // ================= FETCH ORDERS =================
  const fetchOrders = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(API_URLS.SHOP_ORDERS, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load orders");
      setOrders(Array.isArray(data) ? data : []);
      
      // Auto-clear notification counter when orders are actively loaded/viewed
      markOrderNotificationsAsRead();
    } catch (error) {
      triggerWarningNotification(error.message || "Warning: Could not fetch orders");
    } finally {
      setLoading(false);
    }
  }, [markOrderNotificationsAsRead]);

  // Handle initialization and page pull triggers
  useFocusEffect(
    useCallback(() => {
      fetchOrders();
      fetchOrderCount();
    }, [fetchOrders, fetchOrderCount])
  );

  // Dynamic 3-second live updates polling interval loop background task tracker
  useEffect(() => {
    const interval = setInterval(() => {
      if (!actionModalVisible) {
        fetchOrderCount();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [actionModalVisible, fetchOrderCount]);

  // ================= INTERACTION MODAL INTERCEPTORS =================
  const openActionConfirmation = (id, type, productName) => {
    setPendingAction({ id, type, productName });
    setActionModalVisible(true);
  };

  const executeOrderResponse = async () => {
    const { id, type } = pendingAction;
    setActionModalVisible(false);

    try {
      setSavingId(id);
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(`${API_URLS.SHOP_ORDERS}/${id}/respond`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ action: type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not update order");

      setOrders((prev) => prev.map((order) => (order.id === id ? data : order)));
      triggerWarningNotification(type === "approve" ? "Success: Stock updated." : "Success: Purchase rejected.");
    } catch (error) {
      triggerWarningNotification(error.message || "Warning: Operation failed");
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
              onPress={() => openActionConfirmation(item.id, "approve", item.productName)}
              disabled={savingId === item.id}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark" size={20} color="#fff" />
              <Text style={localStyles.actionText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[localStyles.actionButton, localStyles.rejectButton]}
              onPress={() => openActionConfirmation(item.id, "reject", item.productName)}
              disabled={savingId === item.id}
              activeOpacity={0.7}
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
        <TouchableOpacity
  onPress={() => router.replace("/shopkeeperDashboard")}
>
  <Ionicons name="chevron-back" size={28} color="#eef4fe" />
</TouchableOpacity>
        <View style={localStyles.headerCenterContainer}>
          <Text style={localStyles.headerTitleText}>Orders</Text>
        </View>
        <TouchableOpacity onPress={fetchOrders}   style={{ paddingRight: 10 }}
>
  <Ionicons
    name="refresh"
    size={24}
    color="#2e4466"
  />
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

      {/* UNIFIED INTERACTION CONFIRMATION MODAL OVERLAY */}
      <Modal
        animationType="fade"
        transparent
        visible={actionModalVisible}
        onRequestClose={() => setActionModalVisible(false)}
      >
        <View style={localStyles.modalOverlay}>
          <View style={localStyles.modalBox}>
            <TouchableOpacity onPress={() => setActionModalVisible(false)} style={localStyles.closeCornerBtn}>
              <Text style={localStyles.closeX}>✕</Text>
            </TouchableOpacity>

            <Text style={[
              localStyles.modalTitle, 
              { color: '#2e4466' }
            ]}>
              {pendingAction.type === "approve" ? "Approve Purchase" : "Reject Purchase"}
            </Text>
            <Text style={localStyles.modalSubtitle}>
              Are you sure you want to {pendingAction.type} the incoming stock transaction for "{pendingAction.productName}"?
            </Text>
            
            <View style={localStyles.modalButtonsRow}>
              <TouchableOpacity 
                style={[localStyles.modalBtn, { backgroundColor: '#E2E8F0' }]} 
                onPress={() => setActionModalVisible(false)}
              >
                <Text style={[localStyles.modalBtnText, { color: '#334155' }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  localStyles.modalBtn, 
                  { backgroundColor: pendingAction.type === "approve" ? '#22C55E' : '#EF4444' }
                ]} 
                onPress={executeOrderResponse}
              >
                <Text style={[localStyles.modalBtnText, { color: '#fff' }]}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* TRANSIENT BANNER LAYER */}
      {warningMessage ? (
        <View style={localStyles.warningBox}>
          <Ionicons 
            name={warningMessage.startsWith("Success") ? "checkmark-circle-outline" : "warning-outline"} 
            size={22} 
            color="#fff" 
          />
          <Text style={localStyles.warningText}>{warningMessage}</Text>
        </View>
      ) : null}

      <BottomNav />
    </View>
  );
}

const localStyles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: "#F8FAFC" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scrollContainer: { paddingHorizontal: 20, paddingBottom: 110 }, 
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

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalBox: { width: "85%", backgroundColor: "#fff", borderRadius: 20, paddingTop: 20, paddingBottom: 24, paddingHorizontal: 24, alignItems: "center", position: 'relative', elevation: 10 },
  closeCornerBtn: { position: 'absolute', top: 16, right: 20, zIndex: 10, padding: 4 },
  closeX: { fontSize: 20, color: "#94A3B8", fontWeight: "bold" },
  modalTitle: { fontSize: 19, fontWeight: "700", marginTop: 10 },
  modalSubtitle: { fontSize: 14, color: "#475569", marginTop: 12, marginBottom: 24, textAlign: 'center', lineHeight: 20 },
  modalButtonsRow: { width: "100%", flexDirection: "row", justifyContent: "space-between", gap: 12 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  modalBtnText: { fontWeight: '700', fontSize: 15 },

  warningBox: { position: 'absolute', bottom: 85, left: 20, right: 20, backgroundColor: '#e67e22', padding: 14, borderRadius: 14, flexDirection: 'row', alignItems: 'center', zIndex: 9999, elevation: 6 },
  warningText: { color: '#fff', marginLeft: 10, fontSize: 14, fontWeight: '600', flex: 1 },
});