import React, { useCallback, useEffect, useState } from "react";
import { API_URLS } from '../../src/services/apiConfig';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Platform,
  StatusBar,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context"; 
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

// const API_URL = "http://172.20.140.250:5000/api/rider";

const methodOptions = [
  { label: "Wallet", value: "wallet" },
  { label: "Bank", value: "bank" },
  { label: "Card", value: "card" },
];

export default function RiderAccountDetails() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dailyCashLimit, setDailyCashLimit] = useState("");
  const [paymentMethodType, setPaymentMethodType] = useState("wallet");
  const [paymentProviderName, setPaymentProviderName] = useState("");
  const [paymentAccountNumber, setPaymentAccountNumber] = useState("");
  const [savedSummary, setSavedSummary] = useState(null);
  const [providers, setProviders] = useState([]);
  const [providerSearch, setProviderSearch] = useState("");

  const digitsOnly = (value) => value.replace(/\D/g, "");

  const loadAccount = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(API_URLS.RIDER_ACCOUNT_DETAILS, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not load account details");

      setDailyCashLimit(data.dailyCashLimit == null ? "" : String(Math.trunc(Number(data.dailyCashLimit))));
      setPaymentMethodType(data.paymentMethodType || "wallet");
      setPaymentProviderName(data.paymentProviderName || "");
      setProviderSearch(data.paymentProviderName || "");
      setPaymentAccountNumber(data.paymentAccountNumber || "");
      setSavedSummary({
        dailyCashLimit: data.dailyCashLimit == null ? "" : String(Math.trunc(Number(data.dailyCashLimit))),
        paymentMethodType: data.paymentMethodType || "wallet",
        paymentProviderName: data.paymentProviderName || "",
        paymentAccountNumber: data.paymentAccountNumber || "",
      });
    } catch (error) {
      Alert.alert("Error", error.message || "Could not load account details");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadProviders = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const query = `type=${encodeURIComponent(paymentMethodType)}&search=${encodeURIComponent(providerSearch)}`;
      const res = await fetch(`${API_URLS.RIDER_PROVIDERS}?${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setProviders(Array.isArray(data) ? data : []);
    } catch (error) {
      setProviders([]);
    }
  }, [paymentMethodType, providerSearch]);

  useFocusEffect(
    useCallback(() => {
      loadAccount();
    }, [loadAccount])
  );

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  const saveDetails = async () => {
    if (dailyCashLimit && !/^\d+$/.test(dailyCashLimit)) {
      Alert.alert("Error", "Daily cash limit must contain digits only.");
      return;
    }
    if (!paymentProviderName.trim()) {
      Alert.alert("Error", "Select or type a payment provider.");
      return;
    }
    if (!paymentAccountNumber.trim()) {
      Alert.alert("Error", "Enter your payment number or account number.");
      return;
    }

    try {
      setSaving(true);
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(API_URLS.RIDER_ACCOUNT_DETAILS, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          dailyCashLimit,
          paymentMethodType,
          paymentProviderName,
          paymentAccountNumber,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not save account details");
      setSavedSummary({
        dailyCashLimit: data.dailyCashLimit == null ? "" : String(Math.trunc(Number(data.dailyCashLimit))),
        paymentMethodType: data.paymentMethodType || paymentMethodType,
        paymentProviderName: data.paymentProviderName || paymentProviderName,
        paymentAccountNumber: data.paymentAccountNumber || paymentAccountNumber,
      });
      Alert.alert("Saved", "Account details updated.");
    } catch (error) {
      Alert.alert("Error", error.message || "Could not save account details");
    } finally {
      setSaving(false);
    }
  };

  const accountLabel = paymentMethodType === "wallet" ? "Mobile Wallet Number" : paymentMethodType === "bank" ? "Account Number" : "Card/Account Number";

if (loading) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2e4466" />
      </View>
    </SafeAreaView>
  );
}
  

  return (
  <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
    <View style={styles.mainContainer}>

      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={["#eef4fe", "#2e4466"]}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 0 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace("/riderDashboard"))}>
          <Ionicons name="chevron-back" size={28} color="#eef4fe" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account Details</Text>
        <View style={{ width: 28 }} />
      </LinearGradient>

      <FlatList
        data={providers}
        keyExtractor={(item) => String(item.id)}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <>
            <Text style={styles.sectionHeading}>Daily Cash</Text>
            <View style={styles.card}>
              <Text style={styles.label}>Daily Cash Limit</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="cash-outline" size={20} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  value={dailyCashLimit}
                  onChangeText={(text) => setDailyCashLimit(digitsOnly(text))}
                  placeholder="Example: 40000"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  style={styles.input}
                />
              </View>
            </View>

            <Text style={styles.sectionHeading}>Online Payment</Text>
            <View style={styles.card}>
              <Text style={styles.label}>Payment Method</Text>
              <View style={styles.segmentRow}>
                {methodOptions.map((option) => {
                  const active = paymentMethodType === option.value;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[styles.segmentBtn, active && styles.segmentBtnActive]}
                      onPress={() => {
                        setPaymentMethodType(option.value);
                        setProviderSearch("");
                        setPaymentProviderName("");
                      }}
                    >
                      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{option.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.label}>Search or Type Provider</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="search-outline" size={20} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  value={providerSearch}
                  onChangeText={(text) => {
                    setProviderSearch(text);
                    setPaymentProviderName(text);
                  }}
                  placeholder="Easypaisa, JazzCash, HBL..."
                  placeholderTextColor="#94A3B8"
                  style={styles.input}
                />
              </View>
            </View>
          </>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.providerRow, paymentProviderName === item.name && styles.providerRowActive]}
            onPress={() => {
              setPaymentProviderName(item.name);
              setProviderSearch(item.name);
            }}
          >
            <Ionicons name="business-outline" size={18} color={paymentProviderName === item.name ? "#047857" : "#64748B"} />
            <Text style={[styles.providerText, paymentProviderName === item.name && styles.providerTextActive]}>{item.name}</Text>
          </TouchableOpacity>
        )}
        ListFooterComponent={
          <View style={styles.footerCard}>
            <Text style={styles.label}>{accountLabel}</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="keypad-outline" size={20} color="#64748B" style={styles.inputIcon} />
              <TextInput
                value={paymentAccountNumber}
                onChangeText={(text) => setPaymentAccountNumber(digitsOnly(text))}
                placeholder={paymentMethodType === "wallet" ? "03xxxxxxxxx" : "Enter digits only"}
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                style={styles.input}
              />
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={saveDetails} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save Details</Text>}
            </TouchableOpacity>

            {savedSummary && (
              <View style={styles.summaryCard}>
                <View style={styles.summaryHeader}>
                  <Ionicons name="wallet-outline" size={20} color="#2e4466" />
                  <Text style={styles.summaryTitle}>Saved Account Summary</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Cash Limit</Text>
                  <Text style={styles.summaryValue}>
                    {savedSummary.dailyCashLimit ? `Rs. ${Number(savedSummary.dailyCashLimit).toLocaleString()}` : "Not set"}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Payment Type</Text>
                  <Text style={styles.summaryValue}>{savedSummary.paymentMethodType || "Not set"}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Provider</Text>
                  <Text style={styles.summaryValue}>{savedSummary.paymentProviderName || "Not set"}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Number / Account</Text>
                  <Text style={styles.summaryValue}>{savedSummary.paymentAccountNumber || "Not set"}</Text>
                </View>
              </View>
            )}
          </View>
        }
      />
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
  mainContainer: { flex: 1, backgroundColor: "#F8FAFC" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F8FAFC" },
  header: { height: 85, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 22, fontWeight: "800", color: "#2e4466" },
  content: {
  paddingHorizontal: 20,
  paddingBottom: 90,
},
  sectionHeading: { fontSize: 16, fontWeight: "800", color: "#1E293B", marginTop: 20, marginBottom: 8 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#E2E8F0", elevation: 2 },
  footerCard: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#E2E8F0", elevation: 2, marginTop: 10 },
  label: { fontSize: 12, fontWeight: "800", color: "#475569", marginBottom: 7, textTransform: "uppercase" },
  inputWrapper: { flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: "#CBD5E1", borderRadius: 12, paddingHorizontal: 12, height: 48, backgroundColor: "#FFFFFF", marginBottom: 14 },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, height: "100%", color: "#0F172A", fontSize: 15, ...Platform.select({ web: { outlineStyle: "none" } }) },
  segmentRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  segmentBtn: { flex: 1, height: 42, borderRadius: 12, borderWidth: 1, borderColor: "#CBD5E1", alignItems: "center", justifyContent: "center", backgroundColor: "#F8FAFC" },
  segmentBtnActive: { backgroundColor: "#2e4466", borderColor: "#2e4466" },
  segmentText: { color: "#475569", fontWeight: "800" },
  segmentTextActive: { color: "#FFFFFF" },
  providerRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 12, padding: 12, marginTop: 8, borderWidth: 1, borderColor: "#E2E8F0" },
  providerRowActive: { backgroundColor: "#ECFDF5", borderColor: "#10B981" },
  providerText: { marginLeft: 8, color: "#334155", fontWeight: "700" },
  providerTextActive: { color: "#047857" },
  saveBtn: { height: 50, borderRadius: 14, backgroundColor: "#22C55E", alignItems: "center", justifyContent: "center", marginTop: 8 },
  saveText: { color: "#FFFFFF", fontWeight: "900", fontSize: 15 },
  summaryCard: { marginTop: 16, backgroundColor: "#F8FAFC", borderRadius: 14, borderWidth: 1, borderColor: "#CBD5E1", padding: 14 },
  summaryHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  summaryTitle: { color: "#2e4466", fontSize: 15, fontWeight: "900", marginLeft: 8 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 7, borderTopWidth: 1, borderTopColor: "#E2E8F0" },
  summaryLabel: { color: "#64748B", fontSize: 12, fontWeight: "800", flex: 1 },
  summaryValue: { color: "#0F172A", fontSize: 13, fontWeight: "900", flex: 1, textAlign: "right" },
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
