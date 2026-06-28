import React, { useCallback, useState } from "react";
import { API_URLS } from '../../src/services/apiConfig';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { useFocusEffect, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";

// const API = "http://172.20.140.250:5000/api";

export default function RiderDownloadedLists() {
  const [deleteModal, setDeleteModal] = useState(false);
const [selectedDeleteId, setSelectedDeleteId] = useState(null);
const [selectedListData, setSelectedListData] = useState(null);
  const router = useRouter();
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState([]);
const [showItemsModal, setShowItemsModal] = useState(false);

  const loadLists = useCallback(async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      const res = await axios.get(API_URLS.DOWNLOADED_LISTS, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLists(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.log(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadLists(); }, [loadLists]));

const deleteList = async (id) => {
  Alert.alert(
    "Delete List",
    "Are you sure you want to delete this downloaded list?",
    [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const token = await AsyncStorage.getItem("token");

            await axios.delete(
              `${API_URLS.DOWNLOADED_LISTS}/${id}`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );

            setLists((prev) =>
              prev.filter((l) => l.id !== id)
            );
          } catch (e) {
            Alert.alert("Error", "Delete failed");
          }
        },
      },
    ]
  );
};

  const openOptimizer = (item) => {
    const requestId = item.originalListId || item.requestId;
    if (!requestId) {
      Alert.alert("Not available", "This downloaded list is not linked with a rider request.");
      return;
    }
    router.push({ pathname: "/riderDashboard/rideroptimizer", params: { requestId } });
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#eef4fe", "#2e4466"]} start={{ x: 1, y: 0 }} end={{ x: 0, y: 0 }} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="#eef4fe" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Downloaded Lists</Text>
        <View style={{ width: 28 }} />
      </LinearGradient>

      {loading ? (
        <ActivityIndicator size="large" color="#2e4466" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={lists}
          keyExtractor={(i) => String(i.id)}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.emptyText}>No lists saved</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
             <View style={styles.cardHeader}>
  <View style={{ flex: 1, paddingRight: 10 }}>
    <Text style={styles.cardTitle}>
      {item.name}
    </Text>

    <Text style={styles.meta}>
      From: {item.senderName || "Customer"}
    </Text>
  </View>

  <TouchableOpacity
    style={styles.optimizeBtn}
    onPress={() => openOptimizer(item)}
  >
    <Ionicons
      name="navigate-circle-outline"
      size={24}
      color="#2e4466"
    />
  </TouchableOpacity>
</View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryText}>Items: {item.items?.length || 0}</Text>
                {!!item.receiverType && <Text style={styles.summaryPill}>{item.receiverType}</Text>}
              </View>

              <View style={styles.row}>
                <TouchableOpacity
  style={styles.openBtn}
  onPress={() => {
  setSelectedListData(item);
  setShowItemsModal(true);
}}
  
>
                  <Ionicons name="eye-outline" size={16} color="#fff" />
                  <Text style={styles.btnText}>View</Text>
                </TouchableOpacity>
                <TouchableOpacity
  style={styles.delBtn}
  onPress={() => {
    setSelectedDeleteId(item.id);
    setSelectedListData(item);
    setDeleteModal(true);
  }}
>
  <Ionicons name="trash-outline" size={16} color="#fff" />
  <Text style={styles.btnText}>Delete</Text>
</TouchableOpacity>

                
              </View>
            </View>
          )}
        />
      )}
      <Modal visible={showItemsModal} transparent animationType="fade">
  <View style={styles.modalOverlay}>
    <View style={styles.modalBoxLarge}>

      <View style={styles.modalHeaderRow}>
        <Text style={styles.modalListTitle}>
          {selectedListData?.name}
        </Text>
      </View>

      <ScrollView
        style={{ width: "100%", maxHeight: 430 }}
        showsVerticalScrollIndicator={false}
      >
        {(selectedListData?.items || []).map((i, idx) => (
          <View key={idx} style={styles.modalItemBlock}>

            <Text style={styles.modalCategory}>
              {i.categoryName || "Category"}
            </Text>

            <Text style={styles.modalItemName}>
              {i.name}
            </Text>

            <Text style={styles.modalMeta}>
              Qty: {i.quantity || 1}
            </Text>

            <Text style={styles.modalMeta}>
              Spec: {i.specification || "None"}
            </Text>

            {i.selectedShopName && (
              <Text style={styles.modalShop}>
                Shop: {i.selectedShopName}
              </Text>
            )}

            {i.selectedShopPrice && (
              <Text style={styles.modalMeta}>
                Price: Rs. {i.selectedShopPrice}
              </Text>
            )}

            {i.lineTotal && (
              <Text style={styles.modalTotal}>
                Line Total: Rs. {i.lineTotal}
              </Text>
            )}

          </View>
        ))}
      </ScrollView>

      <View style={styles.billRow}>
        <Text style={styles.billLabel}>
          Total Items
        </Text>

        <Text style={styles.billValue}>
          {(selectedListData?.items || []).length}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.modalCloseButton}
        onPress={() => {
          setShowItemsModal(false);
          setSelectedListData(null);
        }}
      >
        <Text style={styles.modalCloseButtonText}>
          Close
        </Text>
      </TouchableOpacity>

    </View>
  </View>
</Modal>
<Modal visible={deleteModal} transparent animationType="fade">
  <View style={styles.modalOverlay}>
    <View style={styles.popup}>

      <TouchableOpacity
        onPress={() => {
          setDeleteModal(false);
          setSelectedDeleteId(null);
        }}
        style={styles.closeCornerBtn}
      >
        <Text style={styles.closeX}>✕</Text>
      </TouchableOpacity>

      <Text
        style={[
          styles.title,
          { color: "#ef4444" }
        ]}
      >
        Delete List
      </Text>

      <Text style={styles.modalSubtitle}>
        Are you sure you want to permanently delete
        "{selectedListData?.name}"?
      </Text>

      <View style={styles.rowBtns}>
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => {
            setDeleteModal(false);
            setSelectedDeleteId(null);
          }}
        >
          <Text style={styles.cancelText}>
            Cancel
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.redBtn}
          onPress={async () => {
            try {
              const token = await AsyncStorage.getItem("token");

              await axios.delete(
                `${API_URLS.DOWNLOADED_LISTS}/${selectedDeleteId}`,
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                }
              );

              setLists(prev =>
                prev.filter(
                  l => l.id !== selectedDeleteId
                )
              );

              setDeleteModal(false);
              setSelectedDeleteId(null);
            } catch (e) {
              console.log(e);
            }
          }}
        >
          <Text style={styles.btnText}>
            Delete
          </Text>
        </TouchableOpacity>

      </View>
    </View>
  </View>
</Modal>
     
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: { height: 85, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { flex: 1, color: "#eef4fe", fontSize: 22, fontWeight: "800", textAlign: "center" },
  listContent: { padding: 16, paddingBottom: 100 },
  emptyText: { textAlign: "center", color: "#64748b", fontWeight: "800", marginTop: 30 },
  card: { backgroundColor: "#fff", padding: 14, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: "#e2e8f0", elevation: 2 },
  cardHeader: {
  flexDirection: "row",
  alignItems: "flex-start",
},


  optimizeBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#eef4fe", alignItems: "center", justifyContent: "center", marginLeft: 10 },
  card: { backgroundColor:"#fff", borderRadius:18, padding:18, marginBottom:14, borderWidth:1, borderColor:"#e2e8f0", elevation:2 },

cardHeader: { flexDirection:"row", alignItems:"center", justifyContent:"space-between", marginBottom:12 },

cardTitle: { fontSize:24, fontWeight:"900", color:"#2e4466", textAlign:"center", flex:1 },

meta: { fontSize:14, color:"#64748b", fontWeight:"600", marginTop:2 },

summaryRow: { flexDirection:"row", justifyContent:"space-between", alignItems:"center", marginTop:10, paddingTop:10, borderTopWidth:1, borderTopColor:"#f1f5f9" },

summaryText: { fontSize:14, color:"#475569", fontWeight:"700" },

summaryPill: { backgroundColor:"#eef2f7", color:"#2e4466", paddingHorizontal:12, paddingVertical:6, borderRadius:20, fontSize:11, fontWeight:"800", overflow:"hidden" },

optimizeBtn: { width:40, height:40, borderRadius:20, backgroundColor:"#eef4fe", alignItems:"center", justifyContent:"center" },

row: { flexDirection:"row", gap:10, marginTop:14 },

openBtn: { flex:1, height:44, backgroundColor:"#344b73", borderRadius:12, flexDirection:"row", justifyContent:"center", alignItems:"center" },

delBtn: { flex:1, height:44, backgroundColor:"#ef4444", borderRadius:12, flexDirection:"row", justifyContent:"center", alignItems:"center" },

btnText: { color:"#fff", fontSize:15, fontWeight:"800", marginLeft:6 },
  
  row: { flexDirection: "row", gap: 10, marginTop: 12 },
  openBtn: { flex: 1, backgroundColor: "#2e4466", padding: 11, borderRadius: 12, alignItems: "center", justifyContent: "center", flexDirection: "row" },
  delBtn: { flex: 1, backgroundColor: "#ef4444", padding: 11, borderRadius: 12, alignItems: "center", justifyContent: "center", flexDirection: "row" },
  btnText: { color: "#fff", fontWeight: "800", marginLeft: 6 },
  modalOverlay: {
  flex: 1,
  backgroundColor: "rgba(0,0,0,0.5)",
  justifyContent: "center",
  alignItems: "center",
  padding: 20,
},
popup: {
  width: "90%",
  backgroundColor: "#fff",
  borderRadius: 20,
  padding: 20,
  alignItems: "center",
},

title: {
  fontSize: 20,
  fontWeight: "800",
  color: "#2e4466",
  marginBottom: 10,
  textAlign: "center",
},

modalSubtitle: {
  fontSize: 14,
  color: "#64748b",
  textAlign: "center",
  lineHeight: 22,
  marginBottom: 20,
},

rowBtns: {
  flexDirection: "row",
  justifyContent: "space-between",
  width: "100%",
  marginTop: 10,
},

cancelBtn: {
  flex: 1,
  backgroundColor: "#f1f5f9",
  paddingVertical: 12,
  borderRadius: 12,
  marginRight: 8,
  alignItems: "center",
},

cancelText: {
  color: "#475569",
  fontWeight: "800",
},

redBtn: {
  flex: 1,
  backgroundColor: "#ef4444",
  paddingVertical: 12,
  borderRadius: 12,
  marginLeft: 8,
  alignItems: "center",
},

closeCornerBtn: {
  position: "absolute",
  top: 12,
  right: 12,
  zIndex: 5,
},

closeX: {
  fontSize: 22,
  color: "#94a3b8",
  fontWeight: "800",
},

/* CUSTOMER DOWNLOAD STYLE POPUP */

modalBoxLarge: {
  width: "100%",
  maxWidth: 470,
  maxHeight: "85%",
  backgroundColor: "#fff",
  borderRadius: 20,
  padding: 16,
},

modalHeaderRow: {
  width: "100%",
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 12,
},

modalListTitle: {
  fontWeight: "800",
  fontSize: 20,
  color: "#2e4466",
  flex: 1,
},

modalItemBlock: {
  paddingVertical: 10,
  borderBottomWidth: 1,
  borderBottomColor: "#f1f5f9",
},

modalCategory: {
  color: "#2e4466",
  fontSize: 14,
  fontWeight: "800",
},

modalItemName: {
  color: "#334155",
  fontSize: 14,
  fontWeight: "700",
  marginTop: 4,
},

modalMeta: {
  color: "#64748b",
  marginTop: 3,
  fontSize: 12,
},

modalShop: {
  color: "#10b981",
  marginTop: 3,
  fontSize: 12,
  fontWeight: "800",
},

modalTotal: {
  color: "#10b981",
  marginTop: 3,
  fontSize: 12,
  fontWeight: "800",
},

billRow: {
  width: "100%",
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingTop: 12,
  marginTop: 8,
  borderTopWidth: 1,
  borderTopColor: "#e2e8f0",
},

billLabel: {
  color: "#1e293b",
  fontSize: 15,
  fontWeight: "900",
},

billValue: {
  color: "#10b981",
  fontSize: 17,
  fontWeight: "900",
},

modalCloseButton: {
  backgroundColor: "#2e4466",
  borderRadius: 14,
  paddingVertical: 12,
  alignItems: "center",
  marginTop: 14,
},

modalCloseButtonText: {
  color: "#fff",
  fontWeight: "800",
  fontSize: 14,
},

});
