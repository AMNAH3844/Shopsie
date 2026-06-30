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
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import styles from "../styles/dashboardStyle";
import { API_URLS } from "../../src/services/apiConfig";

const DEFAULT_IMAGE = "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";

export default function DashboardCustomer() {
  const router = useRouter();
  // const insets = useSafeAreaInsets();

  const [username, setUsername] = useState("User Name");
  const [profileImage, setProfileImage] = useState(DEFAULT_IMAGE);

  const [showPopup, setShowPopup] = useState(false);
  const [showOptimizePopup, setShowOptimizePopup] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      const loadUserData = async () => {
        try {
          const userData = await AsyncStorage.getItem("userData");
          const token = await AsyncStorage.getItem("token");

          if (userData) {
            const parsedData = JSON.parse(userData);
            setUsername(parsedData.username || "User Name");
            const img = parsedData.profileImage;

            if (img && img.startsWith("http")) {
              setProfileImage(img);
            } else {
              setProfileImage(DEFAULT_IMAGE);
            }
          }

          if (token) {
            console.log("TOKEN:", token);
            const notificationRes = await fetch(API_URLS.NOTIFICATIONS, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });

            console.log("NOTIFICATION STATUS:", notificationRes.status);
            const notificationData = await notificationRes.json();
            console.log("NOTIFICATIONS:", notificationData);

            if (notificationRes.ok && Array.isArray(notificationData)) {
              const unreadCount = notificationData.filter(
                (item) => !item.isRead,
              ).length;
              console.log("UNREAD COUNT:", unreadCount);
              setNotificationCount(unreadCount);
            }
          }
        } catch (err) {
          console.log("Dashboard Error:", err);
          setProfileImage(DEFAULT_IMAGE);
        }
      };
      loadUserData();
    }, []),
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={styles.container}>
        {/* HEADER */}
        <LinearGradient
          colors={["#eef4fe", "#2e4466"]}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 0 }}
          style={styles.header}
        >
          <Text style={styles.logo}>SHOPSIE</Text>

          <View style={styles.icons}>
            <TouchableOpacity onPress={() => router.push("/notifications")}>
              <Ionicons name="notifications" size={24} color="#2e4466" />
              {notificationCount > 0 && (
                <View
                  style={{
                    position: "absolute",
                    top: -8,
                    right: -6,
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
                  params: { role: "customer" },
                })
              }
            >
              <Ionicons name="settings" size={24} color="#2e4466" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* PROFILE CARD */}
        <View style={styles.profileCard}>
          <Image source={{ uri: profileImage }} style={styles.profileImage} />
          <Text style={styles.username}>{username}</Text>
        </View>

        {/* GRID */}
        <View style={styles.grid}>
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push("/customerDashboard/createlist")}
          >
            <MaterialCommunityIcons
              name="playlist-edit"
              size={35}
              color="white"
            />
            <Text style={styles.cardText}>Create List</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push("/customerDashboard/friends")}
          >
            <Ionicons name="people-outline" size={35} color="white" />
            <Text style={styles.cardText}>Friends</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.card}
            onPress={() => setShowPopup(true)}
          >
            <MaterialCommunityIcons name="bicycle" size={35} color="white" />
            <Text style={styles.cardText}>Request Rider</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.card}
            onPress={() => setShowOptimizePopup(true)}
          >
            <Ionicons name="navigate-outline" size={35} color="white" />
            <Text style={styles.cardText}>Optimize Route</Text>
          </TouchableOpacity>
        </View>

        {/* 1. REQUEST RIDER POPUP */}
        <Modal visible={showPopup} transparent animationType="fade">
          <View style={localStyles.modalOverlay}>
            <View style={localStyles.modalBox}>
              <TouchableOpacity
                onPress={() => setShowPopup(false)}
                style={localStyles.closeCornerBtn}
              >
                <Text style={localStyles.closeX}>✕</Text>
              </TouchableOpacity>

              <Text style={localStyles.modalTitle}>Share List</Text>
              <Text style={localStyles.modalSubtitle}>
                From where you want to share?
              </Text>

              <View style={localStyles.shareButtonsRow}>
                <TouchableOpacity
                  onPress={() => {
                    setShowPopup(false);
                    router.push({
                      pathname: "/customerDashboard/savedlist",
                      params: { flow: "request_rider" },
                    });
                  }}
                  style={[
                    localStyles.modalBtn,
                    { backgroundColor: "#f06543", marginRight: 10 },
                  ]}
                >
                  <Text style={localStyles.modalBtnText}>Saved List</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setShowPopup(false);
                    router.push({
                      pathname: "/customerDashboard/downloadlists",
                      params: { flow: "request_rider" },
                    });
                  }}
                  style={[localStyles.modalBtn, { backgroundColor: "#2e4466" }]}
                >
                  <Text style={localStyles.modalBtnText}>Downloaded</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* 2. OPTIMIZE ROUTE POPUP */}
        <Modal visible={showOptimizePopup} transparent animationType="fade">
          <View style={localStyles.modalOverlay}>
            <View style={localStyles.modalBox}>
              <TouchableOpacity
                onPress={() => setShowOptimizePopup(false)}
                style={localStyles.closeCornerBtn}
              >
                <Text style={localStyles.closeX}>✕</Text>
              </TouchableOpacity>

              <Text style={localStyles.modalTitle}>Optimize Route</Text>
              <Text style={localStyles.modalSubtitle}>
                From where you want to optimize?
              </Text>

              <View style={localStyles.shareButtonsRow}>
                <TouchableOpacity
                  onPress={() => {
                    setShowOptimizePopup(false);
                    router.push({
                      pathname: "/customerDashboard/savedlist",
                      params: { source: "optimize" },
                    });
                  }}
                  style={[
                    localStyles.modalBtn,
                    { backgroundColor: "#f06543", marginRight: 10 },
                  ]}
                >
                  <Text style={localStyles.modalBtnText}>Saved List</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setShowOptimizePopup(false);
                    router.push({
                      pathname: "/customerDashboard/downloadlists",
                      params: { source: "optimize" },
                    });
                  }}
                  style={[localStyles.modalBtn, { backgroundColor: "#2e4466" }]}
                >
                  <Text style={localStyles.modalBtnText}>Downloaded</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* NAVBAR */}
        <View style={styles.bottomNav}>
          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => {
              // Already here, safe action bypass to avoid relative history stack crash
              setShowPopup(false);
              setShowOptimizePopup(false);
            }}
          >
            <Ionicons name="home" size={22} color="white" />
            <Text style={styles.navText}>Home</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => router.push("/customerDashboard/savedlist")}
          >
            <MaterialCommunityIcons
              name="format-list-bulleted"
              size={22}
              color="white"
            />
            <Text style={styles.navText}>Saved Lists</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => router.push("/customerDashboard/inbox")}
          >
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={22}
              color="white"
            />
            <Text style={styles.navText}>Inbox</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ================= NEW UNIFIED LOCAL CSS =================
const localStyles = StyleSheet.create({
  //   bottomNav: {
  //   minHeight: 65,
  // },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 15,
  },
  modalBox: {
    width: "85%",
    backgroundColor: "#fff",
    borderRadius: 22,
    paddingTop: 20,
    paddingBottom: 25,
    paddingHorizontal: 20,
    alignItems: "center",
    position: "relative",
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
  modalTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111",
    marginTop: 10,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 15,
    color: "#666",
    marginTop: 10,
    marginBottom: 25,
    textAlign: "center",
  },
  shareButtonsRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 5,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  modalBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
    textAlign: "center",
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
  navText: {
    color: "white",
    fontSize: 12,
    marginTop: 1, // was 4
    textAlign: "center",
    fontWeight: "500",
  },
  navText: {
    marginTop: 0,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4, // keep small
  },
});
