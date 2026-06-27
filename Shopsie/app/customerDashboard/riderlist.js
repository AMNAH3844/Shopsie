import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
} from "react-native";

import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import styles from "../styles/dashboardStyle";

const riders = [];

export default function RiderList() {

  const router = useRouter();

  const handleShare = (riderName) => {
    alert("List Shared With " + riderName);
  };

  return (

    <View style={styles.container}>

      {/* HEADER */}
      <LinearGradient
        colors={["#eef4fe", "#2e4466"]}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 0 }}
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: 20,
          height: 85,
        }}
      >

        <TouchableOpacity
          onPress={() => router.back()}
        >
          <Ionicons
            name="chevron-back"
            size={28}
            color="#eef4fe"
          />
        </TouchableOpacity>

        <Text
          style={{
            fontSize: 22,
            fontWeight: "700",
            color: "#2e4466",
            textAlign: "center",
            flex: 1,
          }}
        >
          Rider List
        </Text>

        {/* EMPTY SPACE FOR PERFECT CENTER */}
        <View style={{ width: 28 }} />

      </LinearGradient>

      {/* RIDERS */}
      <FlatList
        data={riders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          padding: 20,
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

    </View>

  );

}