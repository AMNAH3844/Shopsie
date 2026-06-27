import React, { useEffect, useMemo, useState } from "react";
import { API_URLS } from '../../src/services/apiConfig';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  ScrollView,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

// const API = "http://172.20.140.250:5000/api/chat";
// const INBOX_API = "http://172.20.140.250:5000/api/inbox";

const formatCoords = (lat, lng) => {
  if (lat == null || lng == null) return "";
  return `Lat: ${Number(lat).toFixed(6)} | Lng: ${Number(lng).toFixed(6)}`;
};

export default function ChatScreen() {
  const {
    userId: otherUserId,
    listId,
    listName,
    items,
  } = useLocalSearchParams();
  const router = useRouter();

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedList, setSelectedList] = useState(null);
  const [selectedListOwnerId, setSelectedListOwnerId] = useState(null);

  const [deleteModal, setDeleteModal] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState(null);

  const [toastMessage, setToastMessage] = useState("");
  const [showToast, setShowToast] = useState(false);

  const quickMessages = ["Ok", "Done", "Received", "On the way", "Updated", "Yes", "No"];

  const getQuantity = (item) => item?.quantity || 1;
  const getSpecification = (item) => {
    const spec = item?.specification?.toString().trim();
    return spec ? spec : "None";
  };
  const getCategory = (item) => item?.categoryName || "Uncategorized";
  const hasShopSelection = (item) => !!item?.selectedShopName;

  const getSelectedShopText = (item) => {
    if (!hasShopSelection(item)) return null;
    return `Shop: ${item.selectedShopName} | Price: Rs. ${item.selectedShopPrice || 0}`;
  };

  const getListLocation = (list, kind) => {
    const latKey = kind === "delivery" ? "deliveryLocationLat" : "buyingLocationLat";
    const lngKey = kind === "delivery" ? "deliveryLocationLng" : "buyingLocationLng";
    const labelKey = kind === "delivery" ? "deliveryLocationLabel" : "buyingLocationLabel";
    const item = list?.items?.find((i) => i[latKey] && i[lngKey]);
    if (!item) return null;
    return {
      label: item[labelKey] || "Selected location",
      lat: item[latKey],
      lng: item[lngKey],
    };
  };

  const getListTotal = (list) =>
    (list?.items || []).reduce((sum, item) => sum + Number(item.lineTotal || 0), 0);

  const selectedListBuyingLocation = useMemo(() => getListLocation(selectedList, "buying"), [selectedList]);
  const selectedListDeliveryLocation = useMemo(() => getListLocation(selectedList, "delivery"), [selectedList]);
  const selectedListTotal = useMemo(() => getListTotal(selectedList), [selectedList]);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2500);
  };

  const insertQuickMessage = (msg) => setText(msg);

  const getPendingShareItems = () => {
    if (!items || items === "[]" || items === "null") return [];
    try {
      const parsed = typeof items === "string" ? JSON.parse(items) : items;
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.log("SHARE ITEMS PARSE ERROR:", e.message);
      return [];
    }
  };

  useEffect(() => {
    const loadUser = async () => {
      const user = await AsyncStorage.getItem("userData");
      if (user) setUserId(JSON.parse(user).id);
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (otherUserId && userId) fetchMessages();
  }, [otherUserId, userId]);

  useEffect(() => {
    if (!otherUserId || !userId) return undefined;
    const interval = setInterval(() => fetchMessages(false), 5000);
    return () => clearInterval(interval);
  }, [otherUserId, userId]);

  const fetchMessages = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      const token = await AsyncStorage.getItem("token");
      const res = await axios.get(`${API_URLS.CHAT}/conversation/${otherUserId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessages(res.data || []);
    } catch (e) {
console.log("CHAT ERROR Status:", e.response?.status);
    console.log("CHAT ERROR Data:", e.response?.data);    } finally {
      if (showLoader) setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!text.trim()) return;

    try {
      const token = await AsyncStorage.getItem("token");
      const lastList = messages.filter((m) => m.type === "LIST").slice(-1)[0];
      if (!lastList) return triggerToast("Please select a list to share first");

      const res = await axios.post(
        `${API_URLS.CHAT}/send`,
        { listId: lastList.listData.id, text },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMessages((prev) => [
        ...prev,
        { id: res.data.id, type: "TEXT", text: res.data.text, senderId: res.data.senderId },
      ]);
      setText("");
    } catch (e) {
      console.log("SEND ERROR:", e.message);
    }
  };

  const shareSelectedList = async () => {
    const parsedItems = getPendingShareItems();

    if (!parsedItems.length) {
      triggerToast("Please select a list to share first");
      return;
    }

    if (!otherUserId) {
      triggerToast("Friend not selected");
      return;
    }

    try {
      const token = await AsyncStorage.getItem("token");
      await axios.post(
        `${API_URLS.INBOX}/share`,
        {
          receiverId: Number(otherUserId),
          listId: listId ? Number(listId) : undefined,
          listName: listName || "Shared List",
          items: parsedItems,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      triggerToast("List shared!");
      fetchMessages(false);
    } catch (e) {
      console.log("SHARE LIST ERROR:", e.response?.data || e.message);
      triggerToast("Failed to share list");
    }
  };

  const confirmDeleteMessage = (id) => {
    setSelectedMessageId(id);
    setDeleteModal(true);
  };

  const deleteMessage = async (id) => {
    try {
      const token = await AsyncStorage.getItem("token");
      await axios.delete(`${API_URLS.CHAT}/delete/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessages((prev) => prev.filter((m) => m.id !== id));
    } catch (e) {
      console.log("DELETE ERROR:", e.message);
    }
  };

  const downloadList = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      await axios.post(
        API_URLS.DOWNLOADS,
        { list: selectedList },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSelectedList(null);
      setSelectedListOwnerId(null);
      triggerToast("List downloaded!");
    } catch (e) {
      if (e.response?.data?.message === "Already downloaded") {
        setSelectedList(null);
        setSelectedListOwnerId(null);
        triggerToast("This list has already been downloaded!");
      } else {
        console.log("DOWNLOAD ERROR:", e.message);
      }
    }
  };

  const renderListPreviewItem = (i, index, isMe) => (
    <View key={index} style={styles.previewItemBlock}>
      <Text style={[styles.previewCategory, { color: isMe ? "#bae6fd" : "#1e40af" }]}>{getCategory(i)}</Text>
      <View style={styles.previewItemNameRow}>
        {i.customerOptimizerDone && (
          <Ionicons name="checkbox" size={14} color={isMe ? "#bbf7d0" : "#10b981"} style={{ marginRight: 5 }} />
        )}
        <Text style={[isMe ? styles.listItemMe : styles.listItemOther, i.customerOptimizerDone && styles.previewDoneText]}>
          - {i.name}
        </Text>
      </View>
      <Text style={[styles.previewMeta, { color: isMe ? "#dbeafe" : "#475569" }]}>Qty: {getQuantity(i)} | Spec: {getSpecification(i)}</Text>
      {hasShopSelection(i) && (
        <Text style={[styles.previewMeta, { color: isMe ? "#dbeafe" : "#475569" }]}>{getSelectedShopText(i)}</Text>
      )}
      {i.lineTotal != null && (
        <Text style={[styles.previewMeta, { color: isMe ? "#dbeafe" : "#475569" }]}>Line Total: Rs. {i.lineTotal || 0}</Text>
      )}
    </View>
  );

  const renderLocationPreview = (title, location, isMe) => {
    if (!location) return null;
    return (
      <View style={styles.previewLocationBlock}>
        <Text style={[styles.previewLocationTitle, { color: isMe ? "#bae6fd" : "#1e40af" }]}>
          {title}
        </Text>
        <Text style={[styles.previewMeta, { color: isMe ? "#dbeafe" : "#475569" }]}>
          {location.label}
        </Text>
        <Text style={[styles.previewMeta, { color: isMe ? "#dbeafe" : "#475569" }]}>
          {formatCoords(location.lat, location.lng)}
        </Text>
      </View>
    );
  };

  const renderItem = ({ item }) => {
    const isMe = item.senderId === userId;

    if (item.type === "LIST") {
      const listBuyingLocation = getListLocation(item.listData, "buying");
      const listDeliveryLocation = getListLocation(item.listData, "delivery");
      const listTotal = getListTotal(item.listData);

      return (
        <View style={[styles.messageContainer, isMe ? styles.alignRight : styles.alignLeft]}>
          <TouchableOpacity
            style={[styles.listBox, isMe ? styles.listMe : styles.listOther]}
            onPress={() => {
              setSelectedList(item.listData);
              setSelectedListOwnerId(item.senderId);
            }}
          >
            <View style={styles.listHeaderRow}>
              <Ionicons name="list" size={16} color={isMe ? "#e0f2fe" : "#1e3a8a"} style={{ marginRight: 6 }} />
              <Text style={isMe ? styles.listTitleMe : styles.listTitleOther}>{item.listData.name}</Text>
            </View>

            {renderLocationPreview("Buy from", listBuyingLocation, isMe)}
            {renderLocationPreview("Deliver to", listDeliveryLocation, isMe)}

            {item.listData.items?.slice(0, 4).map((i, index) => renderListPreviewItem(i, index, isMe))}

            {item.listData.items?.length > 4 && (
              <Text style={{ color: isMe ? "#bae6fd" : "#64748b", fontSize: 12, marginTop: 6 }}>
                +{item.listData.items.length - 4} more items
              </Text>
            )}

            {listTotal > 0 && (
              <Text style={[styles.previewTotal, { color: isMe ? "#bbf7d0" : "#10b981" }]}>Total Bill: Rs. {listTotal}</Text>
            )}

            <View style={[styles.tapOpenRow, { borderTopColor: isMe ? "rgba(255,255,255,0.15)" : "rgba(30,58,138,0.1)" }]}>
              <Text style={{ color: isMe ? "#bae6fd" : "#2563eb", fontSize: 12, fontWeight: "600" }}>Tap to view list</Text>
              <Ionicons name="chevron-forward" size={14} color={isMe ? "#bae6fd" : "#2563eb"} />
            </View>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={[styles.messageContainer, isMe ? styles.alignRight : styles.alignLeft]}>
        {!isMe && <View style={{ width: 4 }} />}
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
          <Text style={isMe ? styles.textMe : styles.textOther}>{item.text}</Text>
        </View>

        {isMe && (
          <TouchableOpacity style={styles.deleteBtn} onPress={() => confirmDeleteMessage(item.id)}>
            <Ionicons name="trash-outline" size={14} color="#ff4d4d" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2e4466" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#f1f1f1" }}>
      <LinearGradient colors={["#eef4fe", "#2e4466"]} start={{ x: 1, y: 0 }} end={{ x: 0, y: 0 }} style={styles.header}>
        <TouchableOpacity onPress={() => router.push("/customerDashboard/inbox")}>
          <Ionicons name="chevron-back" size={28} color="#eef4fe" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chat</Text>
        <View style={{ width: 28 }} />
      </LinearGradient>

      <View style={styles.container}>
        <FlatList data={messages} keyExtractor={(item) => item.id.toString()} renderItem={renderItem} contentContainerStyle={{ padding: 10 }} showsVerticalScrollIndicator={false} />

        <View style={styles.quickRow}>
          <FlatList
            data={quickMessages}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.quickBtn} onPress={() => insertQuickMessage(item)}>
                <Text style={styles.quickText}>{item}</Text>
              </TouchableOpacity>
            )}
          />
        </View>

        <View style={styles.inputRow}>
          <TouchableOpacity style={styles.shareListBtn} onPress={shareSelectedList}>
            <Ionicons name="share-social-outline" size={20} color="#2e4466" />
          </TouchableOpacity>
          <TextInput value={text} onChangeText={setText} placeholder="Type message..." placeholderTextColor="#999" style={styles.input} />
          <TouchableOpacity onPress={sendMessage}>
            <Text style={styles.send}>Send</Text>
          </TouchableOpacity>
        </View>
      </View>

      {selectedList && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalBoxLarge}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalListTitle}>{selectedList.name}</Text>

              {selectedListOwnerId !== userId && (
                <TouchableOpacity style={styles.beautifiedDownloadBtn} onPress={downloadList}>
                  <Ionicons name="download-outline" size={16} color="#fff" style={{ marginRight: 4 }} />
                  <Text style={styles.beautifiedDownloadText}>Download</Text>
                </TouchableOpacity>
              )}
            </View>

            {(selectedListBuyingLocation || selectedListDeliveryLocation) && (
              <View style={styles.locationSummary}>
                {selectedListBuyingLocation && (
                  <>
                    <Text style={styles.locationTitle}>Main Buying Location</Text>
                    <Text style={styles.locationText}>{selectedListBuyingLocation.label}</Text>
                    <Text style={styles.locationText}>{formatCoords(selectedListBuyingLocation.lat, selectedListBuyingLocation.lng)}</Text>
                  </>
                )}
                {selectedListDeliveryLocation && (
                  <>
                    <Text style={[styles.locationTitle, { marginTop: selectedListBuyingLocation ? 8 : 0 }]}>Delivery Location</Text>
                    <Text style={styles.locationText}>{selectedListDeliveryLocation.label}</Text>
                    <Text style={styles.locationText}>{formatCoords(selectedListDeliveryLocation.lat, selectedListDeliveryLocation.lng)}</Text>
                  </>
                )}
              </View>
            )}

            <ScrollView style={{ width: "100%", maxHeight: 430 }} showsVerticalScrollIndicator={false}>
              {selectedList.items?.map((i, idx) => (
                <View key={idx} style={styles.modalItemBlock}>
                  <Text style={styles.modalCategory}>{getCategory(i)}</Text>
                  <View style={styles.modalItemNameRow}>
                    <Ionicons
                      name={i.customerOptimizerDone ? "checkbox" : "square-outline"}
                      size={18}
                      color={i.customerOptimizerDone ? "#10b981" : "#94a3b8"}
                      style={{ marginRight: 7 }}
                    />
                    <Text style={[styles.modalItemName, i.customerOptimizerDone && styles.modalDoneText]}>- {i.name}</Text>
                  </View>
                  <Text style={styles.modalMeta}>Qty: {getQuantity(i)} | Spec: {getSpecification(i)}</Text>

                  {hasShopSelection(i) && (
                    <>
                      <Text style={styles.modalShop}>Shop: {i.selectedShopName} | Price: Rs. {i.selectedShopPrice || 0}</Text>
                      <Text style={styles.modalMeta}>Shop Lat/Lng: {i.selectedShopLatitude || "-"}, {i.selectedShopLongitude || "-"}</Text>
                      <Text style={styles.modalMeta}>Available: {i.availableQuantity || 0} of {getQuantity(i)}</Text>
                    </>
                  )}

                  {i.lineTotal != null && <Text style={styles.modalTotal}>Line Total: Rs. {i.lineTotal}</Text>}
                </View>
              ))}
            </ScrollView>

            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Total Bill</Text>
              <Text style={styles.billValue}>Rs. {selectedListTotal}</Text>
            </View>

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => {
                setSelectedList(null);
                setSelectedListOwnerId(null);
              }}
            >
              <Text style={styles.modalCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {showToast && (
        <View style={styles.warningBox}>
          <Ionicons name="alert-circle-outline" size={20} color="#fff" />
          <Text style={styles.warningText}>{toastMessage}</Text>
        </View>
      )}

      <Modal visible={deleteModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <TouchableOpacity onPress={() => setDeleteModal(false)} style={styles.closeCornerBtn}>
              <Text style={styles.closeX}>x</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: "#d45a3a" }]}>Delete Message</Text>
            <Text style={styles.modalSubtitle}>Do you want to delete this message?</Text>
            <View style={styles.shareButtonsRow}>
              <TouchableOpacity style={[styles.friendBtn, { backgroundColor: "#e5e5e5" }]} onPress={() => setDeleteModal(false)}>
                <Text style={[styles.friendBtnText, { color: "#333" }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.riderBtn, { backgroundColor: "#d45a3a" }]}
                onPress={async () => {
                  await deleteMessage(selectedMessageId);
                  setDeleteModal(false);
                }}
              >
                <Text style={styles.riderBtnText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f1f1f1" },
  header: { height: 85, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 22, fontWeight: "800", color: "#eef4fe" },
  container: { flex: 1 },
  messageContainer: { flexDirection: "row", marginVertical: 6, alignItems: "flex-end" },
  alignRight: { justifyContent: "flex-end" },
  alignLeft: { justifyContent: "flex-start" },
  bubble: { maxWidth: "78%", borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMe: { backgroundColor: "#2e4466", borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: "#fff", borderBottomLeftRadius: 4 },
  textMe: { color: "#fff", fontSize: 14, lineHeight: 20 },
  textOther: { color: "#1e293b", fontSize: 14, lineHeight: 20 },
  deleteBtn: { marginLeft: 6, padding: 4 },
  listBox: { maxWidth: "86%", borderRadius: 16, padding: 12, elevation: 2 },
  listMe: { backgroundColor: "#2e4466", borderBottomRightRadius: 4 },
  listOther: { backgroundColor: "#fff", borderBottomLeftRadius: 4 },
  listHeaderRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  listTitleMe: { color: "#fff", fontWeight: "800", fontSize: 15, flex: 1 },
  listTitleOther: { color: "#1e3a8a", fontWeight: "800", fontSize: 15, flex: 1 },
  previewItemBlock: { marginTop: 5 },
  previewItemNameRow: { flexDirection: "row", alignItems: "center" },
  previewDoneText: { textDecorationLine: "line-through", opacity: 0.85 },
  previewLocationBlock: { marginTop: 6 },
  previewLocationTitle: { fontSize: 12, fontWeight: "900", marginBottom: 1 },
  previewCategory: { fontSize: 12, fontWeight: "800", marginBottom: 2 },
  listItemMe: { color: "#fff", fontSize: 13, fontWeight: "700" },
  listItemOther: { color: "#334155", fontSize: 13, fontWeight: "700" },
  previewMeta: { fontSize: 12, marginTop: 2, lineHeight: 17 },
  previewTotal: { fontSize: 12, marginTop: 6, fontWeight: "900" },
  tapOpenRow: { marginTop: 10, paddingTop: 8, borderTopWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  quickRow: { paddingHorizontal: 8, paddingVertical: 8, backgroundColor: "#f8fafc", borderTopWidth: 1, borderTopColor: "#e2e8f0" },
  quickBtn: { backgroundColor: "#eef4fe", borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8 },
  quickText: { color: "#2e4466", fontWeight: "700", fontSize: 13 },
  inputRow: { flexDirection: "row", alignItems: "center", padding: 10, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#e2e8f0" },
  shareListBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#eef4fe", alignItems: "center", justifyContent: "center", marginRight: 8 },
  input: { flex: 1, backgroundColor: "#f1f5f9", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, color: "#1e293b" },
  send: { color: "#2e4466", fontWeight: "800", marginLeft: 12, fontSize: 15 },
  modalOverlay: { position: "absolute", top: 0, bottom: 0, left: 0, right: 0, backgroundColor: "rgba(15,23,42,0.6)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalBox: { width: "100%", maxWidth: 420, backgroundColor: "#fff", borderRadius: 20, padding: 22, alignItems: "center" },
  modalBoxLarge: {
  width: "100%",
  maxWidth: 470,
  maxHeight: "85%",   // ✅ important
  backgroundColor: "#fff",
  borderRadius: 20,
  padding: 16,
},
  modalHeaderRow: { width: "100%", flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  modalListTitle: { fontWeight: "800", fontSize: 20, color: "#2e4466", flex: 1, marginRight: 10 },
  beautifiedDownloadBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#10b981", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8 },
  beautifiedDownloadText: { color: "#fff", fontWeight: "800", fontSize: 12 },
  locationSummary: { width: "100%", backgroundColor: "#f8fafc", borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", padding: 10, marginBottom: 10 },
  locationTitle: { color: "#2e4466", fontSize: 13, fontWeight: "900" },
  locationText: { color: "#475569", fontSize: 12, marginTop: 3 },
  modalItemBlock: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  modalCategory: { color: "#2e4466", fontSize: 14, fontWeight: "800", marginBottom: 4 },
  modalItemNameRow: { flexDirection: "row", alignItems: "center" },
  modalItemName: { color: "#334155", fontSize: 14, fontWeight: "700" },
  modalDoneText: { color: "#10b981", textDecorationLine: "line-through" },
  modalMeta: { color: "#64748b", marginTop: 3, fontSize: 12, lineHeight: 18 },
  modalShop: { color: "#10b981", marginTop: 3, fontSize: 12, lineHeight: 18, fontWeight: "800" },
  modalTotal: { color: "#10b981", marginTop: 3, fontSize: 12, fontWeight: "800" },
  billRow: { width: "100%", flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 12, marginTop: 8, borderTopWidth: 1, borderTopColor: "#e2e8f0" },
  billLabel: { color: "#1e293b", fontSize: 15, fontWeight: "900" },
  billValue: { color: "#10b981", fontSize: 17, fontWeight: "900" },
  modalCloseButton: { backgroundColor: "#2e4466", borderRadius: 14, paddingVertical: 12, alignItems: "center", marginTop: 14 },
  modalCloseButtonText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  warningBox: { position: "absolute", bottom: 20, left: 15, right: 15, backgroundColor: "#e67e22", padding: 14, borderRadius: 14, flexDirection: "row", alignItems: "center", zIndex: 9999 },
  warningText: { color: "#fff", marginLeft: 10, fontSize: 14, fontWeight: "700", flex: 1 },
  closeCornerBtn: { position: "absolute", top: 14, right: 18, zIndex: 10 },
  closeX: { fontSize: 20, color: "#94a3b8", fontWeight: "800" },
  modalTitle: { fontSize: 19, fontWeight: "800", color: "#1e293b", marginTop: 14 },
  modalSubtitle: { fontSize: 14, color: "#64748b", marginTop: 10, marginBottom: 24, textAlign: "center", lineHeight: 20 },
  shareButtonsRow: { width: "100%", flexDirection: "row", justifyContent: "space-between" },
  friendBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center", marginRight: 6 },
  riderBtn: { flex: 1, backgroundColor: "#2e4466", paddingVertical: 12, borderRadius: 12, alignItems: "center", marginLeft: 6 },
  friendBtnText: { fontWeight: "800", fontSize: 14 },
  riderBtnText: { color: "#fff", fontWeight: "800", fontSize: 14 },
});
