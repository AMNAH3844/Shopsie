import React, { useCallback, useState } from "react";
import { API_URLS } from "../../src/services/apiConfig";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

export default function RiderRequestDetail() {
  const router = useRouter();
  const { requestId } = useLocalSearchParams();

  // ==========================================
  // STATE MANAGEMENT ENTRIES
  // ==========================================
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showWarningBox, setShowWarningBox] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const [modalVisible, setModalVisible] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  // ==========================================
  // UTILITY NOTIFICATION HANDLERS
  // ==========================================
  const triggerWarning = (message) => {
    setToastMessage(message);
    setShowWarningBox(true);
    setTimeout(() => {
      setShowWarningBox(false);
    }, 2500);
  };

  // ==========================================
  // HTTP REMOTE API DATA INTERACTIONS
  // ==========================================
  const loadDetail = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const res = await axios.get(`${API_URLS.RIDER_CHAT}/${requestId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRequest(res.data);
    } catch (e) {
      triggerWarning("Could not load request.");
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useFocusEffect(
    useCallback(() => {
      loadDetail();
    }, [loadDetail]),
  );

  const confirmAction = (action) => {
    setPendingAction(action);
    setModalVisible(true);
  };

  const handleConfirmSubmit = async () => {
    setModalVisible(false);
    const action = pendingAction;

    try {
      setSaving(true);
      const token = await AsyncStorage.getItem("token");
      await axios.post(
        `${API_URLS.RIDER_CHAT}/${requestId}/respond`,
        { action },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (action === "accept") {
        triggerWarning("You accepted this request!");
        setTimeout(() => {
          router.replace({
            pathname: "/riderDashboard/request-chat",
            params: { requestId },
          });
        }, 1500);
      } else {
        triggerWarning("Request rejected.");
        setTimeout(() => {
          router.back();
        }, 1500);
      }
    } catch (e) {
      triggerWarning(e.response?.data?.message || "Could not update request.");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2e4466" />
        </View>
      </SafeAreaView>
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
          <Text style={styles.headerTitle}>Request Detail</Text>
          <View style={{ width: 28 }} />
        </LinearGradient>

        <ScrollView contentContainerStyle={styles.body}>
          <View style={styles.card}>
            <Text style={styles.title}>{request?.listName}</Text>
            <Text style={styles.meta}>
              Customer: {request?.customer?.username || "Customer"}
            </Text>
            <Text style={styles.meta}>Status: {request?.status}</Text>
            {!!request?.buyingLocationLabel && (
              <Text style={styles.location}>
                Buy from: {request.buyingLocationLabel}
              </Text>
            )}
            {!!request?.deliveryLocationLabel && (
              <Text style={styles.location}>
                Deliver to: {request.deliveryLocationLabel}
              </Text>
            )}
          </View>

          <Text style={styles.sectionTitle}>List Items</Text>
          {request?.items?.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.meta}>
                Qty: {item.quantity || 1} | Spec: {item.specification || "None"}
              </Text>
              {!!item.selectedShopName && (
                <Text style={styles.shopText}>
                  Shop: {item.selectedShopName} | Rs.{" "}
                  {item.selectedShopPrice || 0}
                </Text>
              )}
            </View>
          ))}

          {request?.status === "PENDING" && (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.rejectBtn]}
                onPress={() => confirmAction("reject")}
                disabled={saving}
              >
                <Text style={styles.actionText}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.acceptBtn]}
                onPress={() => confirmAction("accept")}
                disabled={saving}
              >
                <Text style={styles.actionText}>Accept</Text>
              </TouchableOpacity>
            </View>
          )}

          {request?.status === "ACCEPTED" && (
            <TouchableOpacity
              style={styles.chatBtn}
              onPress={() =>
                router.push({
                  pathname: "/riderDashboard/request-chat",
                  params: { requestId },
                })
              }
            >
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={18}
                color="#fff"
              />
              <Text style={styles.chatText}>Open Chat</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        <Modal
          animationType="fade"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Are you sure?</Text>
              <Text style={styles.modalMessage}>
                Do you want to{" "}
                {pendingAction === "accept" ? "accept" : "reject"} this delivery
                request?
              </Text>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalCancelBtn]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalBtn,
                    pendingAction === "accept"
                      ? styles.modalAcceptBtn
                      : styles.modalRejectBtn,
                  ]}
                  onPress={handleConfirmSubmit}
                >
                  <Text style={styles.modalConfirmText}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {showWarningBox && (
          <View style={styles.warningBox}>
            <Ionicons name="alert-circle-outline" size={20} color="#fff" />
            <Text style={styles.warningText}>{toastMessage}</Text>
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
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
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
    fontWeight: "800",
    textAlign: "center",
  },
  body: {
    padding: 16,
    paddingBottom: 90,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 16,
  },
  title: { color: "#1e293b", fontSize: 18, fontWeight: "900" },
  meta: { color: "#64748b", fontSize: 12, marginTop: 4 },
  location: { color: "#334155", fontSize: 12, marginTop: 6, fontWeight: "800" },
  sectionTitle: {
    color: "#1e293b",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 10,
  },
  itemRow: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 10,
  },
  itemName: { color: "#1e293b", fontSize: 15, fontWeight: "900" },
  shopText: { color: "#047857", fontSize: 12, fontWeight: "800", marginTop: 5 },
  actionRow: {
    marginTop: 18,
    alignItems: "center",
  },
  deleteBtn: {
    marginTop: 12,
    backgroundColor: "#ef4444",
    height: 45,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  actionBtn: {
    width: "100%",
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  rejectBtn: { backgroundColor: "#ef4444" },
  acceptBtn: { backgroundColor: "#10b981" },
  actionText: { color: "#fff", fontSize: 15, fontWeight: "900" },
  chatBtn: {
    height: 50,
    borderRadius: 14,
    backgroundColor: "#2e4466",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },
  chatText: { color: "#fff", fontSize: 15, fontWeight: "900", marginLeft: 8 },
  warningBox: {
    position: "absolute",
    bottom: 80,
    left: 20,
    right: 20,
    backgroundColor: "#e67e22",
    padding: 12,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 9999,
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  warningText: {
    color: "#fff",
    marginLeft: 10,
    fontSize: 14,
    fontWeight: "600",
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
    fontWeight: "900",
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
  modalAcceptBtn: {
    backgroundColor: "#10b981",
  },
  modalRejectBtn: {
    backgroundColor: "#ef4444",
  },
  modalCancelText: {
    color: "#64748b",
    fontWeight: "700",
  },
  modalConfirmText: {
    color: "#fff",
    fontWeight: "700",
  },
});
