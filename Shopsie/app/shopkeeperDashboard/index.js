import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Ionicons,
  MaterialCommunityIcons,
  FontAwesome5,
} from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";

import styles from "../styles/dashboardStyle";
import { API_URLS } from "../../src/services/apiConfig";
import BottomNavBar from "./BottomNav";

const DEFAULT_IMAGE =
  "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";

export default function ShopkeeperDashboard() {
  const router = useRouter();

  const [username, setUsername] = useState("Shopkeeper Name");
  const [orderCount, setOrderCount] = useState(0);
  const [profileImage, setProfileImage] = useState(DEFAULT_IMAGE);
  const [notificationCount, setNotificationCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      const loadUserData = async () => {
        try {
          const userData = await AsyncStorage.getItem("userData");
          const token = await AsyncStorage.getItem("token");

          if (userData) {
            const parsedData = JSON.parse(userData);

            setUsername(parsedData.username || "Shopkeeper Name");

            const img = parsedData.profileImage;
            setProfileImage(
              img && img.startsWith("http")
                ? img
                : DEFAULT_IMAGE
            );
          } else {
            setUsername("Shopkeeper Name");
            setProfileImage(DEFAULT_IMAGE);
          }

          if (token) {
            // Fetch notifications
            const notificationRes = await fetch(
              API_URLS.SHOP_NOTIFICATIONS,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );

            const notificationData =
              await notificationRes.json();

            if (
              notificationRes.ok &&
              Array.isArray(notificationData)
            ) {
              setNotificationCount(
                notificationData.filter(
                  (item) => !item.isRead
                ).length
              );
            }

            // Fetch orders
            const orderRes = await fetch(
              API_URLS.SHOP_ORDERS,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );

            const orderData = await orderRes.json();

            if (
              orderRes.ok &&
              Array.isArray(orderData)
            ) {
              setOrderCount(
                orderData.filter(
                  (item) => item.status === "PENDING"
                ).length
              );
            }
          }
        } catch (err) {
          console.log("Error loading user data:", err);
          setProfileImage(DEFAULT_IMAGE);
        }
      };

      loadUserData();
    }, [])
  );

 return (
  <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
    <View style={{ flex: 1 }}>
      {/* ================= ORIGINAL HEADER ================= */}
      <LinearGradient
        colors={["#eef4fe", "#2e4466"]}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 0 }}
        style={styles.header}
      >
        <Text style={styles.logo}>SHOPSIE</Text>

        <View style={styles.icons}>
          <TouchableOpacity
            onPress={() =>
              router.push("/notifications")
            }
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
                  right: 6,
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
                params: {
                  role: "shopkeeper",
                },
              })
            }
          >
            <Ionicons
              name="settings"
              size={24}
              color="#2e4466"
            />
          </TouchableOpacity>
        </View>
      </LinearGradient>

     <ScrollView
  showsVerticalScrollIndicator={false}
  contentContainerStyle={{
    paddingBottom: 75,
  }}
>
        {/* ================= PROFILE CARD ================= */}
        <View style={styles.profileCard}>
          <Image
            source={{
              uri:
                profileImage +
                "?t=" +
                Date.now(),
            }}
            style={styles.profileImage}
          />

          <Text style={styles.username}>
            {username}
          </Text>
        </View>    

        {/* ================= GRID BUTTONS ================= */}
        <View style={styles.grid}>
          {/* Enter Stock */}
          <TouchableOpacity
            style={styles.card}
            onPress={() =>
              router.push(
                "/shopkeeperDashboard/enterStock"
              )
            }
          >
            <MaterialCommunityIcons
              name="warehouse"
              size={35}
              color="white"
            />
            <Text style={styles.cardText}>
              Enter Stock
            </Text>
          </TouchableOpacity>

          {/* Update Stock */}
          <TouchableOpacity
            style={styles.card}
            onPress={() =>
              router.push(
                "/shopkeeperDashboard/updateStock"
              )
            }
          >
            <FontAwesome5
              name="edit"
              size={35}
              color="white"
            />
            <Text style={styles.cardText}>
              Update Stock
            </Text>
          </TouchableOpacity>

          {/* View Stock */}
          <TouchableOpacity
            style={styles.card}
            onPress={() =>
              router.push(
                "/shopkeeperDashboard/viewStock"
              )
            }
          >
            <MaterialCommunityIcons
              name="package-variant-closed"
              size={35}
              color="white"
            />
            <Text style={styles.cardText}>
              View Stock
            </Text>
          </TouchableOpacity>

          {/* Shop Details */}
          <TouchableOpacity
            style={styles.card}
            onPress={() =>
              router.push(
                "/shopkeeperDashboard/shopDetails"
              )
            }
          >
            <MaterialCommunityIcons
              name="storefront"
              size={35}
              color="white"
            />
            <Text style={styles.cardText}>
              Shop Details
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ================= REUSABLE BOTTOM NAVIGATION ================= */}
      <BottomNavBar />
      </View>
  </SafeAreaView>
);
}