import React, { useEffect, useState } from "react";
import { API_URLS } from '../../src/services/apiConfig';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Platform,
  StatusBar,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import BottomNav from "./BottomNav.js";

export default function UpdateStock() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [updates, setUpdates] = useState({});
  const [search, setSearch] = useState("");

  // const API_URL = "http://172.20.140.250:5000/api/shopkeeper";

  // ================= FETCH PRODUCTS =================
  const fetchProducts = async () => {
    try {
      const token = await AsyncStorage.getItem("token");

      const res = await fetch(API_URLS.GET_PRODUCTS, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      setProducts(data);
    } catch (error) {
      console.log(error);
      Alert.alert("Error", "Failed to fetch products");
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // ================= UPDATE PRODUCT =================
  const updateProduct = async (id) => {
    const token = await AsyncStorage.getItem("token");
    const body = {};

    if (updates[id]?.price) body.price = updates[id].price;
    if (updates[id]?.quantity) body.quantity = updates[id].quantity;
    if (updates[id]?.specification) body.specification = updates[id].specification;

    if (Object.keys(body).length === 0) {
      Alert.alert("Info", "Enter at least one field to update");
      return;
    }

    try {
      const res = await fetch(`${API_URLS.UPDATE_STOCK}/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const updatedProduct = await res.json();

        setProducts((prev) =>
          prev.map((p) => (p.id === id ? updatedProduct : p))
        );

        setUpdates({ ...updates, [id]: {} });

        Alert.alert("Success", "Product updated successfully");
      } else {
        const data = await res.json();
        Alert.alert("Error", data.message || "Failed to update");
      }
    } catch (error) {
      console.log(error);
      Alert.alert("Error", "Update failed");
    }
  };

  // ================= DELETE PRODUCT =================
  const deleteProduct = async (id) => {
    const confirmDelete =
      Platform.OS === "web"
        ? window.confirm("Are you sure you want to delete this product?")
        : await new Promise((resolve) => {
            Alert.alert(
              "Confirm Delete",
              "Are you sure you want to delete this product?",
              [
                { text: "Cancel", onPress: () => resolve(false) },
                { text: "Delete", style: "destructive", onPress: () => resolve(true) },
              ]
            );
          });

    if (!confirmDelete) return;

    try {
      const token = await AsyncStorage.getItem("token");

      const res = await fetch(`${API_URLS.DELETE_PRODUCT}/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        setProducts((prev) =>
          prev.filter((p) => p.id !== Number(id))
        );

        Alert.alert("Success", "Product deleted successfully");
      } else {
        const data = await res.json();
        Alert.alert("Error", data.message || "Delete failed");
      }
    } catch (error) {
      console.log(error);
      Alert.alert("Error", "Delete failed");
    }
  };

  // ================= SEARCH FILTER =================
  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

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
            Update Stock
          </Text>
        </View>
        <View style={{ width: 28 }} />
      </LinearGradient>

      {/* SEARCH AND FILTER SECTION CONTAINER */}
      <View style={localStyles.searchSectionWrapper}>
        <View style={localStyles.searchBarContainer}>
          <Ionicons name="search-outline" size={20} color="#64748B" style={localStyles.inputIcon} />
          <TextInput
            placeholder="Search product by name..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
            style={localStyles.baseInputOverride}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* PRODUCT LIST ENGINE */}
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={localStyles.scrollContainer}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={<Text style={localStyles.sectionHeading}>Inventory Items</Text>}
        renderItem={({ item }) => (
          <View style={localStyles.card}>
            <Text style={localStyles.productTitle}>{item.name}</Text>

            {/* Price Row Input field */}
            <Text style={localStyles.fieldLabel}>Price</Text>
            <View style={localStyles.inputWrapper}>
              <Ionicons name="pricetag-outline" size={18} color="#64748B" style={localStyles.inputIcon} />
              <TextInput
                placeholder={`Current: ${item.price}`}
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                style={localStyles.baseInputOverride}
                onChangeText={(t) =>
                  setUpdates({
                    ...updates,
                    [item.id]: { ...updates[item.id], price: t },
                  })
                }
                value={updates[item.id]?.price || ""}
              />
            </View>

            {/* Quantity Row Input field */}
            <Text style={localStyles.fieldLabel}>Quantity</Text>
            <View style={localStyles.inputWrapper}>
              <MaterialCommunityIcons name="numeric" size={18} color="#64748B" style={localStyles.inputIcon} />
              <TextInput
                placeholder={`Current: ${item.quantity}`}
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                style={localStyles.baseInputOverride}
                onChangeText={(t) =>
                  setUpdates({
                    ...updates,
                    [item.id]: { ...updates[item.id], quantity: t },
                  })
                }
                value={updates[item.id]?.quantity || ""}
              />
            </View>

            {/* Specification Row Input field */}
            <Text style={localStyles.fieldLabel}>Specification</Text>
            <View style={[localStyles.inputWrapper, localStyles.textAreaWrapper]}>
              <TextInput
                placeholder={`Current: ${item.specification || "-"}`}
                placeholderTextColor="#94A3B8"
                style={[localStyles.baseInputOverride, localStyles.textAreaInput]}
                multiline={true}
                numberOfLines={3}
                onChangeText={(t) =>
                  setUpdates({
                    ...updates,
                    [item.id]: { ...updates[item.id], specification: t },
                  })
                }
                value={updates[item.id]?.specification || ""}
              />
            </View>

            {/* ACTION ROW UTILITY BUTTONS */}
            <View style={localStyles.actionRow}>
              <TouchableOpacity
                style={[localStyles.actionButtonHalf, localStyles.saveButtonColor]}
                onPress={() => updateProduct(item.id)}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark-circle-outline" size={18} color="white" style={{ marginRight: 4 }} />
                <Text style={localStyles.actionButtonText}>Update</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[localStyles.actionButtonHalf, localStyles.cancelButtonColor]}
                onPress={() => deleteProduct(item.id)}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={18} color="white" style={{ marginRight: 4 }} />
                <Text style={localStyles.actionButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* EXACT FOOTER NAVIGATION */}
      <BottomNav />
    </View>
  );
}

const localStyles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#F8FAFC' },
  searchSectionWrapper: { paddingHorizontal: 20, marginTop: 16 },
  scrollContainer: { paddingHorizontal: 20, paddingBottom: 100 },
  
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
  
  searchBarContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#CBD5E1', borderRadius: 14, paddingHorizontal: 14, backgroundColor: '#FFFFFF', height: 50 },
  inputIcon: { marginRight: 8 },
  baseInputOverride: { flex: 1, borderWidth: 0, height: '100%', paddingLeft: 0, margin: 0, backgroundColor: 'transparent', fontSize: 14, color: '#0F172A', ...Platform.select({ web: { outlineStyle: 'none' } }) },
  
  sectionHeading: { fontSize: 16, fontWeight: '700', color: '#1E293B', marginTop: 14, marginBottom: 6 },
  
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginTop: 6, marginBottom: 12, shadowColor: '#475569', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 4 },
  productTitle: { fontSize: 17, fontWeight: '700', color: '#0F172A', marginBottom: 12 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: '#475569', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 },
  
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 10, marginBottom: 12, paddingHorizontal: 12, backgroundColor: '#FAFAFA', height: 44 },
  inputIcon: { marginRight: 6 },
  baseInputOverride: { flex: 1, borderWidth: 0, height: '100%', paddingLeft: 0, margin: 0, backgroundColor: 'transparent', fontSize: 14, color: '#0F172A', ...Platform.select({ web: { outlineStyle: 'none' } }) },
  
  textAreaWrapper: { alignItems: 'flex-start', paddingVertical: 8, height: 68 },
  textAreaInput: { textAlignVertical: 'top' },

  actionRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 14, gap: 10 },
  actionButtonHalf: { flex: 1, borderRadius: 10, height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', elevation: 2 },
  cancelButtonColor: { backgroundColor: '#EF4444' },
  saveButtonColor: { backgroundColor: '#22C55E' },
  actionButtonText: { color: 'white', fontWeight: '700', fontSize: 14 },
});