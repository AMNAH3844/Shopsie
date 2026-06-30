import React, { useCallback, useState } from "react";
import { API_URLS } from "../../src/services/apiConfig";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";

export default function RiderDownloadedLists() {
  const router = useRouter();

  // ==========================================
  // STATE MANAGEMENT
  // ==========================================
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [warning, setWarning] = useState("");

  // --- Modal Visibility States ---
  const [deleteModal, setDeleteModal] = useState(false);
  const [selectedDeleteId, setSelectedDeleteId] = useState(null);
  const [selectedListData, setSelectedListData] = useState(null);
  const [showItemsModal, setShowItemsModal] = useState(false);

  // ==========================================
  // WARNING TOAST ACTIONS
  // ==========================================
  const triggerWarning = (message) => {
    setWarning(message);
    setTimeout(() => {
      setWarning("");
    }, 3000);
  };

  // ==========================================
  // DATA FETCHING & API COMMUNICATIONS
  // ==========================================
  const loadLists = useCallback(async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      const res = await axios.get(API_URLS.DOWNLOADED_LISTS, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLists(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.log(e.message);
      triggerWarning("Could not retrieve downloaded lists.");
    } finally {
      setLoading(false);
    }
  }, []);

  // ==========================================
  // SCREEN FOCUS TRIGGER HOOKS
  // ==========================================
  useFocusEffect(
    useCallback(() => {
      loadLists();
    }, [loadLists]),
  );

  const handleConfirmDelete = async () => {
    try {
      const token = await AsyncStorage.getItem("token");

      await axios.delete(`${API_URLS.DOWNLOADED_LISTS}/${selectedDeleteId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setLists((prev) => prev.filter((l) => l.id !== selectedDeleteId));
      setDeleteModal(false);
      setSelectedDeleteId(null);
      triggerWarning("Saved list deleted successfully.");
    } catch (e) {
      console.log(e);
      setDeleteModal(false);
      triggerWarning("Delete operation failed.");
    }
  };

  const openOptimizer = (item) => {
    const requestId = item.originalListId || item.requestId;
    if (!requestId) {
      triggerWarning("This list is not linked with an active rider request.");
      return;
    }
    router.push({
      pathname: "/riderDashboard/rideroptimizer",
      params: { requestId },
    });
  };

  // ==========================================
  // MAIN COMPONENT LAYOUT UI
  // ==========================================
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={styles.container}>
        {/* TOP HEADER */}
        <LinearGradient
          colors={["#eef4fe", "#2e4466"]}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 0 }}
          style={styles.header}
        >
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color="#eef4fe" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Downloaded Lists</Text>
          <View style={{ width: 28 }} />
        </LinearGradient>

        {loading ? (
          <ActivityIndicator
            size="large"
            color="#2e4466"
            style={{ marginTop: 50 }}
          />
        ) : (
          <FlatList
            data={lists}
            keyExtractor={(i) => String(i.id)}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No lists saved</Text>
            }
            renderItem={({ item }) => (
              /* CARD CONTAINER */
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={styles.cardTitle}>{item.name}</Text>
                    <Text style={styles.meta}>
                      From: {item.senderName || "Customer"}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.optimizeBtn}
                    onPress={() => openOptimizer(item)}
                  >
                    <Ionicons
                      name="navigate-circle-outline"
                      size={24}
                      color="#2e4466"
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryText}>
                    Items: {item.items?.length || 0}
                  </Text>
                  {!!item.receiverType && (
                    <Text style={styles.summaryPill}>{item.receiverType}</Text>
                  )}
                </View>

                {/* CARD ACTIONS */}
                <View style={styles.row}>
                  <TouchableOpacity
                    style={styles.openBtn}
                    onPress={() => {
                      setSelectedListData(item);
                      setShowItemsModal(true);
                    }}
                  >
                    <Ionicons name="eye-outline" size={16} color="#fff" />
                    <Text style={styles.btnText}>View</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.delBtn}
                    onPress={() => {
                      setSelectedDeleteId(item.id);
                      setSelectedListData(item);
                      setDeleteModal(true);
                    }}
                  >
                    <Ionicons name="trash-outline" size={16} color="#fff" />
                    <Text style={styles.btnText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        )}

        {/* CUSTOM VIEW POPUP MODAL */}
        <Modal visible={showItemsModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalBoxLarge}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalListTitle}>
                  {selectedListData?.name}
                </Text>
              </View>

              {selectedListData?.items?.[0]?.buyingLocationLabel && (
                <View style={styles.locationBox}>
                  <Text style={styles.locationTitle}>Buy From</Text>
                  <Text style={styles.locationText}>
                    {selectedListData.items[0].buyingLocationLabel}
                  </Text>
                </View>
              )}

              {selectedListData?.items?.[0]?.deliveryLocationLabel && (
                <View style={styles.locationBox}>
                  <Text style={styles.locationTitle}>Deliver To</Text>
                  <Text style={styles.locationText}>
                    {selectedListData.items[0].deliveryLocationLabel}
                  </Text>
                </View>
              )}

              <ScrollView
                style={{ width: "100%", maxHeight: 430 }}
                showsVerticalScrollIndicator={false}
              >
                {(selectedListData?.items || []).map((i, idx) => (
                  <View key={idx} style={styles.modalItemBlock}>
                    <Text style={styles.modalCategory}>
                      {i.categoryName || "Category"}
                    </Text>
                    <Text style={styles.modalItemName}>{i.name}</Text>
                    <Text style={styles.modalMeta}>Qty: {i.quantity || 1}</Text>
                    <Text style={styles.modalMeta}>
                      Spec: {i.specification || "None"}
                    </Text>
                    {i.selectedShopName && (
                      <Text style={styles.modalShop}>
                        Shop: {i.selectedShopName}
                      </Text>
                    )}
                    {i.selectedShopPrice && (
                      <Text style={styles.modalMeta}>
                        Price: Rs. {i.selectedShopPrice}
                      </Text>
                    )}
                    {i.lineTotal && (
                      <Text style={styles.modalTotal}>
                        Line Total: Rs. {i.lineTotal}
                      </Text>
                    )}
                  </View>
                ))}
              </ScrollView>

              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Total Items</Text>
                <Text style={styles.billValue}>
                  {(selectedListData?.items || []).length}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => {
                  setShowItemsModal(false);
                  setSelectedListData(null);
                }}
              >
                <Text style={styles.modalCloseButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* CUSTOM DELETION CONFIRMATION MODAL */}
        <Modal visible={deleteModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.popup}>
              <TouchableOpacity
                onPress={() => {
                  setDeleteModal(false);
                  setSelectedDeleteId(null);
                }}
                style={styles.closeCornerBtn}
              >
                <Text style={styles.closeX}>✕</Text>
              </TouchableOpacity>

              <Text style={[styles.title, { color: "#ef4444" }]}>
                Delete List
              </Text>
              <Text style={styles.modalSubtitle}>
                Are you sure you want to permanently delete "
                {selectedListData?.name}"?
              </Text>

              <View style={styles.rowBtns}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => {
                    setDeleteModal(false);
                    setSelectedDeleteId(null);
                  }}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.redBtn}
                  onPress={handleConfirmDelete}
                >
                  <Text style={styles.btnText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* ORANGE WARNING TOAST ALERT */}
        {!!warning && (
          <View style={styles.warningBox}>
            <Ionicons name="warning" size={20} color="#fff" />
            <Text style={styles.warningText}>{warning}</Text>
          </View>
        )}

        {/* FIXED BOTTOM NAVIGATION BAR */}
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
// STYLESHEET REGISTRY
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

  // Headings set to 700
  headerTitle: {
    flex: 1,
    color: "#2e4466",
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2e4466",
    marginBottom: 10,
    textAlign: "center",
  },
  modalListTitle: {
    fontWeight: "700",
    fontSize: 20,
    color: "#2e4466",
    flex: 1,
  },

  listContent: { padding: 16, paddingBottom: 90 },
  emptyText: {
    textAlign: "center",
    color: "#64748b",
    fontWeight: "600",
    marginTop: 30,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  // Custom structural elements lowered from 800/900 to 600 or 500
  cardTitle: { fontSize: 22, fontWeight: "600", color: "#2e4466", flex: 1 },
  meta: { fontSize: 14, color: "#64748b", fontWeight: "500", marginTop: 2 },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  summaryText: { fontSize: 14, color: "#475569", fontWeight: "600" },
  summaryPill: {
    backgroundColor: "#eef2f7",
    color: "#2e4466",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    fontSize: 11,
    fontWeight: "600",
    overflow: "hidden",
  },
  optimizeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#eef4fe",
    alignItems: "center",
    justifyContent: "center",
  },
  row: { flexDirection: "row", gap: 10, marginTop: 14 },
  openBtn: {
    flex: 1,
    height: 44,
    backgroundColor: "#344b73",
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  delBtn: {
    flex: 1,
    height: 44,
    backgroundColor: "#ef4444",
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  btnText: { color: "#fff", fontSize: 15, fontWeight: "600", marginLeft: 6 },
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
  locationBox: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  locationTitle: {
    color: "#2e4466",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  locationText: {
    color: "#475569",
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  popup: {
    width: "90%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },
  rowBtns: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 10,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: "#f1f5f9",
    paddingVertical: 12,
    borderRadius: 12,
    marginRight: 8,
    alignItems: "center",
  },
  cancelText: {
    color: "#475569",
    fontWeight: "600",
  },
  redBtn: {
    flex: 1,
    backgroundColor: "#ef4444",
    paddingVertical: 12,
    borderRadius: 12,
    marginLeft: 8,
    alignItems: "center",
  },
  closeCornerBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 5,
  },
  closeX: {
    fontSize: 22,
    color: "#94a3b8",
    fontWeight: "600",
  },
  modalBoxLarge: {
    width: "100%",
    maxWidth: 470,
    maxHeight: "85%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
  },
  modalHeaderRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalItemBlock: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  modalCategory: {
    color: "#2e4466",
    fontSize: 14,
    fontWeight: "600",
  },
  modalItemName: {
    color: "#334155",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 4,
  },
  modalMeta: {
    color: "#64748b",
    marginTop: 3,
    fontSize: 12,
  },
  modalShop: {
    color: "#10b981",
    marginTop: 3,
    fontSize: 12,
    fontWeight: "600",
  },
  modalTotal: {
    color: "#10b981",
    marginTop: 3,
    fontSize: 12,
    fontWeight: "600",
  },
  billRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  billLabel: {
    color: "#1e293b",
    fontSize: 15,
    fontWeight: "600",
  },
  billValue: {
    color: "#10b981",
    fontSize: 17,
    fontWeight: "600",
  },
  modalCloseButton: {
    backgroundColor: "#2e4466",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 14,
  },
  modalCloseButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
});
