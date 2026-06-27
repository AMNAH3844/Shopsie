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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

// const API_BASE = "http://172.20.140.250:5000/api";

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
            <View style={styles.modalIconCircle}>
              <MaterialCommunityIcons name="bicycle" size={40} color="#2e4466" />
            </View>

            <Text style={styles.modalTitle}>Share List?</Text>

            <Text style={styles.modalBody}>
              Do you want to share{"\n"}
              <Text style={styles.boldText}>
                "{listName || "this list"}"
              </Text>
              {"\n"}with rider{" "}
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
                <Text style={styles.yesBtnText}>Yes, Share</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

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
    textAlign: "center",
    color: "#2e4466",
    fontSize: 22,
    fontWeight: "800",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: { color: "#64748b", fontSize: 14 },
  list: { padding: 16, paddingBottom: 100 },
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
    backgroundColor: "rgba(15,23,42,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalBox: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 28,
    width: "82%",
    alignItems: "center",
    elevation: 12,
  },
  modalIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#eef4fe",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  modalTitle: {
    color: "#1e293b",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 8,
    textAlign: "center",
  },
  modalBody: {
    color: "#64748b",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 14,
  },
  boldText: { color: "#2e4466", fontWeight: "900" },
  advanceBox: {
    width: "100%",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 14,
    padding: 12,
    marginBottom: 18,
  },
  advanceText: { color: "#334155", fontSize: 12, fontWeight: "700", marginTop: 2 },
  advanceWarning: { color: "#b91c1c", fontSize: 12, fontWeight: "900", lineHeight: 18, marginTop: 8 },
  advanceOk: { color: "#047857", fontSize: 12, fontWeight: "900", marginTop: 8 },
  modalBtnRow: { flexDirection: "row", gap: 12, width: "100%" },
  noBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  noBtnText: { color: "#64748b", fontSize: 15, fontWeight: "800" },
  yesBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#2e4466",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  yesBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },
});
