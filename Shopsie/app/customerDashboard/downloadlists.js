import React, { useState, useCallback } from "react";
import { API_URLS } from '../../src/services/apiConfig';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  StatusBar,
  ScrollView
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  useRouter,
  useLocalSearchParams,
  useFocusEffect,
} from "expo-router";

export default function DownloadLists() {
  const [detailsModal, setDetailsModal] = useState(false);
  const router = useRouter();
  const { flow = "normal", source = "normal" } = useLocalSearchParams();
  const isRequestRiderFlow = flow === "request_rider" || source === "riderDirect";

  // Data States
  const [lists, setLists] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedList, setSelectedList] = useState(null);

  // Non-Decision Warning Status States
  const [fetchError, setFetchError] = useState(false);

  // Decision Modal Visibility States
  const [shareModal, setShareModal] = useState(false);
  const [optimizeModal, setOptimizeModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);

  // ---------------- LOAD ----------------
  const fetchLists = async () => {
    try {
      setFetchError(false);
      const token = await AsyncStorage.getItem("token");

      const res = await axios.get(API_URLS.DOWNLOADS, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setLists(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.log("FETCH ERROR:", e.message);
      // Trigger non-blocking orange alert layout indicator
      setFetchError(true);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchLists();
    }, [])
  );

  // ---------------- HELPERS ----------------
  const getLocation = (list, type) => {
    const latKey = type === "delivery" ? "deliveryLocationLat" : "buyingLocationLat";
    const lngKey = type === "delivery" ? "deliveryLocationLng" : "buyingLocationLng";
    const labelKey = type === "delivery" ? "deliveryLocationLabel" : "buyingLocationLabel";

    const item = list?.items?.find(
      (i) => i[latKey] != null && i[lngKey] != null
    );

    if (!item) return null;

    return {
      lat: item[latKey],
      lng: item[lngKey],
      label: item[labelKey] || "Location",
    };
  };

  // ---------------- RIDER NAV ----------------
  const goToRider = (list) => {
    const buying = getLocation(list, "buying");
    const delivery = getLocation(list, "delivery");

    router.push({
      pathname: "/customerDashboard/select-rider",
      params: {
        listId: list.id,
        listName: list.name,
        listType: "downloaded",

        buyingLocationLat: buying?.lat,
        buyingLocationLng: buying?.lng,
        buyingLocationLabel: buying?.label,

        deliveryLocationLat: delivery?.lat,
        deliveryLocationLng: delivery?.lng,
        deliveryLocationLabel: delivery?.label,

        flow,
        source,
      },
    });
  };

  // ---------------- SHARE ----------------
  const handleSharePress = (list) => {
    setSelectedList(list);

    if (isRequestRiderFlow) {
      goToRider(list);
      return;
    }

    setShareModal(true);
  };

  const handleFriendShare = () => {
    setShareModal(false);

    router.push({
      pathname: "/customerDashboard/inbox",
      params: {
        listId: selectedList?.id,
        listName: selectedList?.name,
        items: JSON.stringify(selectedList?.items || []),
        source: "download_friend",
      },
    });
  };

  const handleRiderShare = () => {
    setShareModal(false);
    goToRider(selectedList);
  };

  // ---------------- DELETE LOGIC ----------------
  const handleConfirmedDelete = async () => {
    if (!selectedList) return;

    try {
      const token = await AsyncStorage.getItem("token");

      await axios.delete(`${API_URLS.DOWNLOADS}/${selectedList.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setLists((prev) => prev.filter((l) => l.id !== selectedList.id));
      setDeleteModal(false);
      setSelectedList(null);
    } catch (err) {
      console.log("DELETE ERROR:", err.message);
      setDeleteModal(false);
    }
  };

  // Search matching prefixes exactly like lists/friends page
  const filtered = Array.isArray(lists)
    ? lists.filter((l) => l.name?.toLowerCase().startsWith(search.toLowerCase()))
    : [];

 return (
  <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
    <View style={styles.container}>

      {/* HEADER */}
      <LinearGradient
        colors={["#eef4fe", "#2e4466"]}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 0 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="#eef4fe" />
        </TouchableOpacity>

        <Text style={styles.headerTitleText}>Downloaded Lists</Text>

        <View style={{ width: 28 }} />
      </LinearGradient>

      {/* SEARCH STRUCTURE */}
      <View style={styles.listSearchWrapper}>
        <View style={styles.listSearchBox}>
          <Ionicons name="filter" size={18} color="#666" />
          <TextInput
            placeholder="Search downloaded lists..."
            style={styles.listSearchInput}
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#999"
          />
          {search !== '' && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* NON-DECISION STATUSES (Orange Warnings) */}
      {fetchError && (
        <View style={styles.orangeWarningBanner}>
          <Ionicons name="alert-circle" size={20} color="#f97316" />
          <Text style={styles.warningText}>
            Could not fetch downloaded profiles. Displaying local data if available.
          </Text>
        </View>
      )}

      {search.length > 0 && filtered.length === 0 && (
        <View style={styles.orangeWarningBanner}>
          <Ionicons name="search-outline" size={20} color="#f97316" />
          <Text style={styles.warningText}>
            No downloaded profiles match prefix text "{search}".
          </Text>
        </View>
      )}

      {/* LIST */}
      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !fetchError && search.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No downloaded lists yet.</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={styles.listCard}>
            {/* Left Circle Icon */}
           <TouchableOpacity
  style={styles.listIconContainer}
  onPress={() => {
    setSelectedList(item);
    setDetailsModal(true);
  }}
>
  <Ionicons
    name="list"
    size={20}
    color="#4b5b78"
  />
</TouchableOpacity>

            {/* List Name */}
            <Text style={styles.listName}>{item.name}</Text>

            {/* Right Icons */}
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => {
                  setSelectedList(item);
                  setOptimizeModal(true);
                }}
              >
                <Ionicons
                  name="navigate-circle-outline"
                  size={24}
                  color="#2e4466"
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => {
                  setSelectedList(item);
                  setEditModal(true);
                }}
              >
                <Ionicons
                  name="create-outline"
                  size={24}
                  color="#7a8ba8"
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => handleSharePress(item)}
              >
                <Ionicons
                  name="share-social-outline"
                  size={24}
                  color="#3dbb5d"
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => {
                  setSelectedList(item);
                  setDeleteModal(true);
                }}
              >
                <Ionicons
                  name="trash-outline"
                  size={24}
                  color="#ff6b6b"
                />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* DECISION OVERLAY details  MODALS */}
      <Modal visible={detailsModal} transparent animationType="fade">
  <View style={styles.modalOverlay}>
    <View style={styles.modalBoxLarge}>

      <View style={styles.modalHeaderRow}>
        <Text style={styles.modalListTitle}>
          {selectedList?.name}
        </Text>
      </View>

      <View style={styles.locationSummary}>
        <Text style={styles.locationTitle}>
          Buying Location
        </Text>

        <Text style={styles.locationText}>
          {selectedList?.items?.[0]?.buyingLocationLabel || "Not Available"}
        </Text>

        <Text
          style={[
            styles.locationTitle,
            { marginTop: 10 }
          ]}
        >
          Delivery Location
        </Text>

        <Text style={styles.locationText}>
          {selectedList?.items?.[0]?.deliveryLocationLabel || "Not Available"}
        </Text>
      </View>

      <ScrollView
        style={{ width: "100%", maxHeight: 430 }}
        showsVerticalScrollIndicator={false}
      >
        {(selectedList?.items || []).map((i, idx) => (
          <View key={idx} style={styles.modalItemBlock}>

            <Text style={styles.modalCategory}>
              {i.categoryName || "Category"}
            </Text>

            <Text style={styles.modalItemName}>
              {i.name}
            </Text>

            <Text style={styles.modalMeta}>
              Qty: {i.quantity}
            </Text>

            <Text style={styles.modalMeta}>
              Spec: {i.specification || "None"}
            </Text>

            <Text style={styles.modalShop}>
              Shop: {i.selectedShopName || "Not Selected"}
            </Text>

            <Text style={styles.modalMeta}>
              Price: Rs. {i.selectedShopPrice || 0}
            </Text>

            <Text style={styles.modalTotal}>
              Line Total: Rs. {i.lineTotal || 0}
            </Text>

          </View>
        ))}
      </ScrollView>

      <View style={styles.billRow}>
        <Text style={styles.billLabel}>
          Total Bill
        </Text>

        <Text style={styles.billValue}>
          Rs. {(selectedList?.items || []).reduce(
            (sum, x) => sum + Number(x.lineTotal || 0),
            0
          )}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.modalCloseButton}
        onPress={() => {
          setDetailsModal(false);
          setSelectedList(null);
        }}
      >
        <Text style={styles.modalCloseButtonText}>
          Close
        </Text>
      </TouchableOpacity>

    </View>
  </View>
</Modal>
 
      {/* SHARE MODAL */}
      <Modal visible={shareModal} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.popup}>
            <TouchableOpacity 
              onPress={() => { setShareModal(false); setSelectedList(null); }} 
              style={styles.closeCornerBtn}
            >
              <Text style={styles.closeX}>✕</Text>
            </TouchableOpacity>

            <Text style={styles.title}>Share List</Text>
            <Text style={styles.modalSubtitle}>
              Do you want to share the list "{selectedList?.name}" via friend or rider?
            </Text>

            <View style={styles.rowBtns}>
              <TouchableOpacity
                style={[styles.greenBtn, { marginLeft: 0, marginRight: 10 }]}
                onPress={handleFriendShare}
              >
                <Text style={styles.btnTextWhite}>Friend</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.greenBtn, { backgroundColor: "#2e4466" }]}
                onPress={handleRiderShare}
              >
                <Text style={styles.btnTextWhite}>Rider</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* OPTIMIZE MODAL */}
      <Modal visible={optimizeModal} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.popup}>
            <TouchableOpacity 
              onPress={() => { setOptimizeModal(false); setSelectedList(null); }} 
              style={styles.closeCornerBtn}
            >
              <Text style={styles.closeX}>✕</Text>
            </TouchableOpacity>

            <Text style={styles.title}>Optimize Route</Text>
            <Text style={styles.modalSubtitle}>
              Do you want to optimize the shopping route for the list "{selectedList?.name}"?
            </Text>

            <View style={styles.rowBtns}>
              <TouchableOpacity
                onPress={() => { setOptimizeModal(false); setSelectedList(null); }}
                style={styles.cancelBtn}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.greenBtn, { backgroundColor: "#2e4466" }]}
                onPress={() => {
                  setOptimizeModal(false);
                  router.push({
                    pathname: "/riderDashboard/rideroptimizer",
                    params: {
                      downloadedListId: selectedList?.id,
                      optimizerMode: "downloaded",
                    },
                  });
                }}
              >
                <Text style={styles.btnTextWhite}>Optimize</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* EDIT MODAL */}
      <Modal visible={editModal} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.popup}>
            <TouchableOpacity 
              onPress={() => { setEditModal(false); setSelectedList(null); }} 
              style={styles.closeCornerBtn}
            >
              <Text style={styles.closeX}>✕</Text>
            </TouchableOpacity>

            <Text style={styles.title}>Edit List</Text>
            <Text style={styles.modalSubtitle}>
              Do you want to edit the items in your list "{selectedList?.name}"?
            </Text>

            <View style={styles.rowBtns}>
              <TouchableOpacity
                onPress={() => { setEditModal(false); setSelectedList(null); }}
                style={styles.cancelBtn}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.orangeBtn}
                onPress={() => {
                  setEditModal(false);
                  router.push({
                    pathname: "/customerDashboard/createlist",
                    params: { editData: JSON.stringify(selectedList) },
                  });
                }}
              >
                <Text style={styles.btnTextWhite}>Edit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* DELETE MODAL */}
      <Modal visible={deleteModal} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.popup}>
            <TouchableOpacity 
              onPress={() => { setDeleteModal(false); setSelectedList(null); }} 
              style={styles.closeCornerBtn}
            >
              <Text style={styles.closeX}>✕</Text>
            </TouchableOpacity>

            <Text style={[styles.title, { color: '#ef4444' }]}>Delete List</Text>
            <Text style={styles.modalSubtitle}>
              Are you sure you want to permanently delete the list "{selectedList?.name}"?
            </Text>

            <View style={styles.rowBtns}>
              <TouchableOpacity
                onPress={() => { setDeleteModal(false); setSelectedList(null); }}
                style={styles.cancelBtn}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.redBtn} onPress={handleConfirmedDelete}>
                <Text style={styles.btnTextWhite}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* FIXED NAVBAR */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.tabItem} onPress={() => router.push("/customerDashboard")}>
          <Ionicons name="home" size={22} color="white" />
          <Text style={styles.navText}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => router.push("/customerDashboard/savedlist")}>
          <MaterialCommunityIcons name="format-list-bulleted" size={22} color="white" />
          <Text style={styles.navText}>Saved Lists</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => router.push("/customerDashboard/inbox")}>
          <Ionicons name="chatbubble-ellipses-outline" size={22} color="white" />
          <Text style={styles.navText}>Inbox</Text>
        </TouchableOpacity>
      </View>

       </View>
  </SafeAreaView>
);
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff" },

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

  listSearchWrapper: { 
    paddingHorizontal: 20, 
    paddingTop: 20, 
    paddingBottom: 5, 
    backgroundColor: '#fff' 
  },
  listSearchBox: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#f1f3f6', 
    paddingHorizontal: 12, 
    height: 45, 
    borderRadius: 15, 
    borderWidth: 1.5, 
    borderColor: "#2e4466" 
  },
  listSearchInput: { 
    flex: 1, 
    marginLeft: 8, 
    fontSize: 15, 
    color: '#2e4466', 
    outlineStyle: 'none' 
  },

  /* WARNING ACCENTS (Zero Decision Required Containers) */
  orangeWarningBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff7ed", 
    borderColor: "#fed7aa",     
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 20,
    marginTop: 15,
    gap: 10,
  },
  warningText: {
    color: "#c2410c",           
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },

 listContent: {
  paddingHorizontal: 20,
  paddingTop: 15,
  paddingBottom: 75,
},

  emptyBox: { 
    flex: 1, 
    alignItems: "center", 
    justifyContent: "center", 
    gap: 12, 
    marginTop: 210,
  },
  emptyText: { 
    color: "#94a3b8", 
    fontWeight: "700", 
    fontSize: 15 
  },

  listCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 2,
    marginTop: 2,
    marginBottom: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
    borderRadius: 15,
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 2,
  },

  listIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#e9edf5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  listName: {
    flex: 1,
    fontSize: 15,
    color: "#333",
    fontWeight: "700",
  },

  actionsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },

  actionBtn: {
    marginLeft: 15, 
  },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 15,
  },
  modalOverlay: {
  position: "absolute",
  top: 0,
  bottom: 0,
  left: 0,
  right: 0,
  backgroundColor: "rgba(15,23,42,0.6)",
  justifyContent: "center",
  alignItems: "center",
  padding: 20,
},

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

locationSummary: {
  width: "100%",
  backgroundColor: "#f8fafc",
  borderRadius: 12,
  borderWidth: 1,
  borderColor: "#e2e8f0",
  padding: 10,
  marginBottom: 10,
},

locationTitle: {
  color: "#2e4466",
  fontSize: 13,
  fontWeight: "900",
},

locationText: {
  color: "#475569",
  fontSize: 12,
  marginTop: 3,
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

  popup: {
    width: "80%",
    backgroundColor: "#fff",
    borderRadius: 22,
    paddingTop: 15,
    paddingBottom: 25,
    paddingHorizontal: 40,
    alignItems: "center",
    position: 'relative',
  },

  closeCornerBtn: {
    position: 'absolute',
    top: 15,
    right: 20,
    zIndex: 10,
    padding: 5,
  },

  closeX: {
    fontSize: 22,
    color: "#94a3b8",
    fontWeight: "bold"
  },

  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111",
    marginTop: 18,
    textAlign: 'center'
  },

  modalSubtitle: {
    fontSize: 14,
    color: "#555",
    marginTop: 12,
    marginBottom: 30,
    textAlign: 'center',
    lineHeight: 20
  },

  rowBtns: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%"
  },

  cancelBtn: {
    flex: 1,
    backgroundColor: "#e5e5e5",
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    marginRight: 10,
  },

  greenBtn: {
    flex: 1,
    backgroundColor: "#10b981",
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    marginLeft: 10,
  },

  orangeBtn: {
    flex: 1,
    backgroundColor: "#f97316",
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    marginLeft: 10,
  },

  redBtn: {
    flex: 1,
    backgroundColor: "#ef4444",
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    marginLeft: 10,
  },

  btnTextWhite: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15
  },

  cancelText: {
    color: "#333",
    fontWeight: "700",
    fontSize: 15
  },

  /* -------------------- BOTTOM NAVIGATION -------------------- */
bottomNav: {
  position: "absolute",
  left: 0,
  right: 0,
  bottom: 0,

  height: 75,

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