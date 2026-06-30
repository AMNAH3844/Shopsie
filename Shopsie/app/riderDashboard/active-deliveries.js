import React, { useCallback, useState } from "react";
import { API_URLS } from '../../src/services/apiConfig';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

export default function RiderActiveDeliveries() {
  const router = useRouter();
  
  // ==========================================
  // STATE MANAGEMENT
  // ==========================================
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showWarningBox, setShowWarningBox] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // ==========================================
  // WARNING TOAST ACTIONS
  // ==========================================
  const triggerWarning = (message) => {
    setToastMessage(message);
    setShowWarningBox(true);
    setTimeout(() => {
      setShowWarningBox(false);
    }, 2500);
  };

  // ==========================================
  // DATA FETCHING & API COMMUNICATIONS
  // ==========================================
  const loadDeliveries = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const token = await AsyncStorage.getItem("token");
      const res = await axios.get(API_URLS.MY_DELIVERIES, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDeliveries(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.log("Active deliveries error:", e.message);
      triggerWarning("Failed to sync deliveries.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // ==========================================
  // SCREEN FOCUS TRIGGER HOOKS
  // ==========================================
  useFocusEffect(
    useCallback(() => { 
      loadDeliveries(); 
    }, [loadDeliveries])
  );

  const markDelivered = async (id) => {
    try {
      const token = await AsyncStorage.getItem("token");
      await axios.post(`${API_URLS.COMPLETE_ORDER}/${id}/delivered`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      triggerWarning("Customer confirmation message sent!");
      loadDeliveries();
    } catch (e) {
      triggerWarning("Could not mark delivered");
    }
  };

  // ==========================================
  // MAIN COMPONENT LAYOUT UI
  // ==========================================
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={styles.container}>
        
        {/* TOP HEADER */}
        <LinearGradient colors={["#eef4fe", "#2e4466"]} start={{ x: 1, y: 0 }} end={{ x: 0, y: 0 }} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color="#eef4fe" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Active Deliveries</Text>
          <View style={{ width: 28 }} />
        </LinearGradient>

        {/* LOADING SPINNER OR MAIN LIST CONTENT */}
        {loading ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator size="large" color="#2e4466" />
          </View>
        ) : (
          <FlatList
            data={deliveries}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.listContent}
            refreshing={refreshing}
            onRefresh={() => loadDeliveries(true)}
            ListEmptyComponent={<Text style={styles.emptyText}>No active deliveries</Text>}
            renderItem={({ item }) => (
              
              /* DELIVERY LIST CARD */
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

                {/* CARD ACTION BUTTONS */}
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

        {/* ORANGE WARNING TOAST ALERT */}
        {showWarningBox && (
          <View style={styles.warningBox}>
            <Ionicons name="alert-circle-outline" size={20} color="#fff" />
            <Text style={styles.warningText}>{toastMessage}</Text>
          </View>
        )}

        {/* FIXED BOTTOM NAVIGATION BAR */}
        <View style={styles.bottomNav}>
          <TouchableOpacity style={styles.tabItem} onPress={() => router.replace("/riderDashboard")}>
            <Ionicons name="home" size={22} color="white" />
            <Text style={styles.navText}>Home</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.tabItem} onPress={() => router.push("/riderDashboard/history")}>
            <Ionicons name="time-outline" size={22} color="white" />
            <Text style={styles.navText}>History</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.tabItem} onPress={() => router.push("/riderDashboard/downladedlistsrider")}>
            <Ionicons name="download-outline" size={22} color="white" />
            <Text style={styles.navText}>Downloads</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ==========================================
// STYLESHEET REGISTRY
// ==========================================
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
  
  // Explicit Heading set to 700
  headerTitle: {
    flex: 1,
    color: "#2e4466",
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  
  listContent: {
    padding: 16,
    paddingBottom: 75,
  },
  emptyText: {
    textAlign: "center",
    color: "#64748b",
    fontWeight: "600",
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
  
  // Custom nonheadings standardized to 600 or 500
  title: {
    color: "#1e293b",
    fontSize: 16,
    fontWeight: "600",
  },
  meta: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 4,
    fontWeight: "500",
  },
  statusPill: {
    color: "#2e4466",
    backgroundColor: "#eef4fe",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    fontSize: 11,
    fontWeight: "600",
    overflow: "hidden",
  },
  locationText: {
    color: "#475569",
    fontSize: 12,
    marginTop: 8,
    fontWeight: "500",
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
    fontWeight: "600",
    marginLeft: 6,
  },
  warningBox: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    right: 20,
    backgroundColor: '#e67e22',
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 9999,
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  warningText: {
    color: '#fff',
    marginLeft: 10,
    fontSize: 14,
    fontWeight: '500'
  },
  bottomNav: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 75,
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