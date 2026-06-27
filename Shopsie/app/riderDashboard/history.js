import React, { useCallback, useState } from "react";
import { API_URLS } from '../../src/services/apiConfig';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

// const API_BASE = "http://172.20.140.250:5000/api";

export default function RiderHistory() {
  const router = useRouter();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const res = await axios.get(API_URLS.RIDER_HISTORY, { headers: { Authorization: `Bearer ${token}` } });
      setHistory(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.log("Rider history:", e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadHistory(); }, [loadHistory]));

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#eef4fe", "#2e4466"]} start={{ x: 1, y: 0 }} end={{ x: 0, y: 0 }} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="chevron-back" size={28} color="#eef4fe" /></TouchableOpacity>
        <Text style={styles.headerTitle}>History</Text>
        <View style={{ width: 28 }} />
      </LinearGradient>

      {loading ? <ActivityIndicator size="large" color="#2e4466" style={{ marginTop: 50 }} /> : (
        <FlatList
          data={history}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No completed deliveries yet.</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.title}>{item.listName}</Text>
              <Text style={styles.meta}>Customer: {item.customer?.username || "Customer"}</Text>
              <Text style={styles.meta}>Completed: {item.completedAt ? new Date(item.completedAt).toLocaleString() : "Completed"}</Text>
              <Text style={styles.meta}>Items: {item.items?.length || 0}</Text>
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
  headerTitle: { flex: 1, color: "#2e4466", fontSize: 22, fontWeight: "800", textAlign: "center" },
  list: { padding: 16, paddingBottom: 100 },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: "#e2e8f0" },
  title: { color: "#1e293b", fontSize: 17, fontWeight: "900" },
  meta: { color: "#64748b", fontSize: 12, marginTop: 4 },
  empty: { textAlign: "center", marginTop: 50, color: "#94a3b8", fontWeight: "700" },
});
