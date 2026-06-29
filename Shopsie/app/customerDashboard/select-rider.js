import React, { useCallback, useMemo, useState } from "react";
import { API_URLS } from '../../src/services/apiConfig';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const firstParam = (value, fallback = "") => {
  if (Array.isArray(value)) return value[0] ?? fallback;
  return value ?? fallback;
};

const numberParam = (value) => {
  const parsed = Number(firstParam(value, ""));
  return Number.isFinite(parsed) ? parsed : null;
};

const formatCurrency = (value) => `Rs. ${Number(value || 0).toLocaleString()}`;

export default function CustomerSelectRider() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const listId = firstParam(params.listId, "");
  const listType = firstParam(params.listType, "saved");
  const listName = firstParam(params.listName, "");

  const buyingLocationLat = numberParam(params.buyingLocationLat);
  const buyingLocationLng = numberParam(params.buyingLocationLng);
  const buyingLocationLabel = firstParam(params.buyingLocationLabel, "");

  const deliveryLocationLat = numberParam(params.deliveryLocationLat);
  const deliveryLocationLng = numberParam(params.deliveryLocationLng);
  const deliveryLocationLabel = firstParam(params.deliveryLocationLabel, "");

  const items = useMemo(() => {
    try {
      const rawItems = firstParam(params.items, "");
      return rawItems ? JSON.parse(rawItems) : [];
    } catch {
      return [];
    }
  }, [params.items]);

  const [sourceList, setSourceList] = useState(null);
  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState(null);
  const [sentRiders, setSentRiders] = useState({});
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [selectedRider, setSelectedRider] = useState(null);

  const listTotal = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0),
    [items]
  );

  const selectedRiderCashLimit = Number(selectedRider?.dailyCashLimit || 0);
  const selectedAdvanceAmount = Math.max(0, listTotal - selectedRiderCashLimit);

  const requestPayload = useMemo(
    () => ({
      listId,
      listType,
      listName,
      items,
      buyingLocationLat,
      buyingLocationLng,
      buyingLocationLabel,
      deliveryLocationLat,
      deliveryLocationLng,
      deliveryLocationLabel,
    }),
    [
      listId,
      listType,
      listName,
      items,
      buyingLocationLat,
      buyingLocationLng,
      buyingLocationLabel,
      deliveryLocationLat,
      deliveryLocationLng,
      deliveryLocationLabel,
    ]
  );

  const loadRiders = useCallback(async () => {
    try {
      setLoading(true);

      if (buyingLocationLat === null || buyingLocationLng === null) {
        setRiders([]);
        return Alert.alert(
          "Buying location required",
          "Please choose a valid 'buy items from' location before finding riders."
        );
      }

      const token = await AsyncStorage.getItem("token");

      const res = await axios.post(`${API_URLS.RIDER}/nearby`, requestPayload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setSourceList(res.data?.sourceList || null);
      setRiders(Array.isArray(res.data?.riders) ? res.data.riders : []);
    } catch (e) {
      Alert.alert(
        "Error",
        e.response?.data?.message || "Could not load nearby riders."
      );
    } finally {
      setLoading(false);
    }
  }, [buyingLocationLat, buyingLocationLng, requestPayload]);

  useFocusEffect(
    useCallback(() => {
      loadRiders();
    }, [loadRiders])
  );

  const handleSharePress = (rider) => {
    setSelectedRider(rider);
    setConfirmVisible(true);
  };

  const handleConfirmShare = async () => {
    if (!selectedRider) return;

    setConfirmVisible(false);

    try {
      setSendingId(selectedRider.riderId);

      const token = await AsyncStorage.getItem("token");

      await axios.post(`${API_URLS.RIDER}/request`,
        {
          ...requestPayload,
          riderId: selectedRider.riderId,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSentRiders((prev) => ({ ...prev, [selectedRider.riderId]: true }));
    } catch (e) {
      Alert.alert(
        "Error",
        e.response?.data?.message || "Could not send request."
      );
    } finally {
      setSendingId(null);
      setSelectedRider(null);
    }
  };

  const renderRider = ({ item }) => {
    const isPending = !!sentRiders[item.riderId];
    const isSending = sendingId === item.riderId;

    return (
      <View style={styles.riderCard}>
        <View style={styles.avatar}>
          <MaterialCommunityIcons name="bicycle" size={28} color="#2e4466" />
        </View>

        <View style={styles.riderInfo}>
          <Text style={styles.riderName}>{item.name}</Text>
          <Text style={styles.meta}>{item.distanceKm} km away</Text>

          {!!item.locationLabel && (
            <Text style={styles.locationMeta} numberOfLines={2}>
              {item.locationLabel}
            </Text>
          )}

          <Text style={styles.cashMeta}>
            Cash limit: {item.dailyCashLimit == null ? "Not set" : formatCurrency(item.dailyCashLimit)}
          </Text>
          {!!item.paymentProviderName && (
            <Text style={styles.paymentMeta} numberOfLines={1}>
              For online transfer: {item.paymentProviderName}
            </Text>
          )}
        </View>

        {isPending ? (
          <View style={styles.pendingBadge}>
            <Ionicons name="time-outline" size={13} color="#d97706" />
            <Text style={styles.pendingText}>Pending{"\n"}Request</Text>
          </View>
        ) : isSending ? (
          <ActivityIndicator color="#2e4466" style={{ marginRight: 8 }} />
        ) : (
          <TouchableOpacity
            style={styles.shareIconBtn}
            onPress={() => handleSharePress(item)}
          >
            <Ionicons name="share-social" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
  <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
    <View style={[styles.container, { backgroundColor: "#ffffff" }]}>
      <StatusBar barStyle="light-content" />
      
      {/* ================= EXACT UNIFIED HEADER ================= */}
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

        <Text style={styles.headerTitle}>Find Rider</Text>
        <View style={{ width: 28 }} />
      </LinearGradient>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2e4466" />
          <Text style={styles.loadingText}>Finding nearby riders...</Text>
        </View>
      ) : (
        <FlatList
          data={riders}
          keyExtractor={(item) => String(item.riderId)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>
                {listName || sourceList?.name || "Selected List"}
              </Text>

              <Text style={styles.infoMeta}>
                Showing riders online near the buying location
              </Text>

              {!!buyingLocationLabel && (
                <View style={styles.locationRow}>
                  <Ionicons name="location" size={14} color="#2e4466" />
                  <Text style={styles.locationRowText} numberOfLines={2}>
                    {buyingLocationLabel}
                  </Text>
                </View>
              )}

              <Text style={styles.countText}>
                {riders.length} rider(s) found nearby
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <MaterialCommunityIcons
                name="bicycle-electric"
                size={56}
                color="#cbd5e1"
              />
              <Text style={styles.emptyText}>
                No online riders found near this area.
              </Text>
              <Text style={styles.emptyMeta}>
                Riders must save their location and turn on duty status to appear here.
              </Text>
            </View>
          }
          renderItem={renderRider}
        />
      )}

      {/* CONFIRMATION MODAL */}
      <Modal
        visible={confirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setConfirmVisible(false);
          setSelectedRider(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <TouchableOpacity
              onPress={() => {
                setConfirmVisible(false);
                setSelectedRider(null);
              }}
              style={styles.closeCornerBtn}
            >
              <Text style={styles.closeX}>✕</Text>
            </TouchableOpacity>
            
            <Text style={styles.modalTitle}>Share List?</Text>

            <Text style={styles.modalBody}>
              Do you want to share{" "}
              <Text style={styles.boldText}>
                "{listName || "this list"}"
              </Text>{" "}
              with rider{" "}
              <Text style={styles.boldText}>{selectedRider?.name}</Text>?
            </Text>

            <View style={styles.advanceBox}>
              <Text style={styles.advanceText}>List total: {formatCurrency(listTotal)}</Text>
              <Text style={styles.advanceText}>
                Rider cash limit: {selectedRider?.dailyCashLimit == null ? "Not set" : formatCurrency(selectedRider.dailyCashLimit)}
              </Text>
              {selectedAdvanceAmount > 0 ? (
                <Text style={styles.advanceWarning}>
                  You will have to pay {formatCurrency(selectedAdvanceAmount)} in advance before delivery because rider has {formatCurrency(selectedRiderCashLimit)} cash.
                </Text>
              ) : (
                <Text style={styles.advanceOk}>No advance is required from cash-limit difference.</Text>
              )}
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.noBtn}
                onPress={() => {
                  setConfirmVisible(false);
                  setSelectedRider(null);
                }}
              >
                <Text style={styles.noBtnText}>No</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.yesBtn} onPress={handleConfirmShare}>
                <Ionicons
                  name="share-social"
                  size={16}
                  color="#fff"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.yesBtnText}>Yes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ================= EXACT UNIFIED BOTTOM NAVIGATION ================= */}
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
     </View>
  </SafeAreaView>
);
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff" },
  header: {
    height: 85,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    color: "#2e4466",
    fontSize: 22,
    fontWeight: "700",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: { color: "#64748b", fontSize: 14 },
list: {
  padding: 16,
  paddingBottom: 75,
},
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    elevation: 2,
  },
  infoTitle: { color: "#1e293b", fontSize: 17, fontWeight: "900" },
  infoMeta: { color: "#64748b", fontSize: 12, marginTop: 4 },
  locationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#eef4fe",
    borderRadius: 10,
    padding: 8,
    marginTop: 8,
    gap: 5,
  },
  locationRowText: {
    flex: 1,
    color: "#2e4466",
    fontSize: 12,
    fontWeight: "700",
  },
  countText: {
    color: "#2e4466",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 8,
    textAlign: "right",
  },
  riderCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    elevation: 2,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#eef4fe",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#b9d5ff",
  },
  riderInfo: { flex: 1, marginLeft: 12 },
  riderName: { color: "#1e293b", fontSize: 15, fontWeight: "900" },
  meta: { color: "#64748b", fontSize: 12, marginTop: 3 },
  locationMeta: { color: "#334155", fontSize: 11, marginTop: 3 },
  cashMeta: { color: "#2e4466", fontSize: 12, marginTop: 5, fontWeight: "900" },
  paymentMeta: { color: "#047857", fontSize: 11, marginTop: 3, fontWeight: "800" },
  shareIconBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#2e4466",
    alignItems: "center",
    justifyContent: "center",
  },
  pendingBadge: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fef3c7",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#fde68a",
    minWidth: 72,
  },
  pendingText: {
    color: "#d97706",
    fontSize: 10,
    fontWeight: "900",
    textAlign: "center",
    marginTop: 2,
  },
  emptyBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    gap: 10,
  },
  emptyText: {
    color: "#94a3b8",
    fontWeight: "700",
    fontSize: 15,
    textAlign: "center",
  },
  emptyMeta: {
    color: "#cbd5e1",
    fontSize: 12,
    textAlign: "center",
    paddingHorizontal: 30,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 15,
  },
  modalBox: {
    width: "80%",
    backgroundColor: "#fff",
    borderRadius: 22,
    paddingTop: 15,
    paddingBottom: 25,
    paddingHorizontal: 40,
    alignItems: "center",
    position: "relative",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111",
    marginTop: 18,
  },
  modalBody: {
    fontSize: 14,
    color: "#555",
    marginTop: 12,
    marginBottom: 20,
    textAlign: "center",
  },
  boldText: { color: "#2e4466", fontWeight: "900" },
  advanceBox: {
    width: "100%",
    backgroundColor: "#f7f9fc",
    borderRadius: 14,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e1e8ee",
  },
  advanceText: { color: "#334155", fontSize: 12, fontWeight: "700", marginTop: 2 },
  advanceWarning: { color: "#b91c1c", fontSize: 12, fontWeight: "900", lineHeight: 18, marginTop: 8 },
  advanceOk: { color: "#047857", fontSize: 12, fontWeight: "900", marginTop: 8 },
  modalBtnRow: { flexDirection: "row", gap: 12, width: "100%" },
  noBtn: {
    flex: 1,
    backgroundColor: "#e5e5e5",
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    marginRight: 10,
  },
  noBtnText: {
    color: "#333",
    fontWeight: "700",
    fontSize: 15,
  },
  yesBtn: {
    flex: 1,
    backgroundColor: "#314a73",
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    marginLeft: 10,
    flexDirection: "row",
    justifyContent: "center",
  },
  yesBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  closeCornerBtn: {
    position: "absolute",
    top: 15,
    right: 20,
    zIndex: 10,
    padding: 5,
  },
  closeX: {
    fontSize: 22,
    color: "#94a3b8",
    fontWeight: "bold",
  },
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
}
});