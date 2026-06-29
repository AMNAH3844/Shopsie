import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import styles from "../styles/dashboardStyle";
import { API_URLS } from "../../src/services/apiConfig";

const DEFAULT_IMAGE = "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";

export default function DashboardRider() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [username, setUsername] = useState("Rider Name");
  const [profileImage, setProfileImage] = useState(DEFAULT_IMAGE);
  const [showOptimizeModal, setShowOptimizeModal] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
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
          console.log(
            "Error loading rider dashboard:",
            err
          );
          setProfileImage(DEFAULT_IMAGE);
        }
      };

      loadUserData();
    }, [])
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      {/* HEADER (fixed) */}
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
                  {notificationCount > 9
                    ? "9+"
                    : notificationCount}
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
      {/* FIXED CONTENT MAIN BODY */}
<View
  style={{
    flex: 1,
    justifyContent: "flex-start",
    paddingBottom: 90,
  }}
>
        {/* PROFILE CARD - Increased marginTop for extra space from header */}
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
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(15,23,42,0.58)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <View
            style={{
              width: "85%",
              backgroundColor: "#fff",
              borderRadius: 20,
              borderWidth: 1,
              borderColor: "#e2e8f0",
              padding: 20,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "800",
                color: "#2e4466",
                textAlign: "center",
                marginBottom: 20,
              }}
            >
              Optimize Route From
            </Text>

            <TouchableOpacity
              style={{
                backgroundColor: "#2e4466",
                padding: 14,
                borderRadius: 12,
                marginBottom: 10,
              }}
              onPress={() => {
                setShowOptimizeModal(false);
                router.push("/riderDashboard/active-deliveries");
              }}
            >
              <Text
                style={{
                  color: "#fff",
                  textAlign: "center",
                  fontWeight: "800",
                }}
              >
                Customer's Chat
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: "#eef4fe",
                padding: 14,
                borderRadius: 12,
                marginBottom: 10,
              }}
              onPress={() => {
                setShowOptimizeModal(false);
                router.push("/riderDashboard/downladedlistsrider");
              }}
            >
              <Text
                style={{
                  color: "#2e4466",
                  textAlign: "center",
                  fontWeight: "800",
                }}
              >
                Downloaded Lists
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: "#64748b",
                padding: 14,
                borderRadius: 12,
              }}
              onPress={() => setShowOptimizeModal(false)}
            >
              <Text
                style={{
                  color: "#fff",
                  textAlign: "center",
                  fontWeight: "800",
                }}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* EQUALLY DISTRIBUTED BOTTOM NAV BAR */}
     <View
     style={[
       styles.bottomNav,
       {
         paddingBottom: 15,
       },
     ]}
   >
        <TouchableOpacity
  style={[styles.tabItem, { flex: 1, alignItems: "center" }]}
  onPress={() => {
    // already on home, do nothing
    setShowOptimizeModal(false);
  }}
>
  <Ionicons name="home" size={22} color="white" />
  <Text style={styles.navText}>Home</Text>
</TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, { flex: 1, alignItems: "center" }]}
          onPress={() => router.push("/riderDashboard/history")}
        >
          <Ionicons name="time-outline" size={22} color="white" />
          <Text style={styles.navText}>History</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, { flex: 1, alignItems: "center" }]}
          onPress={() => router.push("/riderDashboard/downladedlistsrider")}
        >
          <Ionicons name="download-outline" size={22} color="white" />
          <Text style={styles.navText}>Downloads</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}