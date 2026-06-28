import React, { useCallback, useEffect, useMemo, useState } from "react";
// Import API_URLS
import { API_URLS } from '../../src/services/apiConfig'; 
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const formatCoords = (lat, lng) => {
  if (lat == null || lng == null) return "";
  return `Lat: ${Number(lat).toFixed(6)} | Lng: ${Number(lng).toFixed(6)}`;
};

export default function RiderChat(props) {
  const router = useRouter();
  const localParams = useLocalSearchParams();

  const requestId =
    props?.route?.params?.requestId ??
    localParams?.requestId ??
    localParams?.id ??
    null;

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [viewerUserId, setViewerUserId] = useState(null);
  const [requestInfo, setRequestInfo] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [selectedList, setSelectedList] = useState(null);
  const [selectedListOwnerId, setSelectedListOwnerId] = useState(null);
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

    if (list?.[latKey] && list?.[lngKey]) {
      return {
        label: list[labelKey] || "Selected location",
        lat: list[latKey],
        lng: list[lngKey],
      };
    }

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

  const canDownloadSelectedList =
    selectedList &&
    requestInfo?.customerId != null &&
    viewerUserId != null &&
    String(requestInfo.customerId) !== String(viewerUserId);

  const canUseRiderOptimizer =
    requestInfo?.customerId != null &&
    viewerUserId != null &&
    String(requestInfo.customerId) !== String(viewerUserId);

  const openRiderOptimizer = (event) => {
    event?.stopPropagation?.();
    if (!requestId) return;
    router.push({
      pathname: "/riderDashboard/rideroptimizer",
      params: { requestId },
    });
  };

  const chatData = useMemo(() => {
    if (!requestInfo) return messages;
    return [
      {
        id: `request-list-${requestInfo.id}`,
        type: "LIST",
        senderId: requestInfo.customerId,
        listData: {
          id: requestInfo.id,
          name: requestInfo.listName || "Shopping List",
          items: requestInfo.items || [],
          buyingLocationLat: requestInfo.buyingLocationLat,
          buyingLocationLng: requestInfo.buyingLocationLng,
          buyingLocationLabel: requestInfo.buyingLocationLabel,
          deliveryLocationLat: requestInfo.deliveryLocationLat,
          deliveryLocationLng: requestInfo.deliveryLocationLng,
          deliveryLocationLabel: requestInfo.deliveryLocationLabel,
        },
      },
      ...messages,
    ];
  }, [messages, requestInfo]);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2500);
  };

  const loadChat = useCallback(async () => {
    if (!requestId) {
      Alert.alert("Error", "Missing request id");
      setLoading(false);
      return;
    }

    try {
      const token = await AsyncStorage.getItem("token");
      // Use API_URLS.RIDER_CHAT which is BASE/api/rider/requests
      const res = await axios.get(`${API_URLS.RIDER_CHAT}/${requestId}/chat`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setMessages(Array.isArray(res.data.messages) ? res.data.messages : []);
      setViewerUserId(res.data.viewerUserId ?? null);
      
      // Hardened data extraction to fix the invisible list issue
      const info = res.data.request || res.data;
      setRequestInfo(info && info.id ? info : null);

    } catch (err) {
      console.log(err?.response?.data || err.message);
      Alert.alert("Error", err.response?.data?.message || "Failed to load chat");
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    loadChat();
  }, [loadChat]);

  useFocusEffect(
    useCallback(() => {
      loadChat();
    }, [loadChat])
  );

  useEffect(() => {
    if (!requestId) return undefined;
    const interval = setInterval(loadChat, 5000);
    return () => clearInterval(interval);
  }, [loadChat, requestId]);

  const sendMessage = async () => {
    if (!text.trim() || !requestId) return;

    try {
      const token = await AsyncStorage.getItem("token");
      const res = await axios.post(
        `${API_URLS.RIDER_CHAT}/${requestId}/chat`,
        { text },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMessages((prev) => [...prev, res.data]);
      setText("");
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Message not sent");
    }
  };

  const downloadSenderList = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      await axios.post(
        `${API_URLS.RIDER_CHAT}/${requestId}/download-list`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSelectedList(null);
      setSelectedListOwnerId(null);
      triggerToast("List downloaded!");
    } catch (err) {
      if (err.response?.data?.message === "Already downloaded") {
        setSelectedList(null);
        setSelectedListOwnerId(null);
        triggerToast("This list has already been downloaded!");
      } else {
        Alert.alert("Error", err.response?.data?.message || "Could not save list");
      }
    }
  };

  const confirmDelivery = async () => {
    if (!requestId || confirming) return;

    try {
      setConfirming(true);
      const token = await AsyncStorage.getItem("token");
      const res = await axios.post(
        `${API_URLS.RIDER_CHAT}/${requestId}/confirm`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setRequestInfo((prev) => ({
        ...(prev || {}),
        ...(res.data || {}),
        status: res.data?.status || "COMPLETED",
      }));
      setMessages((prev) => [
        ...prev,
        {
          id: `local-confirm-${Date.now()}`,
          senderId: viewerUserId,
          text: "Customer confirmed delivery. Order completed.",
          type: "SYSTEM",
          createdAt: new Date().toISOString(),
        },
      ]);
      triggerToast("Delivery moved to history.");
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Could not confirm delivery");
    } finally {
      setConfirming(false);
    }
  };

  const renderListPreviewItem = (i, index, isMe) => (
    <View key={index} style={styles.previewItemBlock}>
      <Text style={[styles.previewCategory, { color: isMe ? "#bae6fd" : "#1e40af" }]}>{getCategory(i)}</Text>
      <View style={styles.previewItemNameRow}>
        {i.riderOptimizerDone && (
          <Ionicons name="checkbox" size={14} color={isMe ? "#bbf7d0" : "#10b981"} style={{ marginRight: 5 }} />
        )}
        <Text style={[isMe ? styles.listItemMe : styles.listItemOther, i.riderOptimizerDone && styles.previewDoneText]}>
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
        <Text style={[styles.previewLocationTitle, { color: isMe ? "#bae6fd" : "#1e40af" }]}>{title}</Text>
        <Text style={[styles.previewMeta, { color: isMe ? "#dbeafe" : "#475569" }]}>{location.label}</Text>
        <Text style={[styles.previewMeta, { color: isMe ? "#dbeafe" : "#475569" }]}>{formatCoords(location.lat, location.lng)}</Text>
      </View>
    );
  };

  const renderItem = ({ item }) => {
    const isMine = viewerUserId != null && String(item.senderId) === String(viewerUserId);

    if (item.type === "LIST") {
      const listBuyingLocation = getListLocation(item.listData, "buying");
      const listDeliveryLocation = getListLocation(item.listData, "delivery");
      const listTotal = getListTotal(item.listData);

      return (
        <View style={[styles.messageContainer, isMine ? styles.alignRight : styles.alignLeft]}>
          <TouchableOpacity
            style={[styles.listBox, isMine ? styles.listMe : styles.listOther]}
            onPress={() => {
              setSelectedList(item.listData);
              setSelectedListOwnerId(item.senderId);
            }}
          >
            <View style={styles.listHeaderRow}>
              <Ionicons name="list" size={16} color={isMine ? "#e0f2fe" : "#1e3a8a"} style={{ marginRight: 6 }} />
              <Text style={isMine ? styles.listTitleMe : styles.listTitleOther}>{item.listData.name}</Text>

              {canUseRiderOptimizer && (
                <TouchableOpacity
                  style={[
                    styles.optimizeIconBtn,
                    { backgroundColor: isMine ? "rgba(255,255,255,0.16)" : "#eef4fe" },
                  ]}
                  onPress={openRiderOptimizer}
                >
                  <Ionicons
                    name="navigate-circle-outline"
                    size={20}
                    color={isMine ? "#e0f2fe" : "#2e4466"}
                  />
                </TouchableOpacity>
              )}
            </View>

            {renderLocationPreview("Buy from", listBuyingLocation, isMine)}
            {renderLocationPreview("Deliver to", listDeliveryLocation, isMine)}
            {item.listData.items?.slice(0, 4).map((i, index) => renderListPreviewItem(i, index, isMine))}

            {item.listData.items?.length > 4 && (
              <Text style={{ color: isMine ? "#bae6fd" : "#64748b", fontSize: 12, marginTop: 6 }}>
                +{item.listData.items.length - 4} more items
              </Text>
            )}

            {listTotal > 0 && (
              <Text style={[styles.previewTotal, { color: isMine ? "#bbf7d0" : "#10b981" }]}>Total Bill: Rs. {listTotal}</Text>
            )}

            <View style={[styles.tapOpenRow, { borderTopColor: isMine ? "rgba(255,255,255,0.15)" : "rgba(30,58,138,0.1)" }]}>
              <Text style={{ color: isMine ? "#bae6fd" : "#2563eb", fontSize: 12, fontWeight: "600" }}>Tap to view list</Text>
              <Ionicons name="chevron-forward" size={14} color={isMine ? "#bae6fd" : "#2563eb"} />
            </View>
          </TouchableOpacity>
        </View>
      );
    }

    const isDeliveryConfirm =
      item.type === "DELIVERY_CONFIRM" ||
      String(item.text || "").toLowerCase().includes("waiting for customer confirmation");
    const canConfirm =
      isDeliveryConfirm &&
      requestInfo?.customerId != null &&
      String(requestInfo.customerId) === String(viewerUserId) &&
      !requestInfo?.customerConfirmedAt &&
      requestInfo?.status !== "COMPLETED";

    return (
      <View style={[styles.messageContainer, isMine ? styles.alignRight : styles.alignLeft]}>
        <View style={[styles.bubble, isMine ? styles.bubbleMe : styles.bubbleOther]}>
          <Text style={isMine ? styles.textMe : styles.textOther}>{item.text}</Text>
          {canConfirm && (
            <TouchableOpacity style={styles.confirmBox} onPress={confirmDelivery} disabled={confirming}>
              <Ionicons name={confirming ? "time-outline" : "checkbox-outline"} size={16} color="#047857" />
              <Text style={styles.confirmBoxText}>{confirming ? "Confirming..." : "Confirm delivery complete"}</Text>
            </TouchableOpacity>
          )}
        </View>
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
    <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <LinearGradient colors={["#eef4fe", "#2e4466"]} start={{ x: 1, y: 0 }} end={{ x: 0, y: 0 }} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="#eef4fe" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rider Chat</Text>
        <View style={{ width: 28 }} />
      </LinearGradient>

      {requestInfo?.status === "COMPLETED" && (
        <View style={styles.completedBanner}>
          <Ionicons name="checkmark-circle-outline" size={18} color="#047857" />
          <Text style={styles.completedText}>Delivery completed and moved to history.</Text>
        </View>
      )}

      <View style={styles.container}>
        <FlatList
          data={chatData}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<Text style={styles.emptyText}>No messages yet.</Text>}
        />

        <View style={styles.quickRow}>
          <FlatList
            data={quickMessages}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.quickBtn} onPress={() => setText(item)}>
                <Text style={styles.quickText}>{item}</Text>
              </TouchableOpacity>
            )}
          />
        </View>

        <View style={styles.inputRow}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Type message..."
            placeholderTextColor="#999"
            style={styles.input}
          />
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
              {canDownloadSelectedList && (
                <TouchableOpacity style={styles.beautifiedDownloadBtn} onPress={downloadSenderList}>
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
                      name={i.riderOptimizerDone ? "checkbox" : "square-outline"}
                      size={18}
                      color={i.riderOptimizerDone ? "#10b981" : "#94a3b8"}
                      style={{ marginRight: 7 }}
                    />
                    <Text style={[styles.modalItemName, i.riderOptimizerDone && styles.modalDoneText]}>- {i.name}</Text>
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f1f1f1" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f1f1f1" },
  header: { height: 85, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 22, fontWeight: "800", color: "#eef4fe" },
  container: { flex: 1 },
  completedBanner: { margin: 10, marginBottom: 0, backgroundColor: "#d1fae5", borderColor: "#6ee7b7", borderWidth: 1, padding: 10, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  completedText: { color: "#047857", textAlign: "center", fontWeight: "800", marginLeft: 8 },
  messagesList: { padding: 10, paddingBottom: 20 },
  messageContainer: { flexDirection: "row", marginVertical: 6, alignItems: "flex-end" },
  alignRight: { justifyContent: "flex-end" },
  alignLeft: { justifyContent: "flex-start" },
  bubble: { maxWidth: "78%", borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMe: { backgroundColor: "#2e4466", borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: "#fff", borderBottomLeftRadius: 4 },
  textMe: { color: "#fff", fontSize: 14, lineHeight: 20 },
  textOther: { color: "#1e293b", fontSize: 14, lineHeight: 20 },
  listBox: { maxWidth: "86%", borderRadius: 16, padding: 12, elevation: 2 },
  listMe: { backgroundColor: "#2e4466", borderBottomRightRadius: 4 },
  listOther: { backgroundColor: "#fff", borderBottomLeftRadius: 4 },
  listHeaderRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  listTitleMe: { color: "#fff", fontWeight: "800", fontSize: 15, flex: 1 },
  listTitleOther: { color: "#1e3a8a", fontWeight: "800", fontSize: 15, flex: 1 },
  optimizeIconBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", marginLeft: 8 },
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
  confirmBox: { marginTop: 10, backgroundColor: "#ecfdf5", borderRadius: 10, paddingVertical: 9, paddingHorizontal: 10, borderWidth: 1, borderColor: "#10b981", flexDirection: "row", alignItems: "center" },
  confirmBoxText: { color: "#047857", fontWeight: "800", fontSize: 12, marginLeft: 6 },
  emptyText: { textAlign: "center", marginTop: 20, color: "#94a3b8", fontWeight: "600" },
  quickRow: { paddingHorizontal: 8, paddingVertical: 8, backgroundColor: "#f8fafc", borderTopWidth: 1, borderTopColor: "#e2e8f0" },
  quickBtn: { backgroundColor: "#eef4fe", borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8 },
  quickText: { color: "#2e4466", fontWeight: "700", fontSize: 13 },
  inputRow: { flexDirection: "row", alignItems: "center", padding: 10, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#e2e8f0" },
  input: { flex: 1, backgroundColor: "#f1f5f9", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, color: "#1e293b" },
  send: { color: "#2e4466", fontWeight: "800", marginLeft: 12, fontSize: 15 },
  modalOverlay: { position: "absolute", top: 0, bottom: 0, left: 0, right: 0, backgroundColor: "rgba(15,23,42,0.6)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalBoxLarge: { width: "100%", maxWidth: 470, maxHeight: "85%", backgroundColor: "#fff", borderRadius: 20, padding: 16 },
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
});
