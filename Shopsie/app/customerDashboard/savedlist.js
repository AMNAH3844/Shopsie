import React, { useState, useCallback } from "react";
import { API_URLS } from '../../src/services/apiConfig';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  StatusBar
} from "react-native";

import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, useFocusEffect, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

export default function SavedList() {
  const router = useRouter();
  const { flow = "normal" } = useLocalSearchParams();
  
  // Data States
  const [lists, setLists] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedList, setSelectedList] = useState(null);
  
  // Non-Decision Warning Status States
  const [loadingError, setLoadingError] = useState(false);

  // Decision Modal Visibility States
  const [optimizeModalVisible, setOptimizeModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false); 
  const [showSharePopup, setShowSharePopup] = useState(false);
  const [showDeletePopup, setShowDeletePopup] = useState(false);

  const getId = (item) => item?.id || item?._id;

  // LOAD LISTS
  const loadLists = async () => {
    try {
      setLoadingError(false);
      const t = await AsyncStorage.getItem("token");
      if (!t) return;

      const res = await axios.get(`${API_URLS.LISTS}/my-lists`, {
        headers: { Authorization: `Bearer ${t}` }
      });

      const incomingData = Array.isArray(res.data) 
        ? res.data 
        : (res.data?.lists || res.data?.data || []);

      setLists(incomingData);
    } catch (err) {
      console.log(err);
      // No decision needed from user, so we trigger the inline orange warning instead of a disruptive Alert
      setLoadingError(true);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadLists();
    }, [])
  );

  // DELETE
  const handleConfirmedDelete = async () => {
    try {
      const t = await AsyncStorage.getItem("token");
      const id = getId(selectedList);

      await axios.delete(`${API_URLS.LISTS}/${id}`, {
        headers: { Authorization: `Bearer ${t}` }
      });

      setLists((prev) => prev.filter((l) => getId(l) !== id));
      setShowDeletePopup(false);
      setSelectedList(null);

    } catch (err) {
      console.log(err);
      setShowDeletePopup(false);
    }
  };

  // Strictly matches lists starting with the search term
  const filteredLists = Array.isArray(lists)
    ? lists.filter((l) => l.name?.toLowerCase().startsWith(search.toLowerCase()))
    : [];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* HEADER */}
      <LinearGradient
        colors={["#eef4fe", "#2e4466"]}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 0 }}
        style={styles.header}
      >
        <TouchableOpacity 
          onPress={() => router.canGoBack() ? router.back() : router.replace("/customerDashboard")}
        >
          <Ionicons name="chevron-back" size={28} color="#eef4fe" />
        </TouchableOpacity>

        <Text style={styles.headerTitleText}>Saved Lists</Text>

        <TouchableOpacity onPress={() => setCreateModalVisible(true)}>
          <MaterialCommunityIcons
            name="playlist-plus"
            size={32}
            color="#2e4466"
          />
        </TouchableOpacity>
      </LinearGradient>

      {/* SEARCH STRUCTURE */}
      <View style={styles.listSearchWrapper}>
        <View style={styles.listSearchBox}>
          <Ionicons name="filter" size={18} color="#666" />
          <TextInput
            placeholder="Search my lists..."
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
      {loadingError && (
        <View style={styles.orangeWarningBanner}>
          <Ionicons name="alert-circle" size={20} color="#f97316" />
          <Text style={styles.warningText}>
            Could not sync your profiles. Displaying cached data if available.
          </Text>
        </View>
      )}

      {search.length > 0 && filteredLists.length === 0 && (
        <View style={styles.orangeWarningBanner}>
          <Ionicons name="search-outline" size={20} color="#f97316" />
          <Text style={styles.warningText}>
            No lists match your search keyword "{search}".
          </Text>
        </View>
      )}

      {/* LIST */}
      <FlatList
        data={filteredLists}
        keyExtractor={(item) => String(getId(item))}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !loadingError && search.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No saved lists yet.</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={styles.listCard}>
            {/* Left Circle Icon */}
            <View style={styles.listIconContainer}>
              <Ionicons name="list" size={20} color="#4b5b78" />
            </View>

            {/* List Name */}
            <Text style={styles.listName}>
              {item.name}
            </Text>

            {/* Right Icons */}
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                onPress={() => {
                  setSelectedList(item);
                  setOptimizeModalVisible(true);
                }}
                style={styles.actionBtn}
              >
                <Ionicons
                  name="navigate-circle-outline"
                  size={24}
                  color="#2e4466"
                />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setSelectedList(item);
                  setEditModalVisible(true);
                }}
                style={styles.actionBtn}
              >
                <Ionicons
                  name="create-outline"
                  size={24}
                  color="#7a8ba8"
                />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setSelectedList(item);
                  setShowSharePopup(true);
                }}
                style={styles.actionBtn}
              >
                <Ionicons
                  name="share-social-outline"
                  size={24}
                  color="#3dbb5d"
                />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setSelectedList(item);
                  setShowDeletePopup(true);
                }}
                style={styles.actionBtn}
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

      {/* DECISION OVERLAY MODALS */}

      {/* CREATE LIST CONFIRMATION MODAL */}
      <Modal visible={createModalVisible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.popup}>
            <TouchableOpacity 
              onPress={() => setCreateModalVisible(false)} 
              style={styles.closeCornerBtn}
            >
              <Text style={styles.closeX}>✕</Text>
            </TouchableOpacity>

            <Text style={styles.title}>Create New List</Text>
            <Text style={styles.modalSubtitle}>
              Do you want to create a new shopping list?
            </Text>

            <View style={styles.rowBtns}>
              <TouchableOpacity
                onPress={() => setCreateModalVisible(false)}
                style={styles.cancelBtn}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setCreateModalVisible(false);
                  router.push("/customerDashboard/createlist");
                }}
                style={[styles.greenBtn, { backgroundColor: "#2e4466" }]}
              >
                <Text style={styles.btnTextWhite}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* OPTIMIZE LIST CONFIRMATION MODAL */}
      <Modal visible={optimizeModalVisible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.popup}>
            <TouchableOpacity 
              onPress={() => { setOptimizeModalVisible(false); setSelectedList(null); }} 
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
                onPress={() => {
                  setOptimizeModalVisible(false);
                  setSelectedList(null);
                }}
                style={styles.cancelBtn}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setOptimizeModalVisible(false);
                  router.push({
                    pathname: "/customerDashboard/optimizeRoute",
                    params: { listId: getId(selectedList) }
                  });
                }}
                style={[styles.greenBtn, { backgroundColor: "#2e4466" }]}
              >
                <Text style={styles.btnTextWhite}>Optimize</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* EDIT LIST CONFIRMATION MODAL */}
      <Modal visible={editModalVisible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.popup}>
            <TouchableOpacity 
              onPress={() => { setEditModalVisible(false); setSelectedList(null); }} 
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
                onPress={() => {
                  setEditModalVisible(false);
                  setSelectedList(null);
                }}
                style={styles.cancelBtn}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setEditModalVisible(false);
                  router.push({
                    pathname: "/customerDashboard/createlist",
                    params: { editData: JSON.stringify(selectedList) }
                  });
                }}
                style={styles.orangeBtn}
              >
                <Text style={styles.btnTextWhite}>Edit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* SHARE POPUP */}
      <Modal visible={showSharePopup} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.popup}>
            <TouchableOpacity 
              onPress={() => { setShowSharePopup(false); setSelectedList(null); }} 
              style={styles.closeCornerBtn}
            >
              <Text style={styles.closeX}>✕</Text>
            </TouchableOpacity>

            <Text style={styles.title}>Share List</Text>
            <Text style={styles.modalSubtitle}>
              Please add a shop and delivery location to proceed with sharing your list "{selectedList?.name}".
            </Text>

            <View style={styles.rowBtns}>
              <TouchableOpacity
                onPress={() => {
                  setShowSharePopup(false);
                  setSelectedList(null);
                }}
                style={styles.cancelBtn}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setShowSharePopup(false);
                  router.push({
                    pathname: "/customerDashboard/cart",
                    params: {
                      listName: selectedList?.name,
                      items: JSON.stringify(selectedList?.items || []),
                      flow
                    }
                  });
                }}
                style={styles.greenBtn}
              >
                <Text style={styles.btnTextWhite}>Add Locations</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* DELETE POPUP */}
      <Modal visible={showDeletePopup} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.popup}>
            <TouchableOpacity 
              onPress={() => { setShowDeletePopup(false); setSelectedList(null); }} 
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
                onPress={() => {
                  setShowDeletePopup(false);
                  setSelectedList(null);
                }}
                style={styles.cancelBtn}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleConfirmedDelete}
                style={styles.redBtn}
              >
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

  /* NEW WARNING STYLES (No Decision Needed Banners) */
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
    paddingBottom: 100 
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