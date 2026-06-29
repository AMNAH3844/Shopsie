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
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

// const API_BASE = "http://172.20.140.250:5000/api";

export default function RiderActiveDeliveries() {
  const router = useRouter();
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadDeliveries = useCallback(async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      const res = await axios.get(API_URLS.MY_DELIVERIES, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDeliveries(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.log("Active deliveries:", e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadDeliveries(); }, [loadDeliveries]));

  const markDelivered = async (id) => {
    try {
      const token = await AsyncStorage.getItem("token");
      await axios.post(`${API_URLS.COMPLETE_ORDER}/${id}/delivered`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      Alert.alert("Sent", "Customer confirmation message was sent.");
      loadDeliveries();
    } catch (e) {
      Alert.alert("Error", "Could not mark delivered");
    }
  };

  return (
  <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
    <View style={styles.container}>
      <LinearGradient colors={["#eef4fe", "#2e4466"]} start={{ x: 1, y: 0 }} end={{ x: 0, y: 0 }} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="#eef4fe" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Active Deliveries</Text>
        <View style={{ width: 28 }} />
      </LinearGradient>

     {loading ? (
  <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
    <ActivityIndicator size="large" color="#2e4466" />
  </View>
) : (
        <FlatList
          data={deliveries}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.emptyText}>No active deliveries</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{item.listName}</Text>
                  <Text style={styles.meta}>Customer: {item.customer?.username || "Customer"}</Text>
                </View>
                <Text style={styles.statusPill}>{item.status}</Text>
              </View>

              {!!item.buyingLocationLabel && <Text style={styles.locationText}>Buy from: {item.buyingLocationLabel}</Text>}
              {!!item.deliveryLocationLabel && <Text style={styles.locationText}>Deliver to: {item.deliveryLocationLabel}</Text>}

              <View style={styles.row}>
                <TouchableOpacity
                  style={styles.chatBtn}
                  onPress={() =>
                    router.push({
                      pathname: "/riderDashboard/request-chat",
                      params: { requestId: item.id },
                    })
                  }
                >
                  <Ionicons name="chatbubble-ellipses-outline" size={16} color="#fff" />
                  <Text style={styles.btnText}>Chat</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.doneBtn,
                    item.status === "DELIVERED" && styles.waitingBtn,
                  ]}
                  onPress={() => markDelivered(item.id)}
                  disabled={item.status === "DELIVERED"}
                >
                  <Ionicons
                    name={item.status === "DELIVERED" ? "time-outline" : "checkmark-done-outline"}
                    size={16}
                    color="#fff"
                  />
                  <Text style={styles.btnText}>
                    {item.status === "DELIVERED" ? "Waiting" : "Delivered"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
      <View style={styles.bottomNav}>
  <TouchableOpacity
    style={styles.tabItem}
    onPress={() => router.replace("/riderDashboard")}
  >
    <Ionicons name="home" size={22} color="white" />
    <Text style={styles.navText}>Home</Text>
  </TouchableOpacity>

  <TouchableOpacity
    style={styles.tabItem}
    onPress={() => router.push("/riderDashboard/history")}
  >
    <Ionicons name="time-outline" size={22} color="white" />
    <Text style={styles.navText}>History</Text>
  </TouchableOpacity>

  <TouchableOpacity
    style={styles.tabItem}
    onPress={() => router.push("/riderDashboard/downladedlistsrider")}
  >
    <Ionicons name="download-outline" size={22} color="white" />
    <Text style={styles.navText}>Downloads</Text>
  </TouchableOpacity>
</View>
        </View>
  </SafeAreaView>
);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },

  header: {
    height: 85,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },

  headerTitle: {
    flex: 1,
    color: "#eef4fe",
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },

 listContent: {
  padding: 16,
  paddingBottom: 75,
},
  emptyText: {
    textAlign: "center",
    color: "#64748b",
    fontWeight: "800",
    marginTop: 30,
  },

  card: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    elevation: 2,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  title: {
    color: "#1e293b",
    fontSize: 16,
    fontWeight: "900",
  },

  meta: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 4,
    fontWeight: "700",
  },

  statusPill: {
    color: "#2e4466",
    backgroundColor: "#eef4fe",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    fontSize: 11,
    fontWeight: "900",
    overflow: "hidden",
  },

  locationText: {
    color: "#475569",
    fontSize: 12,
    marginTop: 8,
    fontWeight: "700",
  },

  row: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },

  chatBtn: {
    flex: 1,
    backgroundColor: "#2e4466",
    padding: 11,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },

  doneBtn: {
    flex: 1,
    backgroundColor: "#10b981",
    padding: 11,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },

  waitingBtn: {
    backgroundColor: "#64748b",
  },

  btnText: {
    color: "#fff",
    fontWeight: "800",
    marginLeft: 6,
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
},
});
