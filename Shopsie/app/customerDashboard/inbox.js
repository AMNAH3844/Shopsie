import React, { useState, useCallback } from "react";
import { API_URLS } from '../../src/services/apiConfig';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
  StatusBar,
  Alert
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { LinearGradient } from "expo-linear-gradient";
 
const formatTime = (dateStr) => {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};
 
const STATUS_STYLES = {
  PENDING: { bg: "#fef3c7", text: "#d97706", border: "#fde68a", icon: "time-outline" },
  REJECTED: { bg: "#fee2e2", text: "#b91c1c", border: "#fca5a5", icon: "close-circle-outline" },
  ACCEPTED: { bg: "#d1fae5", text: "#047857", border: "#6ee7b7", icon: "checkmark-circle-outline" },
  DELIVERED: { bg: "#dbeafe", text: "#1d4ed8", border: "#93c5fd", icon: "checkbox-outline" },
  COMPLETED: { bg: "#f0fdf4", text: "#15803d", border: "#86efac", icon: "checkmark-done-circle-outline" },
};
 
const InboxScreen = () => {
  const router = useRouter();
 
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [chats, setChats] = useState([]);
  const [riderRequests, setRiderRequests] = useState([]);
  
  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const [selectedRequestForDelete, setSelectedRequestForDelete] = useState(null);
  const [deleteNotice, setDeleteNotice] = useState(null);
 
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailRequest, setDetailRequest] = useState(null);
 
  const fetchAll = useCallback(async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) return;
 
      const chatPromise = axios.get(API_URLS.INBOX, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const riderPromise = axios.get(`${API_URLS.RIDER}/customer-requests`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .catch((err) => {
        console.log("Rider API failed:", err.message);
        return { data: [] };
      });

      const [chatRes, riderRes] = await Promise.all([
        chatPromise,
        riderPromise,
      ]);

      setChats(Array.isArray(chatRes.data) ? chatRes.data : []);
      setRiderRequests(Array.isArray(riderRes.data) ? riderRes.data : []);
    } catch (error) {
      console.log("Inbox load error:", error.message);
      Alert.alert("Error", "Could not load messages or requests.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
 
  useFocusEffect(
    useCallback(() => {
      fetchAll(false);
    }, [fetchAll])
  );
 
  const markAsRead = async (otherUserId) => {
    try {
      const token = await AsyncStorage.getItem("token");
      await axios.post(`${API_URLS.CHAT}/mark-read`,
        { otherUserId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setChats((prev) =>
        prev.map((item) =>
          item.userId === otherUserId ? { ...item, unreadCount: 0 } : item
        )
      );
    } catch (e) {
      console.log("Mark read error:", e.message);
    }
  };
 
  const isRequestFullyDelivered = (request) =>
    request?.status === "COMPLETED" &&
    !!request?.riderDeliveredAt &&
    !!request?.customerConfirmedAt;

  const deleteRiderRequest = (request) => {
    const isPendingOrRejected = request?.status === "PENDING" || request?.status === "REJECTED";
    
    if (!isPendingOrRejected && !isRequestFullyDelivered(request)) {
      setDeleteNotice({
        title: "Delivery Active",
        message:
          "You cannot delete an active rider chat until the request is completed, rejected, or canceled.",
      });
      return;
    }
    setSelectedRequestForDelete(request);
    setShowDeletePopup(true);
  };

 const confirmDeleteRiderRequest = async () => {
  if (!selectedRequestForDelete) return;

  const requestId = selectedRequestForDelete.id;

  try {
    const token = await AsyncStorage.getItem("token");

    await axios.delete(
      `${API_URLS.RIDER}/requests/${requestId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    setRiderRequests((prev) =>
      prev.filter((r) => r.id !== requestId)
    );

    setShowDeletePopup(false);
    setSelectedRequestForDelete(null);
  } catch (e) {
    Alert.alert(
      "Error",
      e.response?.data?.message || "Please try again."
    );
  }
};
  const openRiderRequestDetail = (req) => {
    setDetailRequest(req);
    setDetailVisible(true);
  };
 
  const getInitials = (name) => {
    if (!name) return "??";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };
 
  const renderRiderRequestCard = ({ item }) => {
    const style = STATUS_STYLES[item.status] || STATUS_STYLES.PENDING;
    const riderName = item.rider?.user?.username || "Rider";
 
    return (
      <TouchableOpacity
        style={styles.listCard}
        onPress={() => openRiderRequestDetail(item)}
        activeOpacity={0.8}
      >
        <View style={styles.listIconContainer}>
          <MaterialCommunityIcons name="bicycle" size={20} color="#4b5b78" />
        </View>
 
        <View style={{ flex: 1 }}>
          <View style={styles.cardTopRow}>
            <Text style={styles.cardTitleName}>{riderName}</Text>
            <Text style={styles.cardTimeText}>{formatTime(item.createdAt)}</Text>
          </View>
          <Text style={styles.cardSubText} numberOfLines={1}>
            {item.listName}
          </Text>
          {!!item.buyingLocationLabel && (
            <Text style={styles.cardLocationText} numberOfLines={1}>
              Buy from: {item.buyingLocationLabel}
            </Text>
          )}
          <View style={styles.cardBottomRow}>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: style.bg, borderColor: style.border },
              ]}
            >
              <Ionicons name={style.icon} size={11} color={style.text} />
              <Text style={[styles.statusText, { color: style.text }]}>
                {item.status === "PENDING" ? "Pending Request" : item.status === "ACCEPTED" ? "Accepted" : item.status === "REJECTED" ? "Rejected" : item.status}
              </Text>
            </View>
 
            {["ACCEPTED", "DELIVERED"].includes(item.status) && (
              <TouchableOpacity
                style={styles.chatSmallBtn}
                onPress={() =>
                  router.push({
                    pathname: "/riderDashboard/request-chat",
                    params: { requestId: item.id, role: "customer" },
                  })
                }
              >
                <Ionicons name="chatbubble-ellipses" size={12} color="#fff" />
                <Text style={styles.chatSmallText}>Chat</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
 
        <TouchableOpacity
  style={styles.actionBtnMargin}
  onPress={() => deleteRiderRequest(item)}
  hitSlop={8}
>
  <Ionicons
    name="trash-outline"
    size={22}
    color="#ff6b6b"
  />
</TouchableOpacity>
      </TouchableOpacity>
    );
  };
 
  const renderChatCard = ({ item }) => (
    <TouchableOpacity
      style={styles.listCard}
      onPress={() => {
        markAsRead(item.userId);
        router.push({
          pathname: "/customerDashboard/chat",
          params: { userId: item.userId },
        });
      }}
    >
      <View style={styles.avatarWrapper}>
        {item.profileImage ? (
          <Image source={{ uri: item.profileImage }} style={styles.avatarImg} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarFallbackText}>{getInitials(item.name)}</Text>
          </View>
        )}
      </View>
 
      <View style={{ flex: 1 }}>
        <View style={styles.cardTopRow}>
          <Text style={styles.cardTitleName}>{item.name}</Text>
          <Text style={styles.cardTimeText}>{formatTime(item.time)}</Text>
        </View>
 
        <View style={styles.msgRow}>
          {item.lastMsg?.toLowerCase().includes("list") && (
            <Ionicons name="list" size={14} color="#f5a623" style={{ marginRight: 4 }} />
          )}
          <Text
            style={[styles.lastMsgText, item.unreadCount > 0 && styles.unreadTextBold]}
            numberOfLines={1}
          >
            {item.lastMsg}
          </Text>
        </View>
 
        {(item.buyingLocationLabel || item.deliveryLocationLabel) && (
          <View style={styles.locationPreviewBox}>
            {item.buyingLocationLabel && (
              <Text style={styles.previewLocationLine} numberOfLines={1}>
                Buy from: {item.buyingLocationLabel}
              </Text>
            )}
            {item.deliveryLocationLabel && (
              <Text style={styles.previewLocationLine} numberOfLines={1}>
                Deliver to: {item.deliveryLocationLabel}
              </Text>
            )}
          </View>
        )}
      </View>
 
      {item.unreadCount > 0 && item.lastMsgFrom !== "ME" && (
        <View style={styles.unreadCountBadge}>
          <Text style={styles.unreadCountText}>{item.unreadCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
 
  const filteredRiderRequests = riderRequests.filter((r) => {
    const riderName = r.rider?.user?.username || "";
    return (
      riderName.toLowerCase().startsWith(search.toLowerCase()) ||
      r.listName?.toLowerCase().startsWith(search.toLowerCase())
    );
  });
 
  const filteredChats = chats.filter((c) =>
    c.name?.toLowerCase().startsWith(search.toLowerCase())
  );
 
  const sections = [
    ...(filteredRiderRequests.length > 0 ? [{ title: "Rider Requests", data: filteredRiderRequests, type: "rider" }] : []),
    ...(filteredChats.length > 0 ? [{ title: "Messages", data: filteredChats, type: "chat" }] : []),
  ];
 
   return (
  <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <LinearGradient
        colors={["#eef4fe", "#2e4466"]}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 0 }}
        style={styles.header}
      >
        <TouchableOpacity
          onPress={() => router.canGoBack() ? router.back() : router.replace("/customerDashboard")}
        >
          <Ionicons name="chevron-back" size={28} color="#eef4fe" />
        </TouchableOpacity>

        <Text style={styles.headerTitleText}>Inbox</Text>

        <TouchableOpacity onPress={() => router.push("/customerDashboard/downloadlists")}>
          <Ionicons name="download-outline" size={26} color="#2e4466" />
        </TouchableOpacity>
      </LinearGradient>
 
      <View style={styles.listSearchWrapper}>
        <View style={styles.listSearchBox}>
          <Ionicons name="filter" size={18} color="#666" />
          <TextInput
            placeholder="Search messages or requests..."
            style={styles.listSearchInput}
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#999"
          />
          {search !== '' && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </View>
 
      {loading && !refreshing ? (
        <ActivityIndicator size="large" color="#2e4466" style={{ marginTop: 50 }} />
      ) : sections.length === 0 && !loading ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>No messages or requests yet.</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item, index) => `${item.id || item.userId}-${index}`}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchAll(true);
              }}
              tintColor="#2e4466"
            />
          }
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionHeader}>{section.title}</Text>
          )}
          renderItem={({ item, section }) =>
            section.type === "rider" ? renderRiderRequestCard({ item }) : renderChatCard({ item })
          }
        />
      )}
 
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.tabItem} onPress={() => router.push("/customerDashboard")}>
          <Ionicons name="home" size={22} color="white" />
          <Text style={styles.navText}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => router.push("/customerDashboard/savedlist")}>
          <MaterialCommunityIcons name="format-list-bulleted" size={22} color="white" />
          <Text style={styles.navText}>Saved Lists</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => router.push("/customerDashboard/inbox")}>
          <Ionicons name="chatbubble-ellipses-outline" size={22} color="white" />
          <Text style={styles.navText}>Inbox</Text>
        </TouchableOpacity>
      </View>

      {/* DETAIL MODAL */}
      <Modal visible={detailVisible} transparent animationType="slide" onRequestClose={() => setDetailVisible(false)}>
        <View style={styles.detailOverlay}>
          <View style={styles.detailBox}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailTitle}>{detailRequest?.listName}</Text>
              <TouchableOpacity onPress={() => setDetailVisible(false)}>
                <Ionicons name="close-circle" size={28} color="#94a3b8" />
              </TouchableOpacity>
            </View>
 
            {detailRequest && (
              <>
                <View style={[styles.statusBadge, { backgroundColor: STATUS_STYLES[detailRequest.status]?.bg || "#fef3c7", borderColor: STATUS_STYLES[detailRequest.status]?.border || "#fde68a", alignSelf: "flex-start", marginBottom: 12 }]}>
                  <Ionicons name={STATUS_STYLES[detailRequest.status]?.icon || "time-outline"} size={13} color={STATUS_STYLES[detailRequest.status]?.text || "#d97706"} />
                  <Text style={[styles.statusText, { color: STATUS_STYLES[detailRequest.status]?.text || "#d97706" }]}>{detailRequest.status}</Text>
                </View>
 
                <Text style={styles.detailMeta}>Rider: {detailRequest.rider?.user?.username || "Rider"}</Text>
                {!!detailRequest.buyingLocationLabel && <Text style={styles.detailLocation}>Buy from: {detailRequest.buyingLocationLabel}</Text>}
                {!!detailRequest.deliveryLocationLabel && <Text style={styles.detailLocation}>Deliver to: {detailRequest.deliveryLocationLabel}</Text>}
 
                <Text style={styles.detailSectionHead}>Items</Text>
                <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false}>
                  {(detailRequest.items || []).map((item, idx) => (
                    <View key={idx} style={styles.detailItemRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.detailItemName}>{item.name}</Text>
                        <Text style={styles.detailItemMeta}>Qty: {item.quantity || 1} | Spec: {item.specification || "None"}</Text>
                        {!!item.selectedShopName && <Text style={styles.detailShopText}>Shop: {item.selectedShopName} | Rs. {item.selectedShopPrice || 0}</Text>}
                      </View>
                      {!!item.lineTotal && <Text style={styles.detailItemPrice}>Rs. {item.lineTotal}</Text>}
                    </View>
                  ))}
                </ScrollView>
 
                {(() => {
                  const total = (detailRequest.items || []).reduce((sum, i) => sum + Number(i.lineTotal || 0), 0);
                  return total > 0 ? (
                    <View style={styles.detailTotalRow}>
                      <Text style={styles.detailTotalLabel}>Total</Text>
                      <Text style={styles.detailTotalPrice}>Rs. {total}</Text>
                    </View>
                  ) : null;
                })()}
 
                {["ACCEPTED", "DELIVERED"].includes(detailRequest.status) && (
                  <TouchableOpacity
                    style={styles.openChatBtn}
                    onPress={() => {
                      setDetailVisible(false);
                      router.push({
                        pathname: "/riderDashboard/request-chat",
                        params: { requestId: detailRequest.id, role: "customer" },
                      });
                    }}
                  >
                    <Ionicons name="chatbubble-ellipses-outline" size={18} color="#fff" />
                    <Text style={styles.btnTextWhite}>Open Chat</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* DELIVERY POPUP NOTICE */}
      <Modal visible={!!deleteNotice} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.popup}>
            <TouchableOpacity onPress={() => setDeleteNotice(null)} style={styles.closeCornerBtn}>
              <Text style={styles.closeX}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.popupTitle}>{deleteNotice?.title}</Text>
            <Text style={styles.modalSubtitle}>{deleteNotice?.message}</Text>
            <TouchableOpacity style={[styles.cancelBtn, { width: '100%', marginRight: 0 }]} onPress={() => setDeleteNotice(null)}>
              <Text style={styles.cancelText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* CONFIRMED DELETION MODAL */}
      <Modal visible={showDeletePopup} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.popup}>
            <TouchableOpacity onPress={() => setShowDeletePopup(false)} style={styles.closeCornerBtn}>
              <Text style={styles.closeX}>✕</Text>
            </TouchableOpacity>

            <Text style={[styles.popupTitle, { color: '#ef4444' }]}>Remove Request</Text>
            <Text style={styles.modalSubtitle}>
              Are you sure you want to permanently delete the conversation for "{selectedRequestForDelete?.listName}"?
            </Text>

            <View style={styles.rowBtns}>
  <TouchableOpacity
    onPress={() => setShowDeletePopup(false)}
    style={styles.cancelBtn}
  >
    <Text style={styles.cancelText}>Cancel</Text>
  </TouchableOpacity>

  <TouchableOpacity
    onPress={confirmDeleteRiderRequest}
    style={styles.redBtn}
  >
    <Text style={styles.btnTextWhite}>
      Delete
    </Text>
  </TouchableOpacity>
</View>
          </View>
        </View>
      </Modal>
        </View>
  </SafeAreaView>
);
};
 
export default InboxScreen;
 
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, height: 85 },
  headerTitleText: { fontSize: 22, fontWeight: "700", color: "#2e4466", textAlign: 'center', flex: 1 },
  listSearchWrapper: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 5, backgroundColor: '#fff' },
  listSearchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f3f6', paddingHorizontal: 12, height: 45, borderRadius: 15, borderWidth: 1.5, borderColor: "#2e4466" },
  listSearchInput: { flex: 1, marginLeft: 8, fontSize: 15, color: '#2e4466', outlineStyle: 'none' },
  listContent: {
  paddingHorizontal: 20,
  paddingBottom: 75,
},
  sectionHeader: { fontSize: 14, fontWeight: "700", color: "#2e4466", marginBottom: 8, marginTop: 14 },
  emptyBox: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 280 },
  emptyText: { color: "#94a3b8", fontWeight: "700", fontSize: 15 },
  listCard: { flexDirection: "row", alignItems: "center", marginHorizontal: 2, marginTop: 2, marginBottom: 12, paddingVertical: 14, paddingHorizontal: 12, backgroundColor: "#fff", borderRadius: 15, boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)", elevation: 2 },
  listIconContainer: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#e9edf5", justifyContent: "center", alignItems: "center", marginRight: 12 },
  cardTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTitleName: { color: "#333", fontSize: 15, fontWeight: "700" },
  cardTimeText: { color: "#94a3b8", fontSize: 11 },
  cardSubText: { color: "#475569", fontSize: 13, fontWeight: "600", marginTop: 2 },
  cardLocationText: { color: "#64748b", fontSize: 12, marginTop: 2 },
  cardBottomRow: { flexDirection: "row", alignItems: "center", marginTop: 6, gap: 8 },
  statusBadge: { flexDirection: "row", alignItems: "center", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, gap: 4, borderWidth: 1 },
  statusText: { fontSize: 11, fontWeight: "700" },
  chatSmallBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#2e4466", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, gap: 4 },
  chatSmallText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  actionBtnMargin: { marginLeft: 12, padding: 4 },
  avatarWrapper: { marginRight: 12 },
  avatarImg: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#e2e8f0" },
  avatarFallback: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#2e4466", alignItems: "center", justifyContent: "center" },
  avatarFallbackText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  msgRow: { flexDirection: "row", alignItems: "center", marginTop: 3 },
  lastMsgText: { color: "#64748b", fontSize: 13, flex: 1 },
  unreadTextBold: { color: "#000", fontWeight: "700" },
  locationPreviewBox: { marginTop: 4 },
  previewLocationLine: { color: "#475569", fontSize: 12, fontWeight: "600" },
  unreadCountBadge: { width: 20, height: 20, borderRadius: 10, backgroundColor: "#2e4466", alignItems: "center", justifyContent: "center", marginLeft: 8 },
  unreadCountText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  detailOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  detailBox: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  detailHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  detailTitle: { color: "#1e293b", fontSize: 18, fontWeight: "700", flex: 1 },
  detailMeta: { color: "#64748b", fontSize: 12, marginBottom: 4 },
  detailLocation: { color: "#334155", fontSize: 12, fontWeight: "600", marginBottom: 4 },
  detailSectionHead: { color: "#1e293b", fontSize: 14, fontWeight: "700", marginTop: 14, marginBottom: 8 },
  detailItemRow: { flexDirection: "row", alignItems: "flex-start", backgroundColor: "#f8fafc", borderRadius: 14, padding: 12, marginBottom: 8 },
  detailItemName: { color: "#1e293b", fontSize: 14, fontWeight: "700" },
  detailItemMeta: { color: "#64748b", fontSize: 12, marginTop: 2 },
  detailShopText: { color: "#047857", fontSize: 12, fontWeight: "600", marginTop: 2 },
  detailItemPrice: { color: "#2e4466", fontSize: 14, fontWeight: "700", marginLeft: 8 },
  detailTotalRow: { flexDirection: "row", justifyContent: "space-between", paddingTop: 14, borderTopWidth: 1, borderTopColor: "#e2e8f0", marginTop: 10 },
  detailTotalLabel: { color: "#1e293b", fontSize: 16, fontWeight: "700" },
  detailTotalPrice: { color: "#2e4466", fontSize: 18, fontWeight: "700" },
  openChatBtn: { height: 48, borderRadius: 14, backgroundColor: "#2e4466", flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 20, gap: 8 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", alignItems: "center", paddingHorizontal: 15 },
  popup: { width: "80%", backgroundColor: "#fff", borderRadius: 22, paddingTop: 15, paddingBottom: 25, paddingHorizontal: 40, alignItems: "center", position: 'relative' },
  closeCornerBtn: { position: 'absolute', top: 15, right: 20, zIndex: 10, padding: 5 },
  closeX: { fontSize: 22, color: "#94a3b8", fontWeight: "bold" },
  popupTitle: { fontSize: 20, fontWeight: "700", color: "#111", marginTop: 18, textAlign: 'center' },
  modalSubtitle: { fontSize: 14, color: "#555", marginTop: 12, marginBottom: 30, textAlign: 'center', lineHeight: 20 },
  rowBtns: { flexDirection: "row", justifyContent: "space-between", width: "100%" },
  cancelBtn: { flex: 1, backgroundColor: "#e5e5e5", paddingVertical: 15, borderRadius: 14, alignItems: "center", marginRight: 10 },
  redBtn: { flex: 1, backgroundColor: "#ef4444", paddingVertical: 15, borderRadius: 14, alignItems: "center", marginLeft: 10 },
  btnTextWhite: { color: "#fff", fontWeight: "700", fontSize: 15 },
  cancelText: { color: "#333", fontWeight: "700", fontSize: 15 },
  
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

});