import React, { useCallback, useState } from "react";
import { API_URLS } from '../../src/services/apiConfig';

import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import BottomNav from "./BottomNav.js";

// const API_URL = "http://172.20.140.250:5000/api/shopkeeper";

const titleText = (title) => (title === "OTHER_REASON" ? "Other reason" : "Shop doesn't exist");

const formatDateTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
};

export default function ShopkeeperReports() {
  const router = useRouter();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(API_URLS.SHOP_REPORTS, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load reports");
      setReports(Array.isArray(data) ? data : []);
    } catch (error) {
      Alert.alert("Error", error.message || "Could not fetch reports");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchReports();
    }, [fetchReports])
  );

  const renderReport = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.iconCircle}>
          <MaterialCommunityIcons name="flag-outline" size={22} color="#ef4444" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.reportTitle}>{titleText(item.title)}</Text>
          <Text style={styles.reportTime}>{formatDateTime(item.createdAt)}</Text>
        </View>
      </View>
      <Text style={styles.reasonText}>{item.reason || "No extra reason provided."}</Text>
    </View>
  );

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={["#eef4fe", "#2e4466"]}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 0 }}
        style={styles.gradientHeader}
      >
        <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace("/shopkeeperDashboard"))}>
          <Ionicons name="chevron-back" size={28} color="#eef4fe" />
        </TouchableOpacity>
        <View style={styles.headerCenterContainer}>
          <Text style={styles.headerTitleText}>Reports</Text>
        </View>
        <TouchableOpacity onPress={fetchReports}>
          <Ionicons name="refresh" size={24} color="#2e4466" />
        </TouchableOpacity>
      </LinearGradient>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2e4466" />
        </View>
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={<Text style={styles.sectionHeading}>Shop Reports</Text>}
          ListEmptyComponent={<Text style={styles.emptyText}>No reports yet.</Text>}
          renderItem={renderReport}
        />
      )}

      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: "#f8fafc" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scrollContainer: { paddingHorizontal: 20, paddingBottom: 105 },
  gradientHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 26,
    width: "100%",
    elevation: 3,
  },
  headerCenterContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  headerTitleText: { fontSize: 20, fontWeight: "800", color: "#2e4466", textAlign: "center" },
  sectionHeading: { fontSize: 16, fontWeight: "900", color: "#1e293b", marginTop: 22, marginBottom: 8 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#475569",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  iconCircle: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#fef2f2", alignItems: "center", justifyContent: "center", marginRight: 12 },
  reportTitle: { color: "#0f172a", fontSize: 16, fontWeight: "900" },
  reportTime: { color: "#64748b", fontSize: 12, fontWeight: "700", marginTop: 3 },
  reasonText: { color: "#334155", fontSize: 13, lineHeight: 19, backgroundColor: "#f8fafc", borderRadius: 12, padding: 10 },
  emptyText: { textAlign: "center", color: "#94a3b8", marginTop: 40, fontWeight: "800" },
});
