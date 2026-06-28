import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  StatusBar,
  StyleSheet
} from "react-native";

import { useRouter } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import styles from "../styles/dashboardStyle";

const riders = [];

export default function RiderList() {
  const router = useRouter();

  const handleShare = (riderName) => {
    alert("List Shared With " + riderName);
  };

  return (
    <View style={[styles.container, { flex: 1, backgroundColor: "#ffffff" }]}>
      <StatusBar barStyle="light-content" />

      {/* ================= EXACT UNIFIED HEADER ================= */}
      <LinearGradient
        colors={["#eef4fe", "#2e4466"]}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 0 }}
        style={localStyles.header}
      >
        <TouchableOpacity
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/customerDashboard")
          }
        >
          <Ionicons name="chevron-back" size={28} color="#eef4fe" />
        </TouchableOpacity>
        
        <Text style={localStyles.headerTitleText}>Rider List</Text>
        
        {/* Placeholder structural view matching the source balance layer logic */}
        <View style={{ width: 28 }} />
      </LinearGradient>

      {/* RIDERS LIST */}
      <FlatList
        data={riders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          padding: 20,
          paddingBottom: 100, // Offset prevents content from getting trapped behind absolute footer
        }}
        renderItem={({ item }) => (
          <View
            style={{
              backgroundColor: "white",
              borderRadius: 15,
              padding: 15,
              marginBottom: 15,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              elevation: 3,
              shadowColor: "#000",
              shadowOpacity: 0.1,
              shadowRadius: 4,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Image
                source={{ uri: item.image }}
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 30,
                }}
              />

              <Text
                style={{
                  marginLeft: 15,
                  fontSize: 18,
                  fontWeight: "600",
                }}
              >
                {item.name}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => handleShare(item.name)}
              style={{
                backgroundColor: "#2e4466",
                paddingHorizontal: 18,
                paddingVertical: 10,
                borderRadius: 10,
              }}
            >
              <Text
                style={{
                  color: "white",
                  fontWeight: "600",
                }}
              >
                Share
              </Text>
            </TouchableOpacity>
          </View>
        )}
      />

      {/* ================= EXACT UNIFIED BOTTOM NAVIGATION ================= */}
      <View style={localStyles.bottomNav}>
        <TouchableOpacity style={localStyles.tabItem} onPress={() => router.push("/customerDashboard")}>
          <Ionicons name="home" size={22} color="white" />
          <Text style={localStyles.navText}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={localStyles.tabItem} onPress={() => router.push("/customerDashboard/savedlist")}>
          <MaterialCommunityIcons name="format-list-bulleted" size={22} color="white" />
          <Text style={localStyles.navText}>Saved Lists</Text>
        </TouchableOpacity>
        <TouchableOpacity style={localStyles.tabItem} onPress={() => router.push("/customerDashboard/inbox")}>
          <Ionicons name="chatbubble-ellipses-outline" size={22} color="white" />
          <Text style={localStyles.navText}>Inbox</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Dedicated scoped style module mirroring friend structural parameters explicitly
const localStyles = StyleSheet.create({
  header: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    paddingHorizontal: 20, 
    height: 85 
  },
  headerTitleText: { 
    fontSize: 22, 
    fontWeight: "700", 
    color: "#2e4466", 
    textAlign: 'center', 
    flex: 1 
  },
  bottomNav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "#2e4466",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 10,
  },
  tabItem: {
    justifyContent: "center",
    alignItems: "center",
  },
  navText: {
    color: "white",
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
    fontWeight: "500",
  }
});