import React, { useCallback, useState } from "react";
import { API_URLS } from '../../src/services/apiConfig';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";

// const API = "http://172.20.140.250:5000/api";

export default function RiderDownloadedLists() {
  const router = useRouter();
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);

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
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadLists(); }, [loadLists]));

  const deleteList = async (id) => {
    try {
      const token = await AsyncStorage.getItem("token");
      await axios.delete(`${API_URLS.DOWNLOADED_LISTS}/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLists((prev) => prev.filter((l) => l.id !== id));
    } catch (e) {
      Alert.alert("Error", "Delete failed");
    }
  };

  const openOptimizer = (item) => {
    const requestId = item.originalListId || item.requestId;
    if (!requestId) {
      Alert.alert("Not available", "This downloaded list is not linked with a rider request.");
      return;
    }
    router.push({ pathname: "/riderDashboard/rideroptimizer", params: { requestId } });
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#eef4fe", "#2e4466"]} start={{ x: 1, y: 0 }} end={{ x: 0, y: 0 }} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="#eef4fe" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Downloaded Lists</Text>
        <View style={{ width: 28 }} />
      </LinearGradient>

      {loading ? (
        <ActivityIndicator size="large" color="#2e4466" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={lists}
          keyExtractor={(i) => String(i.id)}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.emptyText}>No lists saved</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{item.name}</Text>
                  <Text style={styles.meta}>From: {item.senderName || "Customer"}</Text>
                </View>

                <TouchableOpacity style={styles.optimizeBtn} onPress={() => openOptimizer(item)}>
                  <Ionicons name="navigate-circle-outline" size={24} color="#2e4466" />
                </TouchableOpacity>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryText}>Items: {item.items?.length || 0}</Text>
                {!!item.receiverType && <Text style={styles.summaryPill}>{item.receiverType}</Text>}
              </View>

              <View style={styles.row}>
                <TouchableOpacity
                  style={styles.openBtn}
                  onPress={() => Alert.alert("Items", JSON.stringify(item.items, null, 2))}
                >
                  <Ionicons name="eye-outline" size={16} color="#fff" />
                  <Text style={styles.btnText}>View</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.delBtn} onPress={() => deleteList(item.id)}>
                  <Ionicons name="trash-outline" size={16} color="#fff" />
                  <Text style={styles.btnText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: { height: 85, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { flex: 1, color: "#eef4fe", fontSize: 22, fontWeight: "800", textAlign: "center" },
  listContent: { padding: 16, paddingBottom: 100 },
  emptyText: { textAlign: "center", color: "#64748b", fontWeight: "800", marginTop: 30 },
  card: { backgroundColor: "#fff", padding: 14, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: "#e2e8f0", elevation: 2 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { color: "#1e293b", fontSize: 16, fontWeight: "900" },
  meta: { color: "#64748b", fontSize: 12, marginTop: 4, fontWeight: "700" },
  optimizeBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#eef4fe", alignItems: "center", justifyContent: "center", marginLeft: 10 },
  summaryRow: { marginTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  summaryText: { color: "#475569", fontSize: 12, fontWeight: "800" },
  summaryPill: { color: "#2e4466", backgroundColor: "#eef4fe", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, fontSize: 10, fontWeight: "900" },
  row: { flexDirection: "row", gap: 10, marginTop: 12 },
  openBtn: { flex: 1, backgroundColor: "#2e4466", padding: 11, borderRadius: 12, alignItems: "center", justifyContent: "center", flexDirection: "row" },
  delBtn: { flex: 1, backgroundColor: "#ef4444", padding: 11, borderRadius: 12, alignItems: "center", justifyContent: "center", flexDirection: "row" },
  btnText: { color: "#fff", fontWeight: "800", marginLeft: 6 },
});
