import React, { useCallback, useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  Modal,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

// Centralized API endpoints import (adjust relative path if necessary)
import { API_URLS } from "../src/services/apiConfig";

export default function Notifications() {
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  
  // Custom Restoration Request Modal State
  const [revertModalVisible, setRevertModalVisible] = useState(false);
  const [revertMessage, setRevertMessage] = useState("");
  const [selectedNotification, setSelectedNotification] = useState(null);

  // ⚠️ Toast Floating Warning Engine State
  const [warningState, setWarningState] = useState({
    visible: false,
    message: "",
  });

  // Helper function to dispatch a temporary floating bottom warning block
  const showWarningToast = (message) => {
    setWarningState({ visible: true, message });
  };

  // Auto dismiss warning block after 3.5 seconds
  useEffect(() => {
    if (warningState.visible) {
      const timer = setTimeout(() => {
        setWarningState({ visible: false, message: "" });
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [warningState.visible]);

  // Unified decision/confirmation modal layer state
  const [decisionModal, setDecisionModal] = useState({
    visible: false,
    title: "",
    message: "",
    confirmColor: "#16A34A",
    onConfirm: () => {},
  });

  const triggerDecision = (title, message, confirmColor, onConfirm) => {
    setDecisionModal({
      visible: true,
      title,
      message,
      confirmColor,
      onConfirm,
    });
  };

  const fetchNotifications = useCallback(async () => {
    try {
      const userData = await AsyncStorage.getItem("userData");
      const userRole = userData ? JSON.parse(userData)?.role : null;

      setRole(userRole);

      const token = await AsyncStorage.getItem("token");

      const url =
        userRole === "shopkeeper"
          ? API_URLS.SHOPKEEPER.NOTIFICATIONS
          : API_URLS.NOTIFICATIONS;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to load notifications");
      }

      setNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
      showWarningToast(error.message || "Could not fetch notifications");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [fetchNotifications])
  );

  const markAllRead = async () => {
    try {
      const token = await AsyncStorage.getItem("token");

      const url =
        role === "shopkeeper"
          ? API_URLS.SHOPKEEPER.NOTIFICATIONS_READ_ALL
          : API_URLS.NOTIFICATIONS_READ_ALL;

      await fetch(url, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setNotifications((prev) =>
        prev.map((item) => ({
          ...item,
          isRead: true,
        }))
      );
      showWarningToast("All items marked as read");
    } catch {
      showWarningToast("Could not mark notifications as read");
    }
  };

  const openRevertModal = (notification) => {
    setSelectedNotification(notification);
    setRevertMessage("");
    setRevertModalVisible(true);
  };

  const sendRevertRequest = async () => {
    if (!revertMessage.trim()) {
      showWarningToast("Please explain what was corrected");
      return;
    }

    try {
      setActionLoadingId(selectedNotification?.id);

      const token = await AsyncStorage.getItem("token");

      const res = await fetch(
        API_URLS.SHOPKEEPER.REVERT_REQUEST,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            revertMessage,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Could not send request");
      }

      setRevertModalVisible(false);
      showWarningToast(data.message || "Revert request successfully sent!");
      fetchNotifications();
    } catch (error) {
      showWarningToast(error.message || "Could not send request");
    } finally {
      setActionLoadingId(null);
    }
  };

  const approveRevertRequest = async (notification) => {
    const shopkeeperId = notification.relatedShopkeeperId;

    if (!shopkeeperId) {
      showWarningToast("Shopkeeper ID is missing from this notification.");
      return;
    }

    triggerDecision(
      "Confirm Approval",
      "Are you sure you want to approve this restoration request?",
      "#16A34A",
      async () => {
        try {
          setActionLoadingId(notification.id);
          const token = await AsyncStorage.getItem("token");

          const res = await fetch(
            `${API_URLS.ADMIN}/shopkeepers/${shopkeeperId}/approve-revert`,
            {
              method: "PATCH",
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          const data = await res.json();

          if (!res.ok) {
            throw new Error(data.message || "Could not approve request");
          }

          showWarningToast(data.message || "Revert request accepted successfully.");
          fetchNotifications();
        } catch (error) {
          showWarningToast(error.message || "Could not approve request");
        } finally {
          setActionLoadingId(null);
        }
      }
    );
  };

  const rejectRevertRequest = async (notification) => {
    const shopkeeperId = notification.relatedShopkeeperId;

    if (!shopkeeperId) {
      showWarningToast("Shopkeeper ID is missing.");
      return;
    }

    triggerDecision(
      "Confirm Rejection",
      "Are you sure you want to reject this shop restoration request?",
      "#EF4444",
      async () => {
        try {
          setActionLoadingId(notification.id);
          const token = await AsyncStorage.getItem("token");

          const res = await fetch(
            `${API_URLS.ADMIN}/shopkeepers/${shopkeeperId}/reject-revert`,
            {
              method: "PATCH",
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          const data = await res.json();

          if (!res.ok) {
            throw new Error(data.message || "Could not reject request");
          }

          showWarningToast(data.message || "Revert request rejected.");
          fetchNotifications();
        } catch (error) {
          showWarningToast(error.message || "Could not reject request");
        } finally {
          setActionLoadingId(null);
        }
      }
    );
  };

return (
  <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
    <View style={localStyles.mainContainer}>
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
          <Text style={localStyles.headerTitleText}>Notifications</Text>
        </View>
        <TouchableOpacity onPress={markAllRead}>
          <Ionicons name="checkmark-done" size={24} color="#2e4466" />
        </TouchableOpacity>
      </LinearGradient>

      {loading ? (
        <View style={localStyles.center}>
          <ActivityIndicator size="large" color="#2e4466" />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => `${item.source || "notification"}-${item.id}`}
          contentContainerStyle={localStyles.scrollContainer}
          ListEmptyComponent={
            <Text style={localStyles.emptyText}>
              No notifications yet.
            </Text>
          }
          renderItem={({ item }) => {
            const iconName =
              item.type === "FRIEND_REQUEST"
                ? "person-add"
                : item.type === "FRIEND_ACCEPTED"
                ? "people"
                : item.type === "MESSAGE"
                ? "chatbubble"
                : item.type === "LIST_SHARED"
                ? "list"
                : item.type === "RIDER_REQUEST"
                ? "bicycle"
                : item.type === "RIDER_ACCEPTED"
                ? "checkmark-circle"
                : item.type === "RIDER_REJECTED"
                ? "close-circle"
                : item.type === "DELIVERY_COMPLETED"
                ? "cube"
                : item.type === "DELIVERY_CONFIRMED"
                ? "shield-checkmark"
                : item.type === "SHOP_SUSPENDED"
                ? "ban"
                : item.type === "SHOP_REVERT_REQUEST"
                ? "refresh-circle"
                : item.type === "SHOP_REVERT_APPROVED"
                ? "checkmark-circle"
                : item.type === "SHOP_REVERT_REJECTED"
                ? "close-circle"
                : "notifications";

            let suspensionData = null;
            try {
              suspensionData =
                item.type === "SHOP_SUSPENDED"
                  ? JSON.parse(item.message)
                  : null;
            } catch {
              suspensionData = null;
            }

            const canRequestRevert =
              role === "shopkeeper" &&
              item.type === "SHOP_SUSPENDED" &&
              (
                suspensionData?.status === "NONE" ||
                suspensionData?.status === "REJECTED"
              );

            const canApproveRevert =
              role === "admin" &&
              item.type === "SHOP_REVERT_REQUEST" &&
              !item.isRead;

            const formattedMessage = item.message
              ? item.message.replace(/Reason:\s*\n/gi, "Reason: ")
              : "";

            return (
              <View
                style={[
                  localStyles.card,
                  !item.isRead && localStyles.unreadCard,
                ]}
              >
                <View style={localStyles.iconCircle}>
                  <Ionicons
                    name={role === "shopkeeper" ? "alert-circle" : iconName}
                    size={22}
                    color={role === "shopkeeper" ? "#EF4444" : "#2e4466"}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  {item.type === "SHOP_SUSPENDED" ? (
                    <>
                      <Text style={localStyles.messageText}>
                        Your account has been suspended by the Admin because the reports limit was crossed.
                        Your shop is no longer visible on the map.
                      </Text>

                      <Text
                        numberOfLines={1}
                        ellipsizeMode="tail"
                        style={{
                          marginTop: 8,
                          color: "#64748B",
                          fontSize: 13,
                        }}
                      >
                        <Text style={{ fontWeight: "700" }}>Suspension Reason: </Text>
                        <Text style={{ fontWeight: "500" }}>{suspensionData?.reason || "None specified"}</Text>
                      </Text>
                    </>
                  ) : (
                    <Text style={localStyles.messageText}>
                      {formattedMessage}
                    </Text>
                  )}

                  {item.type === "SHOP_REVERT_APPROVED" && (
                    <Text style={{ color: "#15803D", fontWeight: "900", marginTop: 8 }}>
                      ✓ Your restoration request was approved. Shop access has been restored.
                    </Text>
                  )}

                  {item.type === "SHOP_REVERT_REJECTED" && (
                    <Text style={{ color: "#DC2626", fontWeight: "900", marginTop: 8 }}>
                      ⚠ Please correct the issue and submit another request.
                    </Text>
                  )}

                  {role === "shopkeeper" && item.source === "stock" ? (
                    <Text style={localStyles.metaText}>
                      Stock: {item.quantity} | Threshold: {item.threshold}
                    </Text>
                  ) : (
                    <Text style={localStyles.metaText}>
                      {new Date(item.createdAt).toLocaleString()}
                    </Text>
                  )}

                  {canRequestRevert && (
                    <TouchableOpacity
                      style={localStyles.actionButton}
                      disabled={actionLoadingId === item.id}
                      onPress={() => openRevertModal(item)}
                    >
                      <Text style={localStyles.actionButtonText}>
                        {actionLoadingId === item.id ? "Sending..." : "Request Revert"}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {suspensionData?.status === "PENDING" && (
                    <Text style={{ color: "#D97706", fontWeight: "900", marginTop: 10 }}>
                      Request Pending Approval
                    </Text>
                  )}

                  {suspensionData?.status === "APPROVED" && (
                    <Text style={{ color: "#15803D", fontWeight: "900", marginTop: 10 }}>
                      ✓ Restoration Request Approved
                    </Text>
                  )}

                  {canApproveRevert && (
                    <View style={{ flexDirection: "row", width: "100%", gap: 10, marginTop: 10 }}>
                      <TouchableOpacity
                        style={[localStyles.actionButton, { flex: 1, alignItems: "center" }]}
                        disabled={actionLoadingId === item.id}
                        onPress={() => approveRevertRequest(item)}
                      >
                        <Text style={localStyles.actionButtonText}>Approve</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[localStyles.actionButton, { backgroundColor: "#DC2626", flex: 1, alignItems: "center" }]}
                        disabled={actionLoadingId === item.id}
                        onPress={() => rejectRevertRequest(item)}
                      >
                        <Text style={localStyles.actionButtonText}>Reject</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {role === "admin" && item.type === "SHOP_REVERT_REQUEST_APPROVED" && (
                    <Text style={{ color: "#15803D", fontWeight: "900", marginTop: 10 }}>
                      ✓ APPROVED BY ADMIN
                    </Text>
                  )}

                  {role === "admin" && item.type === "SHOP_REVERT_REQUEST_REJECTED" && (
                    <Text style={{ color: "#DC2626", fontWeight: "900", marginTop: 10 }}>
                      ✗ REJECTED BY ADMIN
                    </Text>
                  )}

                  {suspensionData?.status === "REJECTED" && (
                    <Text style={{ color: "#DC2626", fontWeight: "900", marginTop: 10 }}>
                      ✗ Restoration Request Rejected
                    </Text>
                  )}
                </View>
              </View>
            );
          }}
        />
      )}

      {/* ⚠️ INLINE SYSTEM WARNING TOAST DESIGN ELEMENT */}
      {warningState.visible && (
        <View style={localStyles.warningBox}>
          <Ionicons name="warning" size={20} color="#fff" />
          <Text style={localStyles.warningText}>{warningState.message}</Text>
          <TouchableOpacity onPress={() => setWarningState({ visible: false, message: "" })}>
            <Ionicons name="close-circle" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {/* DECISIONS & INTERACTIVE CONFIRMATION MODAL LAYER */}
      <Modal
        visible={decisionModal.visible}
        transparent
        animationType="fade"
      >
        <View style={localStyles.modalOverlay}>
          <View style={[localStyles.modalBox, { paddingTop: 25 }]}>
            <Text style={localStyles.confirmModalTitle}>{decisionModal.title}</Text>
            <Text style={localStyles.modalSubtitle}>{decisionModal.message}</Text>

            <View style={localStyles.shareButtonsRow}>
              <TouchableOpacity
                style={localStyles.cancelModalBtn}
                onPress={() => setDecisionModal((prev) => ({ ...prev, visible: false }))}
              >
                <Text style={localStyles.cancelModalText}>No</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[localStyles.successModalBtn, { backgroundColor: decisionModal.confirmColor }]}
                onPress={() => {
                  setDecisionModal((prev) => ({ ...prev, visible: false }));
                  decisionModal.onConfirm();
                }}
              >
                <Text style={localStyles.actionButtonText}>Yes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* SHOP REVERT INPUT ELEMENT LAYOUT */}
      <Modal
        visible={revertModalVisible}
        transparent
        animationType="slide"
      >
        <View style={localStyles.modalOverlay}>
          <View style={[localStyles.modalBox, { width: "90%", paddingTop: 25 }]}>
            <Text style={[localStyles.confirmModalTitle, { fontSize: 18, marginBottom: 12, marginTop: 0 }]}>
              Request Shop Restoration
            </Text>

            <TextInput
              multiline
              value={revertMessage}
              onChangeText={setRevertMessage}
              placeholder="Explain what mistake was corrected..."
              style={localStyles.inputTextArea}
            />

            <View style={[localStyles.shareButtonsRow, { marginTop: 15 }]}>
              <TouchableOpacity
                style={localStyles.cancelModalBtn}
                onPress={() => setRevertModalVisible(false)}
              >
                <Text style={localStyles.cancelModalText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[localStyles.successModalBtn, { backgroundColor: "#2e4466" }]} onPress={sendRevertRequest}>
                <Text style={localStyles.actionButtonText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
    </SafeAreaView>
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
    marginBottom: 15,
    width: "100%",
    elevation: 3,
  },
  headerCenterContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  headerTitleText: { fontSize: 20, fontWeight: "700", color: "#2e4466", textAlign: "center" },
  card: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    marginTop: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    elevation: 2,
  },
  unreadCard: { borderColor: "#FCA5A5", backgroundColor: "#FEF2F2" },
  iconCircle: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", marginRight: 12 },
  messageText: { color: "#475569", fontSize: 13, marginTop: 4, lineHeight: 18 },
  metaText: { color: "#991B1B", fontSize: 12, fontWeight: "800", marginTop: 5 },
  actionButton: {
    alignSelf: "flex-start",
    backgroundColor: "#2e4466",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginTop: 10,
  },
  emptyText: { textAlign: "center", color: "#94A3B8", marginTop: 40, fontWeight: "700" },
  
  /* ⚠️ PASSED WARNING BOX OVERLAY RULES */
  warningBox: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: '#e67e22',
    padding: 14,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 9999,
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  warningText: {
    color: '#fff',
    marginLeft: 10,
    fontSize: 14,
    fontWeight: '600',
    flex: 1
  },

  /* ---------------- MATURED MODAL STYLES ---------------- */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 15,
  },
  modalBox: {
    width: "85%",
    backgroundColor: "#fff",
    borderRadius: 22,
    paddingBottom: 25,
    paddingHorizontal: 20,
    alignItems: "center",
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 10,
  },
  confirmModalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#2e4466",
    marginTop: 10,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 8,
    marginBottom: 20,
    textAlign: "center",
    lineHeight: 20,
    fontWeight: "500",
  },
  shareButtonsRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 5,
  },
  cancelModalBtn: {
    flex: 1,
    backgroundColor: "#CBD5E1",
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    elevation: 2,
  },
  successModalBtn: {
    flex: 1,
    backgroundColor: "#16A34A",
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
  },
  cancelModalText: {
    color: "#1E293B",
    fontSize: 14,
    fontWeight: "700",
  },
  actionButtonText: { 
    color: "#FFFFFF", 
    fontWeight: "700", 
    fontSize: 14 
  },
  inputTextArea: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#d8e1ee",
    borderRadius: 14,
    minHeight: 100,
    padding: 12,
    textAlignVertical: "top",
    backgroundColor: "#ffffff",
    fontSize: 15,
    color: "#1e293b",
  },
});