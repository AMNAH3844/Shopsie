import React, { useState } from "react";
import { API_URLS } from '../../src/services/apiConfig';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ScrollView,
  Platform,
  StatusBar,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import BottomNav from "./BottomNav.js"; 

export default function EnterStock() {
  const router = useRouter();

  // Form Fields State
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [threshold, setThreshold] = useState(""); 
  const [specification, setSpecification] = useState("");

  // const API_URL = "http://172.20.140.250:5000/api/shopkeeper";

  const handleAdd = async () => {
    if (!name || !price || !quantity || !threshold || !specification) {
      Alert.alert("Error", "Please complete all fields.");
      return;
    }

    try {
      const token = await AsyncStorage.getItem("token");

      const res = await fetch(API_URLS.SHOP_ADD_PRODUCT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          price: Number(price),
          quantity: Number(quantity),
          threshold: Number(threshold), 
          specification, 
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        Alert.alert("Error", data.message || "Failed to add product");
        return;
      }

      Alert.alert("Success", "Product Added");
      setName("");
      setPrice("");
      setQuantity("");
      setThreshold(""); 
      setSpecification("");
    } catch (error) {
      Alert.alert("Error", "Server error");
    }
  };

  return (
    <View style={localStyles.mainContainer}>
      <StatusBar barStyle="light-content" />
      
      {/* EXACT HEADER IMPLEMENTATION */}
      <LinearGradient 
        colors={["#eef4fe", "#2e4466"]} 
        start={{ x: 1, y: 0 }} 
        end={{ x: 0, y: 0 }} 
        style={localStyles.gradientHeader}
      >
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace("/shopkeeperDashboard")}>
          <Ionicons name="chevron-back" size={28} color="#eef4fe" />
        </TouchableOpacity>
        <View style={localStyles.headerCenterContainer}>
          <Text style={localStyles.headerTitleText}>
            Enter Stock
          </Text>
        </View>
        <View style={{ width: 28 }} />
      </LinearGradient>

      {/* SCROLLABLE FORM BODY */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={localStyles.scrollContainer}>
        <View style={localStyles.contentBody}>
          
          <Text style={localStyles.sectionHeading}>Product Details</Text>
          <View style={localStyles.card}>
            
            {/* Product Name Input */}
            <Text style={localStyles.fieldLabel}>Product Name</Text>
            <View style={localStyles.inputWrapper}>
              <Ionicons name="cube-outline" size={20} color="#64748B" style={localStyles.inputIcon} />
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
              <Ionicons name="pricetag-outline" size={20} color="#64748B" style={localStyles.inputIcon} />
              <TextInput
                placeholder="Price"
                keyboardType="numeric"
                placeholderTextColor="#94A3B8"
                value={price}
                onChangeText={setPrice}
                style={localStyles.baseInputOverride}
              />
            </View>

            {/* Quantity Input */}
            <Text style={localStyles.fieldLabel}>Quantity</Text>
            <View style={localStyles.inputWrapper}>
              <MaterialCommunityIcons name="numeric" size={20} color="#64748B" style={localStyles.inputIcon} />
              <TextInput
                placeholder="Quantity"
                keyboardType="numeric"
                placeholderTextColor="#94A3B8"
                value={quantity}
                onChangeText={setQuantity}
                style={localStyles.baseInputOverride}
              />
            </View>

            {/* Threshold Input Field */}
            <Text style={localStyles.fieldLabel}>Alert Threshold Limit</Text>
            <View style={localStyles.inputWrapper}>
              <Ionicons name="speedometer-outline" size={20} color="#64748B" style={localStyles.inputIcon} />
              <TextInput
                placeholder="Alert Line Quantity Threshold"
                keyboardType="numeric"
                placeholderTextColor="#94A3B8"
                value={threshold}
                onChangeText={setThreshold}
                style={localStyles.baseInputOverride}
              />
            </View>

            {/* Specification Input */}
            <Text style={localStyles.fieldLabel}>Specification</Text>
            <View style={[localStyles.inputWrapper, localStyles.textAreaWrapper]}>
              <TextInput
                placeholder="Enter item specifications..."
                placeholderTextColor="#94A3B8"
                value={specification}
                onChangeText={setSpecification}
                multiline={true}
                numberOfLines={4}
                style={[localStyles.baseInputOverride, localStyles.textAreaInput]}
              />
            </View>

          </View>

          {/* Action Save Button */}
          <TouchableOpacity style={localStyles.fullEditButton} onPress={handleAdd} activeOpacity={0.8}>
            <Ionicons name="add-circle-outline" size={20} color="white" style={{ marginRight: 8 }} />
            <Text style={localStyles.fullEditButtonText}>Add Product</Text>
          </TouchableOpacity>

        </View>
      </ScrollView>

      {/* EXACT FOOTER NAVIGATION */}
      <BottomNav />
    </View>
  );
}

const localStyles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContainer: { padding: 0, paddingBottom: 100 }, 
  contentBody: { paddingHorizontal: 20 },
  
  gradientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 26,
    width: '100%',
    elevation: 3
  },
  headerCenterContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerTitleText: { fontSize: 20, fontWeight: '700', color: '#2e4466', textAlign: 'center', letterSpacing: -0.3 },
  
  sectionHeading: { fontSize: 16, fontWeight: '700', color: '#1E293B', marginTop: 22, marginBottom: 6 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginTop: 5, marginBottom: 5, shadowColor: '#475569', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 4 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#CBD5E1', borderRadius: 12, marginBottom: 16, paddingHorizontal: 12, backgroundColor: '#FFFFFF' },
  inputIcon: { marginRight: 8 },
  baseInputOverride: { flex: 1, borderWidth: 0, height: 48, paddingLeft: 0, margin: 0, marginBottom: 0, backgroundColor: 'transparent', fontSize: 15, color: '#0F172A', ...Platform.select({ web: { outlineStyle: 'none' } }) },
  
  textAreaWrapper: { alignItems: 'flex-start', paddingVertical: 10 },
  textAreaInput: { height: 80, textAlignVertical: 'top' },

  fullEditButton: { width: '100%', flexDirection: 'row', backgroundColor: '#22C55E', borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center', marginTop: 25, shadowColor: '#22C55E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
  fullEditButtonText: { color: 'white', fontWeight: '700', fontSize: 15 },
});