import React, { useCallback, useState } from "react";
import { API_URLS } from '../../src/services/apiConfig';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

// const API_BASE = "http://172.20.140.250:5000/api";

export default function RiderRequestDetail() {
  const router = useRouter();
  const { requestId } = useLocalSearchParams();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadDetail = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const res = await axios.get(`${API_URLS.RIDER_CHAT}/${requestId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRequest(res.data);
    } catch (e) {
      Alert.alert("Error", "Could not load request.");
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useFocusEffect(useCallback(() => { loadDetail(); }, [loadDetail]));

  const respond = async (action) => {
    try {
      setSaving(true);
      const token = await AsyncStorage.getItem("token");
      await axios.post(
        `${API_URLS.RIDER_CHAT}/${requestId}/respond`,
        { action },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (action === "accept") {
        router.replace({ pathname: "/riderDashboard/request-chat", params: { requestId } });
      } else {
        Alert.alert("Rejected", "Request rejected.");
        router.back();
      }
    } catch (e) {
      Alert.alert("Error", e.response?.data?.message || "Could not update request.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#2e4466" /></View>;

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#eef4fe", "#2e4466"]} start={{ x: 1, y: 0 }} end={{ x: 0, y: 0 }} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="chevron-back" size={28} color="#eef4fe" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Request Detail</Text>
        <View style={{ width: 28 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.card}>
          <Text style={styles.title}>{request?.listName}</Text>
          <Text style={styles.meta}>Customer: {request?.customer?.username || "Customer"}</Text>
          <Text style={styles.meta}>Status: {request?.status}</Text>
          {!!request?.buyingLocationLabel && <Text style={styles.location}>Buy from: {request.buyingLocationLabel}</Text>}
          {!!request?.deliveryLocationLabel && <Text style={styles.location}>Deliver to: {request.deliveryLocationLabel}</Text>}
        </View>

        <Text style={styles.sectionTitle}>List Items</Text>
        {request?.items?.map((item) => (
          <View key={item.id} style={styles.itemRow}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.meta}>Qty: {item.quantity || 1} | Spec: {item.specification || "None"}</Text>
            {!!item.selectedShopName && <Text style={styles.shopText}>Shop: {item.selectedShopName} | Rs. {item.selectedShopPrice || 0}</Text>}
          </View>
        ))}

        {request?.status === "PENDING" && (
          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={() => respond("reject")} disabled={saving}>
              <Text style={styles.actionText}>Reject</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.acceptBtn]} onPress={() => respond("accept")} disabled={saving}>
              <Text style={styles.actionText}>Accept</Text>
            </TouchableOpacity>
          </View>
        )}

        {request?.status === "ACCEPTED" && (
          <TouchableOpacity style={styles.chatBtn} onPress={() => router.push({ pathname: "/riderDashboard/request-chat", params: { requestId } })}>
            <Ionicons name="chatbubble-ellipses-outline" size={18} color="#fff" />
            <Text style={styles.chatText}>Open Chat</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { height: 85, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { flex: 1, color: "#2e4466", fontSize: 22, fontWeight: "800", textAlign: "center" },
  body: { padding: 16, paddingBottom: 100 },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#e2e8f0", marginBottom: 16 },
  title: { color: "#1e293b", fontSize: 18, fontWeight: "900" },
  meta: { color: "#64748b", fontSize: 12, marginTop: 4 },
  location: { color: "#334155", fontSize: 12, marginTop: 6, fontWeight: "800" },
  sectionTitle: { color: "#1e293b", fontSize: 16, fontWeight: "900", marginBottom: 10 },
  itemRow: { backgroundColor: "#fff", borderRadius: 14, padding: 12, borderWidth: 1, borderColor: "#e2e8f0", marginBottom: 10 },
  itemName: { color: "#1e293b", fontSize: 15, fontWeight: "900" },
  shopText: { color: "#047857", fontSize: 12, fontWeight: "800", marginTop: 5 },
  actionRow: { flexDirection: "row", gap: 12, marginTop: 18 },
  actionBtn: { flex: 1, height: 50, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  rejectBtn: { backgroundColor: "#ef4444" },
  acceptBtn: { backgroundColor: "#10b981" },
  actionText: { color: "#fff", fontSize: 15, fontWeight: "900" },
  chatBtn: { height: 50, borderRadius: 14, backgroundColor: "#2e4466", flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 18 },
  chatText: { color: "#fff", fontSize: 15, fontWeight: "900", marginLeft: 8 },
});
