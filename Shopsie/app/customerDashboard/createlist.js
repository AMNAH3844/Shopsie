import React, { useState, useEffect, useRef } from "react";
import { API_URLS } from "../../src/services/apiConfig";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  Animated,
  Easing,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";

import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context"; // Added SafeAreaView import
import styles from "./CreateListStyles";

// Ensures Category Names are "Categoryname" format
const formatCategory = (str) => {
  if (!str) return "";
  const cleaned = str.trim().toLowerCase();
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
};

const normalize = (str) => str.trim().toLowerCase();

export default function CreateList() {
  const router = useRouter();
  const { editData } = useLocalSearchParams();

  // --- Core State Management ---
  const [token, setToken] = useState("");
  const [listName, setListName] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [quantity, setQuantity] = useState("");
  const [spec, setSpec] = useState("");
  const [listItems, setListItems] = useState([]);
  const [finalizedData, setFinalizedData] = useState(null);
  const [showDB, setShowDB] = useState(false);
  const [showFav, setShowFav] = useState(false);
  const [database, setDatabase] = useState([]);
  const [dbSearch, setDbSearch] = useState("");
  const [favorites, setFavorites] = useState([]);
  const [expandedCategoryId, setExpandedCategoryId] = useState(null);
  const [filteredItems, setFilteredItems] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [listId, setListId] = useState(null);

  // --- Layout Banner / Notification Alert States ---
  const [fetchError, setFetchError] = useState(false);
  const [showWarningBox, setShowWarningBox] = useState(false);
  const [warningMessage, setWarningMessage] = useState("");

  // --- Interactive Choice Modal States ---
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedItemToDelete, setSelectedItemToDelete] = useState({
    catId: null,
    itemId: null,
    name: "",
  });
  const [shareModalVisible, setShareModalVisible] = useState(false);

  const animations = useRef({}).current;
  const listRef = useRef(null);

  // --- Helper: Transient Action Toast Injector ---
  const triggerWarning = (msg) => {
    setWarningMessage(msg);
    setShowWarningBox(true);
    setTimeout(() => {
      setShowWarningBox(false);
    }, 2500);
  };

  // --- Edit Mode Watcher ---
  useEffect(() => {
    if (editData) {
      const data = JSON.parse(editData);
      setListName(data.name);
      setListItems(data.items || []);
      setListId(data.id);
      setIsEditing(true);
    }
  }, [editData]);

  // --- Initial Data Fetch ---
  useEffect(() => {
    const loadData = async () => {
      const t = await AsyncStorage.getItem("token");
      if (!t) return triggerWarning("Login required. Redirecting...");
      setToken(t);

      try {
        setFetchError(false);
        const dbRes = await axios.get(`${API_URLS.LIST}/database`, {
          headers: { Authorization: `Bearer ${t}` },
        });
        setDatabase(dbRes.data);

        const favRes = await axios.get(`${API_URLS.LIST}/favorites`, {
          headers: { Authorization: `Bearer ${t}` },
        });
        setFavorites(favRes.data);
      } catch {
        setFetchError(true);
        triggerWarning("Error loading configuration data.");
      }
    };
    loadData();
  }, []);

  // --- Filter Database Pipeline ---
  const filteredDatabase = database
    .map((cat) => {
      const query = normalize(dbSearch);
      if (!query) return cat;

      const matchedItems = cat.items.filter((i) =>
        normalize(i.name).startsWith(query),
      );

      if (matchedItems.length === 0) return null;

      return {
        ...cat,
        items: matchedItems,
      };
    })
    .filter(Boolean);

  // --- Inline Recommendations Engine ---
  useEffect(() => {
    if (!name) return setFilteredItems([]);
    const matched = [];
    database.forEach((cat) => {
      cat.items.forEach((i) => {
        if (normalize(i.name).startsWith(normalize(name))) {
          matched.push({ ...i, categoryName: formatCategory(cat.name) });
        }
      });
    });
    setFilteredItems(matched);
  }, [name, database]);

  // --- Favorite Operations ---
  const toggleFavorite = async (item) => {
    const isFav = favorites.some(
      (f) => normalize(f.item.name) === normalize(item.name),
    );
    try {
      await axios.post(
        `${API_URLS.LIST}/favorite`,
        { itemId: item.id },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (isFav) {
        setFavorites((prev) =>
          prev.filter((f) => normalize(f.item.name) !== normalize(item.name)),
        );
        triggerWarning(`${item.name} removed from favorites`);
      } else {
        setFavorites((prev) => [
          ...prev,
          {
            id: Date.now(),
            item: {
              ...item,
              category: { name: formatCategory(item.categoryName) },
            },
          },
        ]);
        triggerWarning(`${item.name} added to favorites`);
      }
    } catch {
      triggerWarning("Error updating tracking configuration.");
    }
  };

  // --- Item Creation Handler ---
  const addItem = async () => {
    if (!name || !category) {
      return triggerWarning(
        "Please configure both Item Name and Category fields",
      );
    }

    try {
      const res = await axios.post(
        `${API_URLS.LIST}/add-item`,
        { name, category, quantity, specification: spec },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      const newItem = {
        id: res.data.id,
        name: res.data.name,
        categoryName: res.data.categoryName,
        quantity,
        specification: spec,
      };

      setListItems((prev) => {
        if (prev.some((i) => normalize(i.name) === normalize(name)))
          return prev;
        return [newItem, ...prev];
      });

      setDatabase((prev) => {
        const updated = [...prev];
        const catIndex = updated.findIndex(
          (c) => normalize(c.name) === normalize(res.data.categoryName),
        );

        const dbItem = {
          id: res.data.id,
          name: res.data.name,
          isGlobal: !!res.data.alreadyExists,
        };

        if (catIndex !== -1) {
          if (!updated[catIndex].items.some((i) => i.id === dbItem.id)) {
            updated[catIndex].items.push(dbItem);
          }
        } else {
          updated.push({
            id: Date.now(),
            name: res.data.categoryName,
            items: [dbItem],
          });
        }
        return updated;
      });

      setName("");
      setCategory("");
      setQuantity("");
      setSpec("");
      setFilteredItems([]);
    } catch (err) {
      triggerWarning("Could not register product item.");
    }
  };

  const removeItem = (index) =>
    setListItems((prev) => prev.filter((_, i) => i !== index));

  const finalizeList = () => {
    const grouped = {};
    listItems.forEach((i) => {
      const key = formatCategory(i.categoryName);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(i);
    });

    const sorted = {};
    Object.keys(grouped)
      .sort()
      .forEach((key) => {
        sorted[key] = grouped[key].sort((a, b) => a.name.localeCompare(b.name));
      });

    setFinalizedData(sorted);
    setShowDB(false);
    setShowFav(false);
  };

  // --- Save Data Handler ---
  const saveList = async () => {
    if (!listName.trim()) {
      return triggerWarning("Please assign a name to this list");
    }

    if (listItems.length === 0) {
      return triggerWarning(
        "Cannot save an empty list. Please add some items first.",
      );
    }

    try {
      const t = await AsyncStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${t}` } };

      const payload = {
        name: listName,
        items: listItems,
      };

      if (isEditing && listId) {
        await axios.put(`${API_URLS.LIST}/${listId}`, payload, config);
        triggerWarning("List updated successfully!");
      } else {
        const response = await axios.post(
          `${API_URLS.LIST}/save-list`,
          payload,
          config,
        );

        if (response.data && response.data.id) {
          setListId(response.data.id);
        } else if (
          response.data &&
          response.data.list &&
          response.data.list.id
        ) {
          setListId(response.data.list.id);
        }
        setIsEditing(true);

        triggerWarning("List saved successfully!");
      }
    } catch (err) {
      triggerWarning("Network dropped. Failed to synchronize storage.");
    }
  };

  // --- Destructive Modals Logic Chain ---
  const confirmDatabaseDelete = (catId, itemId, itemName) => {
    setSelectedItemToDelete({ catId, itemId, name: itemName });
    setDeleteModalVisible(true);
  };

  const executeDatabaseDelete = async () => {
    const { catId, itemId } = selectedItemToDelete;
    setDeleteModalVisible(false);
    try {
      const t = await AsyncStorage.getItem("token");
      await axios.delete(`${API_URLS.LIST}/item/${itemId}`, {
        headers: { Authorization: `Bearer ${t}` },
      });

      setDatabase((prev) =>
        prev
          .map((c) =>
            c.id === catId
              ? { ...c, items: c.items.filter((i) => i.id !== itemId) }
              : c,
          )
          .filter((c) => c.items.length > 0),
      );
    } catch (err) {
      triggerWarning("Database permissions blocked entry removal.");
    }
  };

  // --- Category Transition Animators ---
  const toggleCategory = (cat) => {
    if (!animations[cat.id]) animations[cat.id] = new Animated.Value(0);
    const isOpen = expandedCategoryId === cat.id;

    Animated.timing(animations[cat.id], {
      toValue: isOpen ? 0 : cat.items.length * 42,
      duration: 250,
      easing: Easing.ease,
      useNativeDriver: false,
    }).start();

    setExpandedCategoryId(isOpen ? null : cat.id);
  };

  // --- Render Framework Components ---
  const renderItem = ({ item, index }) => {
    const isFavorite = favorites.some(
      (f) => normalize(f.item.name) === normalize(item.name),
    );
    return (
      <View style={styles.listItem}>
        <View style={styles.itemInfo}>
          <Text style={styles.itemText} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.itemCategory}>
            {formatCategory(item.categoryName)}
          </Text>
        </View>

        <View style={styles.itemInputs}>
          <TextInput
            style={styles.inputSmall}
            placeholder="Qty"
            placeholderTextColor="#999"
            value={item.quantity?.toString() || ""}
            onChangeText={(val) => {
              const updated = [...listItems];
              updated[index].quantity = val;
              setListItems(updated);
            }}
          />

          <TextInput
            style={styles.inputSmall}
            placeholder="Spec"
            placeholderTextColor="#999"
            value={item.specification || ""}
            onChangeText={(val) => {
              const updated = [...listItems];
              updated[index].specification = val;
              setListItems(updated);
            }}
          />

          <View style={styles.listRowActions}>
            <TouchableOpacity onPress={() => toggleFavorite(item)}>
              <Ionicons
                name={isFavorite ? "heart" : "heart-outline"}
                size={22}
                color="red"
              />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => removeItem(index)}>
              <Text style={styles.removeBtn}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderCategoryItem = ({ item: cat }) => {
    const height = animations[cat.id] || new Animated.Value(0);
    const isOpen = expandedCategoryId === cat.id;

    return (
      <View key={cat.id} style={{ marginBottom: 8 }}>
        <TouchableOpacity
          onPress={() => toggleCategory(cat)}
          style={styles.categoryTitle}
        >
          <Text style={{ fontWeight: "bold" }}>{formatCategory(cat.name)}</Text>
          <Text>{isOpen ? "▲" : "▼"}</Text>
        </TouchableOpacity>

        <Animated.View
          style={{ height, overflow: "hidden" }}
          pointerEvents={isOpen ? "auto" : "none"}
        >
          {cat.items.map((i) => {
            const isFav = favorites.some(
              (f) => normalize(f.item.name) === normalize(i.name),
            );
            return (
              <View key={i.id} style={styles.categoryItemRow}>
                <TouchableOpacity
                  style={styles.categoryItemBtn}
                  onPress={() => {
                    setListItems((prev) => {
                      if (
                        prev.find(
                          (li) => normalize(li.name) === normalize(i.name),
                        )
                      )
                        return prev;
                      return [
                        {
                          id: i.id,
                          name: i.name,
                          categoryName: formatCategory(cat.name),
                          quantity: "",
                          specification: "",
                        },
                        ...prev,
                      ];
                    });
                  }}
                >
                  <Text>{i.name}</Text>
                </TouchableOpacity>

                <View style={styles.categoryItemActions}>
                  <TouchableOpacity
                    onPress={() =>
                      toggleFavorite({
                        id: i.id,
                        name: i.name,
                        categoryName: cat.name,
                      })
                    }
                  >
                    <Ionicons
                      name={isFav ? "heart" : "heart-outline"}
                      size={22}
                      color="red"
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => confirmDatabaseDelete(cat.id, i.id, i.name)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={[styles.removeBtn, { paddingHorizontal: 10 }]}>
                      ✕
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </Animated.View>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
        >
          <View style={styles.container}>
            {/* 1. FIXED HEADER */}
            <LinearGradient
              colors={["#eef4fe", "#2e4466"]}
              start={{ x: 1, y: 0 }}
              end={{ x: 0, y: 0 }}
              style={styles.header}
            >
              <TouchableOpacity
                onPress={() =>
                  router.canGoBack()
                    ? router.back()
                    : router.replace("/customerDashboard")
                }
              >
                <Ionicons name="chevron-back" size={28} color="#eef4fe" />
              </TouchableOpacity>
              <Text style={styles.headerTitleText}>Create Lists</Text>
            </LinearGradient>

            {/* NON-DECISION LAYOUT WARNING BANNER */}
            {fetchError && (
              <View
                style={{
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
                }}
              >
                <Ionicons name="alert-circle" size={20} color="#f97316" />
                <Text
                  style={{
                    color: "#c2410c",
                    fontSize: 14,
                    fontWeight: "500",
                    flex: 1,
                  }}
                >
                  Could not update local system configurations. Verify sync
                  settings.
                </Text>
              </View>
            )}

            {/* 2. THE MAIN SCROLLER */}
            <FlatList
              ref={listRef}
              data={listItems}
              keyExtractor={(item, index) =>
                item.id?.toString() || index.toString()
              }
              renderItem={renderItem}
              contentContainerStyle={{ paddingBottom: 220 }}
              keyboardShouldPersistTaps="handled"
              ListHeaderComponent={
                <View style={{ paddingBottom: 10 }}>
                  <TextInput
                    style={styles.input}
                    placeholder="List name"
                    value={listName}
                    onChangeText={setListName}
                  />

                  <View style={styles.row}>
                    <TouchableOpacity
                      style={styles.dbBtn}
                      onPress={() => {
                        setShowDB(!showDB);
                        setShowFav(false);
                        setFinalizedData(null);
                        setExpandedCategoryId(null);
                      }}
                    >
                      <Text style={styles.buttonText}>Database</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.favBtn}
                      onPress={() => {
                        setShowFav(!showFav);
                        setShowDB(false);
                        setFinalizedData(null);
                      }}
                    >
                      <Text style={styles.buttonText}>Favorites</Text>
                    </TouchableOpacity>
                  </View>

                  <TextInput
                    style={styles.input}
                    placeholder="Item"
                    value={name}
                    onChangeText={setName}
                  />

                  {name.trim().length > 0 && filteredItems.length > 0 && (
                    <View style={styles.recommendationContainer}>
                      <FlatList
                        data={filteredItems}
                        keyExtractor={(item) => item.id.toString()}
                        style={styles.suggestionList}
                        keyboardShouldPersistTaps="handled"
                        nestedScrollEnabled={true}
                        renderItem={({ item }) => (
                          <TouchableOpacity
                            style={styles.suggestionItem}
                            onPress={() => {
                              setName(item.name);
                              setCategory(formatCategory(item.categoryName));
                              setFilteredItems([]);
                            }}
                          >
                            <Text style={styles.suggestionText}>
                              {item.name}{" "}
                              <Text style={{ color: "#666" }}>
                                ({formatCategory(item.categoryName)})
                              </Text>
                            </Text>
                          </TouchableOpacity>
                        )}
                      />
                    </View>
                  )}

                  <TextInput
                    style={styles.input}
                    placeholder="Quantity"
                    value={quantity}
                    onChangeText={setQuantity}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Specification"
                    value={spec}
                    onChangeText={setSpec}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Category"
                    value={category}
                    onChangeText={setCategory}
                  />

                  <TouchableOpacity style={styles.addBtn} onPress={addItem}>
                    <Text style={styles.buttonText}>Add Item</Text>
                  </TouchableOpacity>

                  {listItems.length > 0 && (
                    <Text style={styles.sectionHeader}>Items in your list</Text>
                  )}
                </View>
              }
            />

            {/* 4. OVERLAY PANELS */}

            {/* DATABASE PANEL */}
            {showDB && (
              <View style={styles.panel}>
                <TouchableOpacity
                  onPress={() => {
                    setShowDB(false);
                    setDbSearch("");
                  }}
                  style={styles.panelCloseBtn}
                >
                  <Text style={styles.panelCloseText}>✕</Text>
                </TouchableOpacity>
                <TextInput
                  style={[
                    styles.input,
                    { marginHorizontal: 10, marginBottom: 10 },
                  ]}
                  placeholder="Search database..."
                  value={dbSearch}
                  onChangeText={setDbSearch}
                />

                {dbSearch.length > 0 && filteredDatabase.length === 0 && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: "#fff7ed",
                      borderColor: "#fed7aa",
                      borderWidth: 1,
                      borderRadius: 12,
                      padding: 12,
                      marginHorizontal: 10,
                      marginBottom: 15,
                      gap: 10,
                    }}
                  >
                    <Ionicons name="search-outline" size={20} color="#f97316" />
                    <Text
                      style={{
                        color: "#c2410c",
                        fontSize: 14,
                        fontWeight: "500",
                        flex: 1,
                      }}
                    >
                      No configuration profiles match data text "{dbSearch}".
                    </Text>
                  </View>
                )}

                <FlatList
                  data={filteredDatabase}
                  keyExtractor={(cat) => cat.id.toString()}
                  renderItem={renderCategoryItem}
                  nestedScrollEnabled
                  ListEmptyComponent={
                    dbSearch.length === 0 ? (
                      <Text
                        style={{
                          textAlign: "center",
                          color: "gray",
                          marginTop: 20,
                        }}
                      >
                        No items found
                      </Text>
                    ) : null
                  }
                />
              </View>
            )}

            {/* FAVORITES PANEL */}
            {showFav && (
              <View style={styles.panel}>
                <TouchableOpacity
                  onPress={() => setShowFav(false)}
                  style={styles.panelCloseBtn}
                >
                  <Text style={styles.panelCloseText}>✕</Text>
                </TouchableOpacity>
                <ScrollView nestedScrollEnabled={true}>
                  {Object.entries(
                    favorites.reduce((acc, f) => {
                      const cat = formatCategory(
                        f.item?.category?.name || "Uncategorized",
                      );
                      if (!acc[cat]) acc[cat] = [];
                      acc[cat].push(f.item);
                      return acc;
                    }, {}),
                  ).map(([categoryName, items]) => (
                    <View key={categoryName} style={{ marginBottom: 12 }}>
                      <Text style={styles.favPanelTitle}>{categoryName}</Text>
                      {items.map((item) => (
                        <View key={item.id} style={styles.favItemRow}>
                          <TouchableOpacity
                            style={styles.categoryItemBtn}
                            onPress={() => {
                              setListItems((prev) => {
                                if (
                                  prev.find(
                                    (li) =>
                                      normalize(li.name) ===
                                      normalize(item.name),
                                  )
                                )
                                  return prev;
                                return [
                                  {
                                    id: item.id,
                                    name: item.name,
                                    categoryName: categoryName,
                                    quantity: "",
                                    specification: "",
                                  },
                                  ...prev,
                                ];
                              });
                            }}
                          >
                            <Text style={styles.favItemText}>{item.name}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => toggleFavorite(item)}
                          >
                            <Text style={styles.removeBtn}>✕</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* FINALIZED LIST PANEL */}
            {finalizedData && (
              <View style={[styles.panel, { padding: 12 }]}>
                <TouchableOpacity
                  onPress={() => setFinalizedData(null)}
                  style={styles.panelCloseBtn}
                >
                  <Text style={styles.panelCloseText}>✕</Text>
                </TouchableOpacity>

                <FlatList
                  data={Object.keys(finalizedData)}
                  keyExtractor={(cat) => cat}
                  renderItem={({ item: cat }) => (
                    <View style={styles.finalPanelContainer}>
                      <Text style={styles.finalPanelCategory}>{cat}</Text>
                      {finalizedData[cat].map((i) => (
                        <View key={i.id} style={styles.finalPanelItemRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.finalPanelItemName}>
                              {i.name}
                            </Text>
                            <Text
                              style={{
                                fontSize: 12,
                                color: "#666",
                                marginTop: 2,
                              }}
                            >
                              Qty: {i.quantity || 1} | Spec:{" "}
                              {i.specification?.trim() || "None"}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                />

                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={() => {
                    if (!listName.trim()) {
                      return triggerWarning(
                        "Your list doesn't have a name. Please enter one at the top.",
                      );
                    }
                    if (listItems.length === 0) {
                      return triggerWarning(
                        "Your list is empty. Please add some items first.",
                      );
                    }
                    setShareModalVisible(true);
                  }}
                >
                  <Text style={styles.buttonText}>Share List</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* 5. INTERACTIVE DECISION OVERLAYS & MODALS */}

            {/* FLOATING ACTION TOAST */}
            {showWarningBox && (
              <View style={styles.warningBox}>
                <Ionicons name="alert-circle-outline" size={20} color="#fff" />
                <Text style={styles.warningText}>{warningMessage}</Text>
              </View>
            )}

            {/* DESTRUCTIVE MODAL: STRUCTURAL DATABASE REMOVAL */}
            <Modal
              animationType="fade"
              transparent
              visible={deleteModalVisible}
              onRequestClose={() => setDeleteModalVisible(false)}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalBox}>
                  <TouchableOpacity
                    onPress={() => setDeleteModalVisible(false)}
                    style={styles.closeCornerBtn}
                  >
                    <Text style={styles.closeX}>✕</Text>
                  </TouchableOpacity>

                  <Text style={[styles.modalTitle, { color: "#d45a3a" }]}>
                    Delete Item
                  </Text>
                  <Text style={styles.modalSubtitle}>
                    Are you sure you want to permanently delete "
                    {selectedItemToDelete.name}" from your custom database?
                  </Text>

                  <View style={styles.shareButtonsRow}>
                    <TouchableOpacity
                      style={[styles.friendBtn, { backgroundColor: "#e5e5e5" }]}
                      onPress={() => setDeleteModalVisible(false)}
                    >
                      <Text style={[styles.friendBtnText, { color: "#333" }]}>
                        Cancel
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.riderBtn, { backgroundColor: "#d45a3a" }]}
                      onPress={executeDatabaseDelete}
                    >
                      <Text style={styles.riderBtnText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>

            {/* CONSTRUCTIVE MODAL: WORKFLOW VALIDATION ROUTING */}
            <Modal
              animationType="fade"
              transparent
              visible={shareModalVisible}
              onRequestClose={() => setShareModalVisible(false)}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalBox}>
                  <TouchableOpacity
                    onPress={() => setShareModalVisible(false)}
                    style={styles.closeCornerBtn}
                  >
                    <Text style={styles.closeX}>✕</Text>
                  </TouchableOpacity>

                  <Text style={styles.modalTitle}>Share Active List</Text>
                  <Text style={styles.modalSubtitle}>
                    Are you ready to share your current list "{listName}" with
                    selected partners?
                  </Text>

                  <View style={styles.shareButtonsRow}>
                    <TouchableOpacity
                      style={[styles.friendBtn, { backgroundColor: "#e5e5e5" }]}
                      onPress={() => setShareModalVisible(false)}
                    >
                      <Text style={[styles.friendBtnText, { color: "#333" }]}>
                        Cancel
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.riderBtn, { backgroundColor: "#10b981" }]}
                      onPress={() => {
                        setShareModalVisible(false);
                        setFinalizedData(null);
                        router.push({
                          pathname: "/customerDashboard/cart",
                          params: {
                            items: JSON.stringify(listItems),
                            listName: listName,
                          },
                        });
                      }}
                    >
                      <Text style={styles.riderBtnText}>Proceed</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>
          </View>
        </KeyboardAvoidingView>

        <View style={styles.footerContainer}>
          <TouchableOpacity style={styles.saveBtn} onPress={saveList}>
            <Text style={styles.buttonText}>Save for Later</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.finalizeBtn} onPress={finalizeList}>
            <Text style={styles.buttonText}>Finalize & Share</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
