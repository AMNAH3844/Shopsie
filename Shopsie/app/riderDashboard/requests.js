import React, { useCallback, useState } from "react";
import { API_URLS } from "../../src/services/apiConfig";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

export default function RiderRequests() {
  const router = useRouter();

  // ==========================================
  // STATE MANAGEMENT ENTRIES
  // ==========================================
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [warning, setWarning] = useState("");

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState(null);

  // ==========================================
  // UTILITY NOTIFICATION HANDLERS
  // ==========================================
  const triggerWarning = (message) => {
    setWarning(message);
    setTimeout(() => {
      setWarning("");
    }, 3000);
  };

  // ==========================================
  // HTTP REMOTE API DATA INTERACTIONS
  // ==========================================
  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");

      const res = await axios.get(API_URLS.RIDER_CHAT, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const requestData = Array.isArray(res.data) ? res.data : [];

      const filteredRequests = requestData.filter(
        (req) => req.status === "PENDING" || req.customerArchivedAt,
      );

      setRequests(filteredRequests);
    } catch (e) {
      console.log("Rider requests error:", e?.response?.data || e.message);
      setRequests([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRequests();
    }, [loadRequests]),
  );

  const deleteExpiredRequest = async (requestId) => {
    try {
      const token = await AsyncStorage.getItem("token");

      await axios.delete(`${API_URLS.RIDER_CHAT}/${requestId}/expired`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setRequests((prev) => prev.filter((r) => r.id !== requestId));
      triggerWarning("Expired request deleted successfully.");
    } catch (err) {
      console.log("Delete failed:", err?.response?.data || err.message);
    }
  };

  const openDetail = (item) => {
    if (item.customerArchivedAt) {
      triggerWarning(
        "This request was cancelled by the customer before acceptance.",
      );
      return;
    }

    router.push({
      pathname: "/riderDashboard/request-detail",
      params: { requestId: item.id },
    });
  };

  const promptDelete = (id) => {
    setSelectedRequestId(id);
    setModalVisible(true);
  };

  const handleConfirmDelete = () => {
    setModalVisible(false);
    if (selectedRequestId) {
      deleteExpiredRequest(selectedRequestId);
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => openDetail(item)}>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{item.listName}</Text>
          <Text style={styles.meta}>
            Customer: {item.customer?.username || "Customer"}
          </Text>
          <Text style={styles.meta}>Items: {item.items?.length || 0}</Text>

          {!!item.buyingLocationLabel && (
            <Text style={styles.location}>
              Buy from: {item.buyingLocationLabel}
            </Text>
          )}

          {!!item.deliveryLocationLabel && (
            <Text style={styles.location}>
              Deliver to: {item.deliveryLocationLabel}
            </Text>
          )}

          {!!item.customerArchivedAt && (
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => promptDelete(item.id)}
            >
              <Ionicons name="trash-outline" size={16} color="#fff" />
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text
          style={[
            styles.status,
            item.customerArchivedAt ? styles.expiredStatus : null,
          ]}
        >
          {item.customerArchivedAt ? "EXPIRED" : item.status}
        </Text>
      </View>
    </TouchableOpacity>
  );

  // ==========================================
  // ROOT UI SCREEN PRESENTATION ENGINE
  // ==========================================
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={styles.container}>
        <LinearGradient
          colors={["#eef4fe", "#2e4466"]}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 0 }}
          style={styles.header}
        >
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color="#eef4fe" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Requests</Text>
          <View style={{ width: 28 }} />
        </LinearGradient>

        {loading && !refreshing ? (
          <ActivityIndicator
            size="large"
            color="#2e4466"
            style={{ marginTop: 50 }}
          />
        ) : (
          <FlatList
            data={requests}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  loadRequests();
                }}
              />
            }
            ListEmptyComponent={
              <Text style={styles.empty}>No pending or active requests.</Text>
            }
          />
        )}

        <Modal
          animationType="fade"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Delete Request</Text>
              <Text style={styles.modalMessage}>
                Are you sure you want to delete this expired request?
              </Text>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalCancelBtn]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalDeleteBtn]}
                  onPress={handleConfirmDelete}
                >
                  <Text style={styles.modalConfirmText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {!!warning && (
          <View style={styles.warningBox}>
            <Ionicons name="warning" size={20} color="#fff" />
            <Text style={styles.warningText}>{warning}</Text>
          </View>
        )}

        <View style={styles.bottomNav}>
          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => router.replace("/riderDashboard")}
          >
            <Ionicons name="home" size={22} color="white" />
            <Text style={styles.navText}>Home</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => router.push("/riderDashboard/history")}
          >
            <Ionicons name="time-outline" size={22} color="white" />
            <Text style={styles.navText}>History</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => router.push("/riderDashboard/downladedlistsrider")}
          >
            <Ionicons name="download-outline" size={22} color="white" />
            <Text style={styles.navText}>Downloads</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ==========================================
// CENTRAL DESIGN LAYOUT REGISTRY
// ==========================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    height: 85,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    flex: 1,
    color: "#2e4466",
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  list: { padding: 16, paddingBottom: 90 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  row: { flexDirection: "row" },
  title: { fontSize: 16, fontWeight: "700", color: "#1e293b" },
  meta: { fontSize: 12, color: "#64748b", marginTop: 4 },
  location: { fontSize: 12, color: "#334155", marginTop: 4 },
  status: {
    color: "#2e4466",
    fontWeight: "700",
    fontSize: 12,
  },
  empty: {
    textAlign: "center",
    marginTop: 50,
    color: "#94a3b8",
    fontWeight: "600",
  },
  expiredStatus: { color: "#ef4444" },
  warningBox: {
    position: "absolute",
    bottom: 90,
    left: 20,
    right: 20,
    backgroundColor: "#e67e22",
    padding: 14,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 9999,
    elevation: 6,
  },
  warningText: {
    color: "#fff",
    marginLeft: 10,
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  deleteText: {
    color: "#fff",
    marginLeft: 8,
    fontWeight: "600",
    fontSize: 14,
  },
  deleteBtn: {
    marginTop: 12,
    backgroundColor: "#ef4444",
    height: 48,
    width: "100%",
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  bottomNav: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 75,
    backgroundColor: "#2e4466",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    elevation: 0,
    borderTopWidth: 0,
    zIndex: 1000,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  navText: {
    color: "white",
    fontSize: 12,
    marginTop: 0,
    textAlign: "center",
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "80%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    elevation: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 20,
    fontWeight: "600",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  modalBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelBtn: {
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  modalDeleteBtn: {
    backgroundColor: "#ef4444",
  },
  modalCancelText: {
    color: "#64748b",
    fontWeight: "600",
  },
  modalConfirmText: {
    color: "#fff",
    fontWeight: "600",
  },
});
