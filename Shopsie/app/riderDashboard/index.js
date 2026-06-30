import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Modal,
  StyleSheet,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { API_URLS } from "../../src/services/apiConfig";
import styles from "../styles/dashboardStyle";

const DEFAULT_IMAGE = "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";

export default function DashboardRider() {
  const router = useRouter();
  
  // ==========================================
  // STATE MANAGEMENT (Variables to save data)
  // ==========================================
  const [username, setUsername] = useState("Rider Name");
  const [profileImage, setProfileImage] = useState(DEFAULT_IMAGE);
  const [showOptimizeModal, setShowOptimizeModal] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [warning, setWarning] = useState("");

  // ==========================================
  // WARNING TOAST FUNCTION (Show orange box)
  // ==========================================
  const triggerWarning = (message) => {
    setWarning(message);
    setTimeout(() => {
      setWarning("");
    }, 3000);
  };

  // ==========================================
  // API CALLS (Get data and update backend)
  // ==========================================
  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem("userData");
      const token = await AsyncStorage.getItem("token");

      if (userData) {
        const parsedData = JSON.parse(userData);
        setUsername(parsedData.username || "Rider Name");
        const img = parsedData.profileImage;
        setProfileImage(
          img && img.startsWith("http") ? img : DEFAULT_IMAGE
        );
      } else {
        setUsername("Rider Name");
        setProfileImage(DEFAULT_IMAGE);
      }

      if (token) {
        const notificationRes = await fetch(
          API_URLS.NOTIFICATIONS,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const notificationData = await notificationRes.json();

        if (
          notificationRes.ok &&
          Array.isArray(notificationData)
        ) {
          const unreadCount =
            notificationData.filter(
              (item) => !item.isRead
            ).length;

          setNotificationCount(unreadCount);
        }
      }
    } catch (err) {
      console.log("Error loading rider dashboard:", err);
      setProfileImage(DEFAULT_IMAGE);
      triggerWarning("Could not refresh background data.");
    }
  };

  // ==========================================
  // SCREEN FOCUS TRIGGER (Auto reload data)
  // ==========================================
  useFocusEffect(
    useCallback(() => {
      loadUserData();
    }, [])
  );

  // ==========================================
  // UI LAYOUT (What the user sees)
  // ==========================================
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={{ flex: 1, backgroundColor: "#f8fafc" }}>
        
        {/* TOP HEADER */}
        <LinearGradient
          colors={["#eef4fe", "#2e4466"]}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 0 }}
          style={styles.header}
        >
          <Text style={styles.logo}>SHOPSIE</Text>

          <View style={styles.icons}>
            <TouchableOpacity
              onPress={() => router.push("/notifications")}
              style={{
                position: "relative",
                marginRight: 4,
              }}
            >
              <Ionicons
                name="notifications"
                size={24}
                color="#2e4466"
                style={styles.iconSpacing}
              />

              {notificationCount > 0 && (
                <View
                  style={{
                    position: "absolute",
                    top: -8,
                    right: 2,
                    minWidth: 18,
                    height: 18,
                    borderRadius: 9,
                    backgroundColor: "#EF4444",
                    alignItems: "center",
                    justifyContent: "center",
                    paddingHorizontal: 4,
                  }}
                >
                  <Text
                    style={{
                      color: "#fff",
                      fontSize: 10,
                      fontWeight: "800",
                    }}
                  >
                    {notificationCount > 9 ? "9+" : notificationCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: "/settings",
                  params: { role: "rider" },
                })
              }
            >
              <Ionicons name="settings" size={24} color="#2e4466" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* FIXED CONTENT MAIN BODY */}
        <View style={{ flex: 1, justifyContent: "flex-start", paddingBottom: 90 }}>
          
          {/* PROFILE CARD */}
          <View
            style={[
              styles.profileCard,
              { marginHorizontal: 26, marginTop: 22, marginBottom: 24 },
            ]}
          >
            <Image
              source={{ uri: profileImage + "?t=" + Date.now() }}
              style={styles.profileImage}
            />
            <Text style={styles.username}>{username}</Text>
          </View>

          {/* ACTIVE DELIVERIES CARD */}
          <TouchableOpacity
            style={[styles.taskCard, { marginTop: 0, marginBottom: 28 }]}
            onPress={() => router.push("/riderDashboard/active-deliveries")}
          >
            <MaterialCommunityIcons
              name="truck-fast"
              size={55}
              color="#2e4466"
            />
            <Text style={styles.taskTitle}>Active Deliveries</Text>
          </TouchableOpacity>

          {/* GRID CONTAINER */}
          <View style={styles.grid}>
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push("/riderDashboard/requests")}
            >
              <Ionicons name="mail-outline" size={35} color="white" />
              <Text style={styles.cardText}>Requests</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push("/riderDashboard/accountdetails")}
            >
              <Ionicons name="wallet-outline" size={35} color="white" />
              <Text style={styles.cardText}>Account Details</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.card}
              onPress={() => setShowOptimizeModal(true)}
            >
              <Ionicons name="navigate-outline" size={35} color="white" />
              <Text style={styles.cardText}>Optimize Route</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push("/riderDashboard/set-location")}
            >
              <Ionicons name="location-outline" size={35} color="white" />
              <Text style={styles.cardText}>Set Location</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* OPTIMIZE ROUTE MODAL */}
        <Modal
          visible={showOptimizeModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowOptimizeModal(false)}
        >
          <View style={localStyles.modalOverlay}>
            <View style={localStyles.modalContent}>
              <Text style={localStyles.modalTitle}>
                Optimize Route From
              </Text>

              <TouchableOpacity
                style={localStyles.primaryModalBtn}
                onPress={() => {
                  setShowOptimizeModal(false);
                  router.push("/riderDashboard/active-deliveries");
                }}
              >
                <Text style={localStyles.primaryBtnText}>
                  Customer's Chat
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={localStyles.secondaryModalBtn}
                onPress={() => {
                  setShowOptimizeModal(false);
                  router.push("/riderDashboard/downladedlistsrider");
                }}
              >
                <Text style={localStyles.secondaryBtnText}>
                  Downloaded Lists
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={localStyles.cancelModalBtn}
                onPress={() => setShowOptimizeModal(false)}
              >
                <Text style={localStyles.primaryBtnText}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* ORANGE WARNING TOAST */}
        {!!warning && (
          <View style={localStyles.warningBox}>
            <Ionicons name="warning" size={20} color="#fff" />
            <Text style={localStyles.warningText}>{warning}</Text>
          </View>
        )}

        {/* BOTTOM NAVIGATION BAR */}
        <View style={localStyles.bottomNav}>
          <TouchableOpacity
            style={localStyles.tabItem}
            onPress={() => {
              setShowOptimizeModal(false);
            }}
          >
            <Ionicons name="home" size={22} color="white" />
            <Text style={localStyles.navText}>Home</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={localStyles.tabItem}
            onPress={() => router.push("/riderDashboard/history")}
          >
            <Ionicons name="time-outline" size={22} color="white" />
            <Text style={localStyles.navText}>History</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={localStyles.tabItem}
            onPress={() => router.push("/riderDashboard/downladedlistsrider")}
          >
            <Ionicons name="download-outline" size={22} color="white" />
            <Text style={localStyles.navText}>Downloads</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ==========================================
// LOCAL COMPONENT CSS OVERRIDES
// ==========================================
const localStyles = StyleSheet.create({
  warningBox: {
    position: 'absolute',
    bottom: 90,
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
  warningText: { 
    color: '#fff', 
    marginLeft: 10, 
    fontSize: 14, 
    fontWeight: '600', 
    flex: 1 
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.58)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "85%",
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#2e4466",
    textAlign: "center",
    marginBottom: 20,
  },
  primaryModalBtn: {
    backgroundColor: "#2e4466",
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  primaryBtnText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "800",
  },
  secondaryModalBtn: {
    backgroundColor: "#eef4fe",
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  secondaryBtnText: {
    color: "#2e4466",
    textAlign: "center",
    fontWeight: "800",
  },
  cancelModalBtn: {
    backgroundColor: "#64748b",
    padding: 14,
    borderRadius: 12,
  },
});