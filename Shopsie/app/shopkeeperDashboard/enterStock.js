import React, { useState, useEffect, useRef } from "react";
import { API_URLS } from "../../src/services/apiConfig";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  StatusBar,
  KeyboardAvoidingView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import BottomNavBar from "./BottomNav";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

export default function EnterStock() {
  const router = useRouter();

  // Form Fields State
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [threshold, setThreshold] = useState("");
  const [specification, setSpecification] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ─── TRANSIENT WARNING NOTIFICATION STATE ───────────────────
  const [warningMessage, setWarningMessage] = useState("");
  const warningTimerRef = useRef(null);

  const triggerWarningNotification = (msg) => {
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    setWarningMessage(msg);
    warningTimerRef.current = setTimeout(() => {
      setWarningMessage("");
    }, 4500);
  };

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    };
  }, []);

  // Helper sanitizers to reject negative values instantly during typing
  const handlePriceChange = (text) => {
    // Allows only positive numbers and a single decimal point
    const sanitized = text.replace(/[^0-9.]/g, "");
    setPrice(sanitized);
  };

  const handleIntegerChange = (text, setterFn) => {
    // Allows only absolute positive whole numbers (integers)
    const sanitized = text.replace(/[^0-9]/g, "");
    setterFn(sanitized);
  };

  const handleAdd = async () => {
    // 1. Basic empty field validation
    if (
      !name.trim() ||
      !price ||
      !quantity ||
      !threshold ||
      !specification.trim()
    ) {
      triggerWarningNotification("Warning: Please complete all fields.");
      return;
    }

    const numericPrice = Number(price);
    const numericQuantity = Number(quantity);
    const numericThreshold = Number(threshold);

    // 2. Strict numerical validation boundary checks
    if (isNaN(numericPrice) || numericPrice <= 0.9) {
      triggerWarningNotification(
        "Warning: Price must be a valid number greater than 0.",
      );
      return;
    }

    if (isNaN(numericQuantity) || numericQuantity <= 0) {
      triggerWarningNotification("Warning: Stock quantity cannot be negative.");
      return;
    }

    if (isNaN(numericThreshold) || numericThreshold <= 0) {
      triggerWarningNotification(
        "Warning: Alert threshold limit cannot be negative.",
      );
      return;
    }

    try {
      setIsSubmitting(true);
      const token = await AsyncStorage.getItem("token");

      const res = await fetch(API_URLS.SHOP_ADD_PRODUCT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          price: numericPrice,
          quantity: numericQuantity,
          threshold: numericThreshold,
          specification: specification.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        triggerWarningNotification(
          data.message || "Warning: Failed to add product",
        );
        return;
      }

      triggerWarningNotification("Success: Product Added to Stock Records!");
      setName("");
      setPrice("");
      setQuantity("");
      setThreshold("");
      setSpecification("");
    } catch (error) {
      triggerWarningNotification("Warning: Internal application server error.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={localStyles.mainContainer}>
        {/* EXACT HEADER IMPLEMENTATION */}
        <LinearGradient
          colors={["#eef4fe", "#2e4466"]}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 0 }}
          style={localStyles.gradientHeader}
        >
          <TouchableOpacity
            onPress={() =>
              router.canGoBack()
                ? router.back()
                : router.replace("/shopkeeperDashboard")
            }
          >
            <Ionicons name="chevron-back" size={28} color="#eef4fe" />
          </TouchableOpacity>
          <View style={localStyles.headerCenterContainer}>
            <Text style={localStyles.headerTitleText}>Enter Stock</Text>
          </View>
          <View style={{ width: 28 }} />
        </LinearGradient>

        {/* KEYBOARD AVOIDING RUNTIME WRAPPER */}
        <KeyboardAvoidingView
          style={localStyles.flexContainer}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
        >
          {/* SCROLLABLE FORM BODY */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={localStyles.scrollContainer}
            keyboardShouldPersistTaps="handled"
          >
            <View style={localStyles.contentBody}>
              <Text style={localStyles.sectionHeading}>Product Details</Text>
              <View style={localStyles.card}>
                {/* Product Name Input */}
                <Text style={localStyles.fieldLabel}>Product Name</Text>
                <View style={localStyles.inputWrapper}>
                  <Ionicons
                    name="cube-outline"
                    size={20}
                    color="#64748B"
                    style={localStyles.inputIcon}
                  />
                  <TextInput
                    placeholder="Product Name"
                    placeholderTextColor="#94A3B8"
                    value={name}
                    onChangeText={setName}
                    style={localStyles.baseInputOverride}
                  />
                </View>

                {/* Price Input */}
                <Text style={localStyles.fieldLabel}>Price</Text>
                <View style={localStyles.inputWrapper}>
                  <Ionicons
                    name="pricetag-outline"
                    size={20}
                    color="#64748B"
                    style={localStyles.inputIcon}
                  />
                  <TextInput
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    placeholderTextColor="#94A3B8"
                    value={price}
                    onChangeText={handlePriceChange}
                    style={localStyles.baseInputOverride}
                  />
                </View>

                {/* Quantity Input */}
                <Text style={localStyles.fieldLabel}>Quantity</Text>
                <View style={localStyles.inputWrapper}>
                  <MaterialCommunityIcons
                    name="numeric"
                    size={20}
                    color="#64748B"
                    style={localStyles.inputIcon}
                  />
                  <TextInput
                    placeholder="0"
                    keyboardType="number-pad"
                    placeholderTextColor="#94A3B8"
                    value={quantity}
                    onChangeText={(txt) =>
                      handleIntegerChange(txt, setQuantity)
                    }
                    style={localStyles.baseInputOverride}
                  />
                </View>

                {/* Threshold Input Field */}
                <Text style={localStyles.fieldLabel}>
                  Alert Threshold Limit
                </Text>
                <View style={localStyles.inputWrapper}>
                  <Ionicons
                    name="speedometer-outline"
                    size={20}
                    color="#64748B"
                    style={localStyles.inputIcon}
                  />
                  <TextInput
                    placeholder="0"
                    keyboardType="number-pad"
                    placeholderTextColor="#94A3B8"
                    value={threshold}
                    onChangeText={(txt) =>
                      handleIntegerChange(txt, setThreshold)
                    }
                    style={localStyles.baseInputOverride}
                  />
                </View>

                {/* Specification Input */}
                <Text style={localStyles.fieldLabel}>Specification</Text>
                <View
                  style={[
                    localStyles.inputWrapper,
                    localStyles.textAreaWrapper,
                  ]}
                >
                  <TextInput
                    placeholder="Enter item specifications..."
                    placeholderTextColor="#94A3B8"
                    value={specification}
                    onChangeText={setSpecification}
                    multiline={true}
                    numberOfLines={4}
                    style={[
                      localStyles.baseInputOverride,
                      localStyles.textAreaInput,
                    ]}
                  />
                </View>
              </View>

              {/* Action Save Button */}
              <TouchableOpacity
                style={localStyles.fullEditButton}
                onPress={handleAdd}
                activeOpacity={0.8}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Ionicons
                      name="add-circle-outline"
                      size={20}
                      color="white"
                      style={{ marginRight: 8 }}
                    />
                    <Text style={localStyles.fullEditButtonText}>
                      Add Product
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* DYNAMIC ORANGE/SUCCESS TRANSIENT BANNER LAYER */}
        {warningMessage ? (
          <View style={localStyles.warningBox}>
            <Ionicons
              name={
                warningMessage.startsWith("Success")
                  ? "checkmark-circle-outline"
                  : "warning-outline"
              }
              size={22}
              color="#fff"
            />
            <Text style={localStyles.warningText}>{warningMessage}</Text>
          </View>
        ) : null}

        {/* FIXED BOTTOM NAVIGATION BAR */}
        <BottomNavBar />
      </View>
    </SafeAreaView>
  );
}

const localStyles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: "#F8FAFC" },
  flexContainer: { flex: 1 },
  scrollContainer: {
    paddingVertical: 12,
    paddingBottom: 90, // Bumper margin spacing to scroll cleanly past absolute BottomNav
  },
  contentBody: { paddingHorizontal: 20 },

  gradientHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 26,
    width: "100%",
    elevation: 3,
  },
  headerCenterContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2e4466",
    textAlign: "center",
  },

  sectionHeading: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginTop: 22,
    marginBottom: 6,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginTop: 5,
    marginBottom: 5,
    shadowColor: "#475569",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 12,
    backgroundColor: "#FFFFFF",
  },
  inputIcon: { marginRight: 8 },
  baseInputOverride: {
    flex: 1,
    height: 48,
    fontSize: 15,
    color: "#0F172A",
    ...Platform.select({ web: { outlineStyle: "none" } }),
  },

  textAreaWrapper: { alignItems: "flex-start", paddingVertical: 10 },
  textAreaInput: { height: 80, textAlignVertical: "top" },

  fullEditButton: {
    width: "100%",
    flexDirection: "row",
    backgroundColor: "#22C55E",
    borderRadius: 14,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 15,
  },
  fullEditButtonText: { color: "white", fontWeight: "700", fontSize: 15 },

  warningBox: {
    position: "absolute",
    bottom: 85, // Slightly lifted over bottom navigation boundaries
    left: 20,
    right: 20,
    backgroundColor: "#e67e22",
    padding: 14,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 9999,
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  warningText: {
    color: "#fff",
    marginLeft: 10,
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
});
