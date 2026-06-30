import React, { useEffect, useState, useRef } from "react";
import { API_URLS } from '../../src/services/apiConfig';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import BottomNav from "./BottomNav";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

export default function UpdateStock() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [updates, setUpdates] = useState({});
  const [search, setSearch] = useState("");
  const [isFetching, setIsFetching] = useState(false);

  // ─── MODAL STATES ──────────────────────────────────────────
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState({ id: null, name: "" });

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

  useEffect(() => {
    return () => {
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    };
  }, []);

  // ================= FETCH PRODUCTS =================
  const fetchProducts = async () => {
    try {
      setIsFetching(true);
      const token = await AsyncStorage.getItem("token");

      const res = await fetch(API_URLS.GET_PRODUCTS, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.log(error);
      triggerWarningNotification("Warning: Failed to fetch products");
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // ================= SANITIZED INPUT FILTERS =================
  const handlePriceInputChange = (text, itemId) => {
    const sanitized = text.replace(/[^0-9.]/g, "");
    setUpdates({
      ...updates,
      [itemId]: { ...updates[itemId], price: sanitized },
    });
  };

  const handleQuantityInputChange = (text, itemId) => {
    const sanitized = text.replace(/[^0-9]/g, "");
    setUpdates({
      ...updates,
      [itemId]: { ...updates[itemId], quantity: sanitized },
    });
  };

  // ================= UPDATE PRODUCT =================
  const updateProduct = async (id) => {
    const token = await AsyncStorage.getItem("token");
    const body = {};

    const rawPrice = updates[id]?.price;
    const rawQuantity = updates[id]?.quantity;
    const rawSpec = updates[id]?.specification;

    // VALIDATION: Price must be >= 1
    if (rawPrice !== undefined && rawPrice !== "") {
      const numericPrice = Number(rawPrice);
      if (isNaN(numericPrice) || numericPrice < 1) {
        triggerWarningNotification("Warning: Price must be 1 or greater.");
        return;
      }
      body.price = numericPrice;
    }

    // VALIDATION: Quantity must be >= 1
    if (rawQuantity !== undefined && rawQuantity !== "") {
      const numericQuantity = Number(rawQuantity);
      if (isNaN(numericQuantity) || numericQuantity < 1) {
        triggerWarningNotification("Warning: Quantity must be 1 or greater.");
        return;
      }
      body.quantity = numericQuantity;
    }

    if (rawSpec !== undefined && rawSpec.trim() !== "") {
      body.specification = rawSpec.trim();
    }

    if (Object.keys(body).length === 0) {
      triggerWarningNotification("Warning: Enter at least one field to update");
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
        triggerWarningNotification("Success: Product updated successfully");
        Keyboard.dismiss();
      } else {
        const data = await res.json();
        triggerWarningNotification(data.message || "Warning: Failed to update");
      }
    } catch (error) {
      console.log(error);
      triggerWarningNotification("Warning: Update operation failed.");
    }
  };

  // ================= DELETE INTERACTION TRIGGER =================
  const openDeleteConfirmation = (id, name) => {
    setSelectedProduct({ id, name });
    setDeleteModalVisible(true);
  };

  const executeDeleteProduct = async () => {
    const targetId = selectedProduct.id;
    setDeleteModalVisible(false);

    try {
      const token = await AsyncStorage.getItem("token");

      const res = await fetch(`${API_URLS.DELETE_PRODUCT}/${targetId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        setProducts((prev) => prev.filter((p) => p.id !== Number(targetId)));
        triggerWarningNotification("Success: Product deleted successfully");
      } else {
        const data = await res.json();
        triggerWarningNotification(data.message || "Warning: Delete failed");
      }
    } catch (error) {
      console.log(error);
      triggerWarningNotification("Warning: Delete operation failed.");
    }
  };

  // ================= SEARCH FILTER =================
  const filteredProducts = products.filter((p) =>
    p.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={localStyles.mainContainer}>

        {/* FIXED STRUCTURE: Keyboard avoiding handles inner inputs */}
        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={{ flex: 1 }}>
              
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

              {/* SEARCH BAR CONTAINER */}
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
              {isFetching ? (
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                  <ActivityIndicator size="large" color="#2e4466" />
                </View>
              ) : (
                <FlatList
                  data={filteredProducts}
                  keyExtractor={(item) => item.id.toString()}
                  contentContainerStyle={localStyles.scrollContainer}
                  showsVerticalScrollIndicator={false}
                  ListHeaderComponent={<Text style={localStyles.sectionHeading}>Inventory Items</Text>}
                  renderItem={({ item }) => (
                    <View style={localStyles.card}>
                      <Text style={localStyles.productTitle}>{item.name}</Text>

                      {/* Price Row */}
                      <Text style={localStyles.fieldLabel}>Price</Text>
                      <View style={localStyles.inputWrapper}>
                        <Ionicons name="pricetag-outline" size={18} color="#64748B" style={localStyles.inputIcon} />
                        <TextInput
                          placeholder={`Current: Rs ${item.price}`}
                          placeholderTextColor="#94A3B8"
                          keyboardType="decimal-pad"
                          style={localStyles.baseInputOverride}
                          onChangeText={(t) => handlePriceInputChange(t, item.id)}
                          value={updates[item.id]?.price || ""}
                        />
                      </View>

                      {/* Quantity Row */}
                      <Text style={localStyles.fieldLabel}>Quantity</Text>
                      <View style={localStyles.inputWrapper}>
                        <MaterialCommunityIcons name="numeric" size={18} color="#64748B" style={localStyles.inputIcon} />
                        <TextInput
                          placeholder={`Current: ${item.quantity}`}
                          placeholderTextColor="#94A3B8"
                          keyboardType="number-pad"
                          style={localStyles.baseInputOverride}
                          onChangeText={(t) => handleQuantityInputChange(t, item.id)}
                          value={updates[item.id]?.quantity || ""}
                        />
                      </View>

                      {/* Specification Row */}
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
                          onPress={() => openDeleteConfirmation(item.id, item.name)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="trash-outline" size={18} color="white" style={{ marginRight: 4 }} />
                          <Text style={localStyles.actionButtonText}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                />
              )}
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>

        {/* UNIFIED DESIGN DELETE MODAL OVERLAY */}
        <Modal
          animationType="fade"
          transparent
          visible={deleteModalVisible}
          onRequestClose={() => setDeleteModalVisible(false)}
        >
          <View style={localStyles.modalOverlay}>
            <View style={localStyles.modalBox}>
              <TouchableOpacity onPress={() => setDeleteModalVisible(false)} style={localStyles.closeCornerBtn}>
                <Text style={localStyles.closeX}>✕</Text>
              </TouchableOpacity>

              <Text style={[localStyles.modalTitle, { color: '#EF4444' }]}>Delete Product</Text>
              <Text style={localStyles.modalSubtitle}>
                Are you sure you want to permanently remove "{selectedProduct.name}" from stock records?
              </Text>
              
              <View style={localStyles.modalButtonsRow}>
                <TouchableOpacity 
                  style={[localStyles.modalBtn, { backgroundColor: '#E2E8F0' }]} 
                  onPress={() => setDeleteModalVisible(false)}
                >
                  <Text style={[localStyles.modalBtnText, { color: '#334155' }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[localStyles.modalBtn, { backgroundColor: '#EF4444' }]} 
                  onPress={executeDeleteProduct}
                >
                  <Text style={[localStyles.modalBtnText, { color: '#fff' }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* TRANSIENT BANNER LAYER */}
        {warningMessage ? (
          <View style={localStyles.warningBox}>
            <Ionicons 
              name={warningMessage.startsWith("Success") ? "checkmark-circle-outline" : "warning-outline"} 
              size={22} 
              color="#fff" 
            />
            <Text style={localStyles.warningText}>{warningMessage}</Text>
          </View>
        ) : null}

        {/* FIXED BOTTOM NAVIGATION BAR */}
        <BottomNav />
      </View>
    </SafeAreaView>
  );
}

const localStyles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#F8FAFC' },
  searchSectionWrapper: { paddingHorizontal: 20, marginTop: 16 },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingBottom: 95,
  },
  gradientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justify: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 26,
    width: '100%',
    elevation: 3
  },
  headerCenterContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerTitleText: { fontSize: 20, fontWeight: '700', color: '#2e4466', textAlign: 'center' },
  
  searchBarContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#CBD5E1', borderRadius: 14, paddingHorizontal: 14, backgroundColor: '#FFFFFF', height: 50 },
  inputIcon: { marginRight: 8 },
  baseInputOverride: { flex: 1, height: '100%', fontSize: 14, color: '#0F172A', ...Platform.select({ web: { outlineStyle: 'none' } }) },
  
  sectionHeading: { fontSize: 16, fontWeight: '700', color: '#1E293B', marginTop: 14, marginBottom: 6 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginTop: 6, marginBottom: 12, shadowColor: '#475569', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 4 },
  productTitle: { fontSize: 17, fontWeight: '700', color: '#0F172A', marginBottom: 12 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: '#475569', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 },
  
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 10, marginBottom: 12, paddingHorizontal: 12, backgroundColor: '#FAFAFA', height: 44 },
  textAreaWrapper: { alignItems: 'flex-start', paddingVertical: 8, height: 68 },
  textAreaInput: { textAlignVertical: 'top' },

  actionRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 14, gap: 10 },
  actionButtonHalf: { flex: 1, borderRadius: 10, height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', elevation: 2 },
  cancelButtonColor: { backgroundColor: '#EF4444' },
  saveButtonColor: { backgroundColor: '#22C55E' },
  actionButtonText: { color: 'white', fontWeight: '700', fontSize: 14 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalBox: { width: "85%", backgroundColor: "#fff", borderRadius: 20, paddingTop: 20, paddingBottom: 24, paddingHorizontal: 24, alignItems: "center", position: 'relative', elevation: 10 },
  closeCornerBtn: { position: 'absolute', top: 16, right: 20, zIndex: 10, padding: 4 },
  closeX: { fontSize: 20, color: "#94A3B8", fontWeight: "bold" },
  modalTitle: { fontSize: 19, fontWeight: "700", marginTop: 10 },
  modalSubtitle: { fontSize: 14, color: "#475569", marginTop: 12, marginBottom: 24, textAlign: 'center', lineHeight: 20 },
  modalButtonsRow: { width: "100%", flexDirection: "row", justifyContent: "space-between", gap: 12 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  modalBtnText: { fontWeight: '700', fontSize: 15 },

  warningBox: { position: 'absolute', bottom: 85, left: 20, right: 20, backgroundColor: '#e67e22', padding: 14, borderRadius: 14, flexDirection: 'row', alignItems: 'center', zIndex: 9999, elevation: 6 },
  warningText: { color: '#fff', marginLeft: 10, fontSize: 14, fontWeight: '600', flex: 1 },
});