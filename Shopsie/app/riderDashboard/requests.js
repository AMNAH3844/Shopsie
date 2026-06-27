import React, { useCallback, useState } from "react";
import { API_URLS } from '../../src/services/apiConfig';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

export default function RiderRequests() {
  const router = useRouter();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [warning, setWarning] = useState("");

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");

      // Hits your router.get("/requests") endpoint
      const res = await axios.get(API_URLS.RIDER_CHAT, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const requestData = Array.isArray(res.data) ? res.data : [];

      // FILTER: Only show PENDING or EXPIRED requests. 
      // If a rider rejects it, status changes to "REJECTED" and it hides automatically.
      const filteredRequests = requestData.filter(
        (req) => req.status === "PENDING" || req.customerArchivedAt
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
    }, [loadRequests])
  );

  // Frontend Delete Function handler
  const deleteExpiredRequest = async (requestId) => {
    try {
      const token = await AsyncStorage.getItem("token");

      // Appends the endpoint correctly to target the backend delete router
      await axios.delete(`${API_URLS.RIDER_CHAT}/${requestId}/expired`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Filter local state instantly so it drops off UI smoothly
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (err) {
      console.log("Delete failed:", err?.response?.data || err.message);
    }
  };

  const openDetail = (item) => {
    if (item.customerArchivedAt) {
      setWarning("This request was cancelled by the customer before acceptance.");
      setTimeout(() => setWarning(""), 3000);
      return;
    }

    router.push({
      pathname: "/riderDashboard/request-detail",
      params: { requestId: item.id },
    });
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
            <Text style={styles.location}>Buy from: {item.buyingLocationLabel}</Text>
          )}

          {!!item.deliveryLocationLabel && (
            <Text style={styles.location}>Deliver to: {item.deliveryLocationLabel}</Text>
          )}

          {/* Actionable delete block rendering exclusively on items cancelled by client */}
          {!!item.customerArchivedAt && (
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => deleteExpiredRequest(item.id)}
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
        <Text style={styles.headerTitle}>Requests</Text>
        <View style={{ width: 28 }} />
      </LinearGradient>

      {warning ? (
        <View style={styles.warningBox}>
          <Ionicons name="warning" size={20} color="#fff" />
          <Text style={styles.warningText}>{warning}</Text>
        </View>
      ) : null}

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color="#2e4466" style={{ marginTop: 50 }} />
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
    color: "#2e4466",
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },
  list: { padding: 16, paddingBottom: 100 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  row: { flexDirection: "row" },
  title: { fontSize: 16, fontWeight: "900", color: "#1e293b" },
  meta: { fontSize: 12, color: "#64748b", marginTop: 4 },
  location: { fontSize: 12, color: "#334155", marginTop: 4 },
  status: {
    color: "#2e4466",
    fontWeight: "900",
    fontSize: 12,
  },
  empty: {
    textAlign: "center",
    marginTop: 50,
    color: "#94a3b8",
    fontWeight: "700",
  },
  expiredStatus: { color: "#ef4444" },
  warningBox: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: '#e67e22',
    padding: 14,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 9999,
    elevation: 6,
  },
  warningText: { color: '#fff', marginLeft: 10, fontSize: 14, fontWeight: '600', flex: 1 },
  deleteBtn: {
    marginTop: 10,
    backgroundColor: "#ef4444",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
  },
  deleteText: {
    color: "#fff",
    marginLeft: 6,
    fontWeight: "700",
    fontSize: 12,
  },
});