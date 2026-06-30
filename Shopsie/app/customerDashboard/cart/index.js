import React, { useEffect, useMemo, useRef, useState } from "react";
import { API_URLS } from "../../../src/services/apiConfig";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Platform,
  ActivityIndicator,
  TextInput,
  Alert,
  KeyboardAvoidingView,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { WebView } from "react-native-webview";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import * as Location from "expo-location";

// const API_BASE = "http://172.20.140.250:5000/api";
const API_BASE = API_URLS?.ROUTE_OPTIMIZE;

const DEFAULT_LAT = 31.5204;
const DEFAULT_LNG = 74.3587;
const SEARCH_RADIUS_KM = 10;
const DELIVERY_RATE_PER_KM = 50;

const normalizeSpec = (value) => {
  const spec = value?.toString().trim();
  return spec ? spec : "None";
};

const getSpecKeywords = (value) => {
  const spec = normalizeSpec(value);
  if (spec === "None") return [];
  return spec
    .toLowerCase()
    .split(/[\s,;/|+-]+/)
    .map((word) => word.trim())
    .filter(Boolean);
};

const buildItemKey = (item, index) =>
  `${item.name || ""}__${normalizeSpec(item.specification)}__${item.id || index}`;

const emptyLocation = (label) => ({
  lat: DEFAULT_LAT,
  lng: DEFAULT_LNG,
  label,
});

const formatCoords = (lat, lng) => {
  if (lat == null || lng == null) return "";
  return `Lat: ${Number(lat).toFixed(6)} | Lng: ${Number(lng).toFixed(6)}`;
};

const calculateDistanceKm = (fromLat, fromLng, toLat, toLng) => {
  if (
    [fromLat, fromLng, toLat, toLng].some(
      (value) => value == null || Number.isNaN(Number(value)),
    )
  ) {
    return 0;
  }

  const toRad = (value) => (Number(value) * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(toLat - fromLat);
  const dLng = toRad(toLng - fromLng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(fromLat)) *
      Math.cos(toRad(toLat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const parseShopTiming = (timing) => {
  const raw = timing?.toString().trim();
  if (!raw || raw === "No timings set")
    return { label: raw || "Shop timing not provided", isOpen: null };

  const normalized = raw.toLowerCase();
  const closedTodayWords = ["closed", "off"];
  if (closedTodayWords.some((word) => normalized.includes(word))) {
    return { label: raw, isOpen: false };
  }

  const timeMatch = normalized.match(
    /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:-|–|to)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/,
  );

  if (!timeMatch) return { label: raw, isOpen: null };

  const toMinutes = (hour, minute, meridian, fallbackMeridian) => {
    let h = Number(hour);
    const m = Number(minute || 0);
    const ampm = meridian || fallbackMeridian || "";
    if (ampm === "pm" && h < 12) h += 12;
    if (ampm === "am" && h === 12) h = 0;
    return h * 60 + m;
  };

  const start = toMinutes(
    timeMatch[1],
    timeMatch[2],
    timeMatch[3],
    timeMatch[6],
  );
  const end = toMinutes(timeMatch[4], timeMatch[5], timeMatch[6], timeMatch[3]);
  const now = new Date();
  const current = now.getHours() * 60 + now.getMinutes();
  const isOpen =
    start <= end
      ? current >= start && current <= end
      : current >= start || current <= end;

  return { label: raw, isOpen };
};

const getShopStatusText = (timing) => {
  const status = parseShopTiming(timing);
  if (status.isOpen === true) return `Open now | ${status.label}`;
  if (status.isOpen === false) return `Closed now | ${status.label}`;
  return status.label;
};

export default function Cart() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const flow = params?.flow || "normal";
  const isRequestRiderFlow = flow === "request_rider";
  const locationWebViewRef = useRef(null);
  const shopsWebViewRef = useRef(null);

  const [listName, setListName] = useState("My List");
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shopsLoading, setShopsLoading] = useState(false);

  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [locationMode, setLocationMode] = useState("buying");
  const [shopsMapModalVisible, setShopsMapModalVisible] = useState(false);
  const [shopItemsModalVisible, setShopItemsModalVisible] = useState(false);
  const [shopDetailsModalVisible, setShopDetailsModalVisible] = useState(false);
  const [itemDetailsModalVisible, setItemDetailsModalVisible] = useState(false);
  const [selectedSummaryModalVisible, setSelectedSummaryModalVisible] =
    useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [selectedShareType, setSelectedShareType] = useState("");
  const [warningMessage, setWarningMessage] = useState("");
  const [showWarningBox, setShowWarningBox] = useState(false);

  const [selectedLocation, setSelectedLocation] = useState(
    emptyLocation("No buying location selected"),
  );
  const [deliveryLocation, setDeliveryLocation] = useState(
    emptyLocation("No delivery location selected"),
  );
  const [locationChosen, setLocationChosen] = useState(false);
  const [deliveryLocationChosen, setDeliveryLocationChosen] = useState(false);
  const [locationSearch, setLocationSearch] = useState("");

  const [nearbyShops, setNearbyShops] = useState([]);
  const [selectedShop, setSelectedShop] = useState(null);
  const [detailsShop, setDetailsShop] = useState(null);
  const [detailsItem, setDetailsItem] = useState(null);
  const [selectedItemsByKey, setSelectedItemsByKey] = useState({});
  const [activeCategoryFilter, setActiveCategoryFilter] = useState("ALL");
  const [finalized, setFinalized] = useState(false);

  const activeLocation =
    locationMode === "delivery" ? deliveryLocation : selectedLocation;
  const activeLocationChosen =
    locationMode === "delivery" ? deliveryLocationChosen : locationChosen;
  const activeLocationTitle =
    locationMode === "delivery"
      ? "Choose Delivery Location"
      : "Choose Location To Buy Items From";

  const triggerWarning = (msg) => {
    setWarningMessage(msg);
    setShowWarningBox(true);
    setTimeout(() => setShowWarningBox(false), 2600);
  };

  useEffect(() => {
    setListName(params.listName || "My List");

    try {
      const parsed = params.items ? JSON.parse(params.items) : [];
      const cleaned = parsed.map((item, index) => ({
        ...item,
        itemKey: buildItemKey(item, index),
        name: item.name,
        quantity: Number(item.quantity || 1),
        specification: normalizeSpec(item.specification),
        specKeywords: getSpecKeywords(item.specification),
        categoryName: item.categoryName || item.category || "Uncategorized",
      }));
      setCartItems(cleaned);
    } catch (e) {
      triggerWarning("Could not read cart items.");
    } finally {
      setLoading(false);
    }
  }, [params.items, params.listName]);

  useEffect(() => {
    fetchCurrentLocation();
  }, []);

  useEffect(() => {
    if (!locationModalVisible) return;

    const messageObj = {
      type: "UPDATE_LOCATION",
      lat: activeLocation.lat,
      lng: activeLocation.lng,
    };

    if (Platform.OS === "web") {
      const iframe = document.getElementById("cart-location-map");
      iframe?.contentWindow?.postMessage(JSON.stringify(messageObj), "*");
    } else if (locationWebViewRef.current) {
      const jsCode = `
        window.dispatchEvent(new MessageEvent('message', {
          data: ${JSON.stringify(JSON.stringify(messageObj))}
        }));
      `;
      locationWebViewRef.current.injectJavaScript(jsCode);
    }
  }, [activeLocation.lat, activeLocation.lng, locationModalVisible]);

  useEffect(() => {
    if (Platform.OS !== "web") return;

    const handleWebMessage = (event) => {
      try {
        const payload =
          typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        handleAnyMapMessage(payload);
      } catch (e) {}
    };

    window.addEventListener("message", handleWebMessage);
    return () => window.removeEventListener("message", handleWebMessage);
  }, [nearbyShops, locationMode]);

  const fetchCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setSelectedLocation({
        lat: current.coords.latitude,
        lng: current.coords.longitude,
        label: "Current location",
      });
      setDeliveryLocation({
        lat: current.coords.latitude,
        lng: current.coords.longitude,
        label: "Current location",
      });
    } catch (e) {
      console.log("Location skipped:", e.message);
    }
  };

  const setActiveLocation = (next) => {
    if (locationMode === "delivery") setDeliveryLocation(next);
    else setSelectedLocation(next);
  };

  const openLocationPicker = (mode) => {
    setLocationMode(mode);
    setLocationSearch("");
    setLocationModalVisible(true);
  };

  const searchLocation = async () => {
    const query = locationSearch.trim();

    if (!query) {
      return triggerWarning("Type a location name first.");
    }

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`,
        {
          headers: {
            Accept: "application/json",
            "User-Agent": "ShopsieApp/1.0",
          },
        },
      );

      const data = await res.json();

      if (!data?.length) {
        return triggerWarning("No matching location found.");
      }

      const lat = Number(data[0].lat);
      const lng = Number(data[0].lon);
      const label = data[0].display_name || query;

      setActiveLocation({
        lat,
        lng,
        label,
      });

      const messageObj = {
        type: "UPDATE_LOCATION",
        lat,
        lng,
      };

      if (Platform.OS === "web") {
        const iframe = document.getElementById("cart-location-map");

        iframe?.contentWindow?.postMessage(JSON.stringify(messageObj), "*");
      } else if (locationWebViewRef.current) {
        locationWebViewRef.current.injectJavaScript(`
        window.dispatchEvent(
          new MessageEvent('message', {
            data: '${JSON.stringify(messageObj)}'
          })
        );

        document.dispatchEvent(
          new MessageEvent('message', {
            data: '${JSON.stringify(messageObj)}'
          })
        );

        true;
      `);
      }
    } catch (e) {
      console.log(e);
      triggerWarning("Could not search location.");
    }
  };

  const getReadableLocationName = async (lat, lng, fallbackLabel) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&zoom=18&addressdetails=1`,
      );
      const data = await res.json();
      return data?.display_name || fallbackLabel;
    } catch (e) {
      return fallbackLabel;
    }
  };

  const handleAnyMapMessage = async (payload) => {
    if (payload?.type === "SHOP_SELECT" && payload.shopId) {
      const shop = nearbyShops.find(
        (s) => Number(s.shopId) === Number(payload.shopId),
      );
      if (shop) openShopItems(shop);
      return;
    }

    if (payload?.lat && payload?.lng) {
      const lat = Number(payload.lat);
      const lng = Number(payload.lng);
      const fallbackLabel =
        locationMode === "delivery"
          ? "Selected delivery location"
          : "Selected buying location";
      const label = await getReadableLocationName(lat, lng, fallbackLabel);

      setActiveLocation({ lat, lng, label });
    }
  };

  const handleLocationMapMessage = (event) => {
    try {
      const raw = Platform.OS === "web" ? event.data : event.nativeEvent.data;
      const payload = typeof raw === "string" ? JSON.parse(raw) : raw;
      handleAnyMapMessage(payload);
    } catch (e) {}
  };

  const handleShopsMapMessage = (event) => {
    try {
      const raw = Platform.OS === "web" ? event.data : event.nativeEvent.data;
      const payload = typeof raw === "string" ? JSON.parse(raw) : raw;
      handleAnyMapMessage(payload);
    } catch (e) {}
  };

  const confirmLocation = () => {
    if (locationMode === "delivery") {
      setDeliveryLocationChosen(true);
    } else {
      setLocationChosen(true);
      setNearbyShops([]);
      setSelectedItemsByKey({});
      setFinalized(false);
    }
    setLocationModalVisible(false);
  };

  const buildNearbyShopsFromItems = (itemsWithShops) => {
    const shopMap = new Map();

    itemsWithShops.forEach((item) => {
      item.options?.forEach((opt) => {
        const shopId = Number(opt.shopId);

        if (!shopMap.has(shopId)) {
          shopMap.set(shopId, {
            shopId,
            shopName: opt.shopName,
            latitude: Number(opt.latitude),
            longitude: Number(opt.longitude),
            shopPhone: opt.shopPhone || "",
            shopTiming: opt.shopTiming || "",
            shopDescription: opt.shopDescription || "",
            distanceKm: Number(opt.distanceKm || 0),
            items: [],
          });
        }

        const shop = shopMap.get(shopId);
        const alreadyAdded = shop.items.some(
          (existing) =>
            existing.itemKey === item.itemKey &&
            existing.productId === opt.productId,
        );

        if (!alreadyAdded) {
          shop.items.push({
            itemKey: item.itemKey,
            itemName: item.itemName,
            specification: item.specification,
            requestedSpecKeywords: getSpecKeywords(item.specification),
            categoryName: item.categoryName,
            requestedQuantity: item.requestedQuantity,
            productId: opt.productId,
            price: Number(opt.price || 0),
            availableQuantity: Number(opt.availableQuantity || 0),
            specs: opt.specs,
          });
        }
      });
    });

    return Array.from(shopMap.values()).sort((a, b) => {
      if (b.items.length !== a.items.length)
        return b.items.length - a.items.length;
      return Number(a.distanceKm || 0) - Number(b.distanceKm || 0);
    });
  };

  const loadRegisteredShopsAndOpenMap = async () => {
    if (!locationChosen) {
      openLocationPicker("buying");
      return triggerWarning("Choose a buying location first.");
    }

    if (cartItems.length === 0) return triggerWarning("Cart is empty.");

    try {
      setShopsLoading(true);
      setFinalized(false);

      const token = await AsyncStorage.getItem("token");
      const res = await axios.post(
        `${API_URLS.ROUTE_OPTIMIZE}/cart-options`,
        {
          items: cartItems.map((item) => ({
            ...item,
            specKeywords: getSpecKeywords(item.specification),
          })),
          userLat: selectedLocation.lat,
          userLng: selectedLocation.lng,
          maxDistanceKm: SEARCH_RADIUS_KM,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      const itemsWithShops = res.data?.itemsWithShops || [];
      const shops = buildNearbyShopsFromItems(itemsWithShops);
      const autoSelected = buildAutoSelectedItems(shops);

      setNearbyShops(shops);
      setSelectedItemsByKey(autoSelected);
      setShopsMapModalVisible(true);

      if (shops.length === 0) {
        triggerWarning(
          `No matching shops found within ${SEARCH_RADIUS_KM} km.`,
        );
      } else {
        const autoCount = Object.keys(autoSelected).length;
        triggerWarning(
          `Auto-selected best shops for ${autoCount} of ${cartItems.length} item(s).`,
        );
      }
    } catch (e) {
      console.log("Cart shop load error:", e.response?.data || e.message);
      Alert.alert(
        "Error",
        "Could not load registered shops for selected area.",
      );
    } finally {
      setShopsLoading(false);
    }
  };

  const openShopItems = (shop) => {
    setSelectedShop(shop);
    setShopItemsModalVisible(true);
  };

  const openShopDetails = (shop) => {
    setDetailsShop(shop);
    setShopDetailsModalVisible(true);
  };

  const openItemDetails = (item) => {
    setDetailsItem(item);
    setItemDetailsModalVisible(true);
  };

  const createAssignedItem = (shop, shopItem) => ({
    id: shopItem.itemKey,
    name: shopItem.itemName,
    quantity: Number(shopItem.requestedQuantity || 1),
    specification: normalizeSpec(shopItem.specification),
    categoryName: shopItem.categoryName || "Uncategorized",
    selectedShopId: shop.shopId,
    selectedShopName: shop.shopName,
    selectedShopPrice: Number(shopItem.price || 0),
    selectedShopLatitude: shop.latitude,
    selectedShopLongitude: shop.longitude,
    selectedShopPhone: shop.shopPhone || "",
    selectedShopTiming: shop.shopTiming || "",
    selectedShopDescription: shop.shopDescription || "",
    selectedShopStatusText: getShopStatusText(shop.shopTiming),
    availableQuantity: Number(shopItem.availableQuantity || 0),
    buyingLocationLat: selectedLocation.lat,
    buyingLocationLng: selectedLocation.lng,
    buyingLocationLabel: selectedLocation.label,
    deliveryLocationLat: deliveryLocationChosen ? deliveryLocation.lat : null,
    deliveryLocationLng: deliveryLocationChosen ? deliveryLocation.lng : null,
    deliveryLocationLabel: deliveryLocationChosen
      ? deliveryLocation.label
      : null,
    lineTotal:
      Number(shopItem.price || 0) *
      Math.min(
        Number(shopItem.requestedQuantity || 1),
        Number(shopItem.availableQuantity || 0),
      ),
  });

  const buildAutoSelectedItems = (shops) => {
    const shopCoverage = new Map();
    const candidatesByItem = new Map();

    shops.forEach((shop) => {
      const itemKeysInShop = new Set(shop.items.map((item) => item.itemKey));
      shopCoverage.set(shop.shopId, itemKeysInShop.size);

      shop.items.forEach((shopItem) => {
        if (Number(shopItem.availableQuantity || 0) <= 0) return;
        if (!candidatesByItem.has(shopItem.itemKey))
          candidatesByItem.set(shopItem.itemKey, []);
        candidatesByItem.get(shopItem.itemKey).push({ shop, shopItem });
      });
    });

    const selected = {};

    candidatesByItem.forEach((candidates, itemKey) => {
      const [best] = candidates.sort((a, b) => {
        const priceDiff =
          Number(a.shopItem.price || 0) - Number(b.shopItem.price || 0);
        if (priceDiff !== 0) return priceDiff;

        const coverageDiff =
          Number(shopCoverage.get(b.shop.shopId) || 0) -
          Number(shopCoverage.get(a.shop.shopId) || 0);
        if (coverageDiff !== 0) return coverageDiff;

        return Number(a.shop.distanceKm || 0) - Number(b.shop.distanceKm || 0);
      });

      if (best)
        selected[itemKey] = createAssignedItem(best.shop, best.shopItem);
    });

    return selected;
  };

  const assignItemToShop = (shopItem) => {
    const sourceShop = shopItem.shop || selectedShop;
    if (!sourceShop) return;

    setSelectedItemsByKey((prev) => ({
      ...prev,
      [shopItem.itemKey]: createAssignedItem(sourceShop, shopItem),
    }));

    setFinalized(false);
    triggerWarning(`${shopItem.itemName} selected from ${sourceShop.shopName}`);
  };

  const removeCartItem = (itemId) => {
    setCartItems((prev) => prev.filter((item) => item.itemKey !== itemId));
    setSelectedItemsByKey((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
    triggerWarning("Item removed from cart.");
  };

  const selectedCartItems = useMemo(() => {
    return cartItems.map((item) => {
      const assigned = selectedItemsByKey[item.itemKey];
      const baseLocation = {
        buyingLocationLat: selectedLocation.lat,
        buyingLocationLng: selectedLocation.lng,
        buyingLocationLabel: selectedLocation.label,
        deliveryLocationLat: deliveryLocationChosen
          ? deliveryLocation.lat
          : assigned?.deliveryLocationLat || null,
        deliveryLocationLng: deliveryLocationChosen
          ? deliveryLocation.lng
          : assigned?.deliveryLocationLng || null,
        deliveryLocationLabel: deliveryLocationChosen
          ? deliveryLocation.label
          : assigned?.deliveryLocationLabel || null,
      };
      if (assigned) return { ...assigned, ...baseLocation };

      return {
        id: item.itemKey,
        name: item.name,
        quantity: Number(item.quantity || 1),
        specification: normalizeSpec(item.specification),
        categoryName: item.categoryName || "Uncategorized",
        selectedShopId: null,
        selectedShopName: "",
        selectedShopPrice: 0,
        selectedShopLatitude: null,
        selectedShopLongitude: null,
        selectedShopPhone: "",
        selectedShopTiming: "",
        selectedShopDescription: "",
        selectedShopStatusText: "",
        availableQuantity: 0,
        ...baseLocation,
        lineTotal: 0,
      };
    });
  }, [
    cartItems,
    selectedItemsByKey,
    selectedLocation,
    deliveryLocation,
    deliveryLocationChosen,
  ]);

  const priceComparison = useMemo(() => {
    const comparisonMap = new Map();

    nearbyShops.forEach((shop) => {
      shop.items.forEach((shopItem) => {
        if (!comparisonMap.has(shopItem.itemKey)) {
          comparisonMap.set(shopItem.itemKey, {
            itemKey: shopItem.itemKey,
            itemName: shopItem.itemName,
            specification: shopItem.specification,
            categoryName: shopItem.categoryName,
            requestedQuantity: shopItem.requestedQuantity,
            options: [],
          });
        }

        comparisonMap.get(shopItem.itemKey).options.push({
          itemKey: shopItem.itemKey,
          itemName: shopItem.itemName,
          specification: shopItem.specification,
          requestedQuantity: shopItem.requestedQuantity,
          categoryName: shopItem.categoryName,
          productId: shopItem.productId,
          specs: shopItem.specs,
          shopId: shop.shopId,
          shopName: shop.shopName,
          latitude: shop.latitude,
          longitude: shop.longitude,
          distanceKm: shop.distanceKm,
          price: Number(shopItem.price || 0),
          availableQuantity: Number(shopItem.availableQuantity || 0),
          shop,
        });
      });
    });

    return Array.from(comparisonMap.values()).map((item) => ({
      ...item,
      options: item.options.sort((a, b) => {
        if (a.price !== b.price) return a.price - b.price;
        return Number(a.distanceKm || 0) - Number(b.distanceKm || 0);
      }),
    }));
  }, [nearbyShops]);
  const categoryFilters = useMemo(() => {
    const categories = new Set(
      priceComparison.map((item) => item.categoryName).filter(Boolean),
    );
    return ["ALL", ...Array.from(categories)];
  }, [priceComparison]);
  const filteredPriceComparison = useMemo(() => {
    if (activeCategoryFilter === "ALL") return priceComparison;
    return priceComparison.filter(
      (item) => item.categoryName === activeCategoryFilter,
    );
  }, [activeCategoryFilter, priceComparison]);

  const total = selectedCartItems.reduce(
    (sum, item) => sum + Number(item.lineTotal || 0),
    0,
  );
  const selectedUniqueShops = useMemo(() => {
    const shopMap = new Map();
    selectedCartItems.forEach((item) => {
      if (!item.selectedShopId || shopMap.has(item.selectedShopId)) return;
      const sourceShop = nearbyShops.find(
        (shop) => shop.shopId === item.selectedShopId,
      );
      shopMap.set(item.selectedShopId, {
        shopId: item.selectedShopId,
        shopName: item.selectedShopName,
        latitude: item.selectedShopLatitude,
        longitude: item.selectedShopLongitude,
        distanceKm: Number(sourceShop?.distanceKm || 0),
      });
    });
    return Array.from(shopMap.values());
  }, [nearbyShops, selectedCartItems]);
  const shopsDistanceKm = selectedUniqueShops.reduce(
    (sum, shop) => sum + Number(shop.distanceKm || 0),
    0,
  );
  const deliveryDistanceKm = deliveryLocationChosen
    ? calculateDistanceKm(
        selectedLocation.lat,
        selectedLocation.lng,
        deliveryLocation.lat,
        deliveryLocation.lng,
      )
    : 0;
  const payableDistanceKm = shopsDistanceKm + deliveryDistanceKm;
  const deliveryCharges = Math.ceil(payableDistanceKm) * DELIVERY_RATE_PER_KM;
  const grandTotal = total + deliveryCharges;
  const selectedCount = selectedCartItems.filter(
    (item) => item.selectedShopId,
  ).length;
  const pendingCount = Math.max(cartItems.length - selectedCount, 0);

  const handleFinalize = () => {
    if (!locationChosen)
      return triggerWarning("Choose a buying location first.");
    if (nearbyShops.length === 0)
      return triggerWarning("Open registered shops map first.");

    setFinalized(true);
    setShopsMapModalVisible(false);
  };

  const handleShareInitiation = (type) => {
    if (!locationChosen || !deliveryLocationChosen) {
      return triggerWarning(
        "First choose both buying location and delivery location.",
      );
    }
    if (!finalized) return triggerWarning("Finalize your cart first.");
    const missing = selectedCartItems.filter((item) => !item.selectedShopId);
    if (missing.length > 0) {
      return triggerWarning(
        `Remove or select shops for ${missing.length} item(s) before sharing.`,
      );
    }
    setSelectedShareType(type);
    setShareModalVisible(true);
  };

  const proceedShare = () => {
    const payload = JSON.stringify(selectedCartItems);
    setShareModalVisible(false);

    const commonParams = {
      items: payload,
      listName,
      source: "cart",
      buyingLocation: JSON.stringify(selectedLocation),
      deliveryLocation: JSON.stringify(deliveryLocation),
      pricingSummary: JSON.stringify({
        itemsTotal: total,
        distanceKm: payableDistanceKm,
        deliveryCharges,
        grandTotal,
        ratePerKm: DELIVERY_RATE_PER_KM,
      }),
      flow,
    };

    if (selectedShareType === "Friend" && isRequestRiderFlow) {
      triggerWarning("Friend sharing is disabled in Request Rider mode.");
      return;
    }

    if (selectedShareType === "Friend") {
      router.push({
        pathname: "/customerDashboard/friends",
        params: commonParams,
      });
      return;
    }

    router.push({
      pathname: "/customerDashboard/select-rider",
      params: {
        listId: 0,
        listType: "cart",
        listName,
        items: payload,
        buyingLocationLat: selectedLocation.lat,
        buyingLocationLng: selectedLocation.lng,
        buyingLocationLabel: selectedLocation.label,
        deliveryLocationLat: deliveryLocation.lat,
        deliveryLocationLng: deliveryLocation.lng,
        deliveryLocationLabel: deliveryLocation.label,
        pricingSummary: commonParams.pricingSummary,
        itemsTotal: total,
        deliveryCharges,
        grandTotal,
        distanceKm: payableDistanceKm,
        flow,
      },
    });
  };

  const locationMapHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        body, html, #map { margin:0; padding:0; height:100%; width:100%; background:#e2e8f0; }
        .leaflet-attribution-flag { display:none !important; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map', { zoomControl: true }).setView([${activeLocation.lat}, ${activeLocation.lng}], 14);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
        var marker = L.marker([${activeLocation.lat}, ${activeLocation.lng}], { draggable: true }).addTo(map);
        marker.bindPopup("<b>Drag pin to selected area</b>").openPopup();

        function sendCoords(lat, lng) {
          var payload = JSON.stringify({ lat: lat, lng: lng });
          if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(payload);
          else window.parent.postMessage(payload, "*");
        }

        marker.on('dragend', function() {
          var pos = marker.getLatLng();
          sendCoords(pos.lat, pos.lng);
        });

        map.on('click', function(e) {
          marker.setLatLng(e.latlng);
          sendCoords(e.latlng.lat, e.latlng.lng);
        });
        function updateMarker(data) {
  if (data.type === "UPDATE_LOCATION") {
    var ll = new L.LatLng(data.lat, data.lng);

    marker.setLatLng(ll);

    map.flyTo(ll, 16, {
      animate: true,
      duration: 1.2
    });
  }
}

window.addEventListener("message", function(e) {
  try {
    var data =
      typeof e.data === "string"
        ? JSON.parse(e.data)
        : e.data;

    updateMarker(data);
  } catch(err) {}
});

document.addEventListener("message", function(e) {
  try {
    var data =
      typeof e.data === "string"
        ? JSON.parse(e.data)
        : e.data;

    updateMarker(data);
  } catch(err) {}
});

        
      </script>
    </body>
    </html>
  `;

  const shopsMapHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        body, html, #map { margin:0; padding:0; height:100%; width:100%; background:#e2e8f0; }
        .leaflet-attribution-flag { display:none !important; }
        .shop-popup { font-family: Arial, sans-serif; min-width: 190px; }
        .shop-popup b { color: #1e293b; }
        .shop-popup button { margin-top: 8px; background: #2e4466; color: white; border: 0; border-radius: 8px; padding: 7px 10px; font-weight: 700; }
        .shop-label { background: #ffffff; border: 1px solid #2e4466; border-radius: 8px; color: #1e293b; font-size: 11px; font-weight: 800; padding: 3px 7px; box-shadow: 0 2px 8px rgba(15, 23, 42, 0.18); }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var selectedArea = ${JSON.stringify(selectedLocation)};
        var shops = ${JSON.stringify(nearbyShops)};
        var radiusKm = ${SEARCH_RADIUS_KM};

        var map = L.map('map', { zoomControl: true }).setView([selectedArea.lat, selectedArea.lng], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

        var allMarkers = L.featureGroup().addTo(map);
        L.circle([selectedArea.lat, selectedArea.lng], {
          radius: radiusKm * 1000,
          color: '#2e4466',
          fillColor: '#93c5fd',
          fillOpacity: 0.14,
          weight: 2
        }).addTo(allMarkers);

        L.marker([selectedArea.lat, selectedArea.lng]).addTo(allMarkers).bindPopup('<b>Selected buying area</b>');

        function sendShop(shopId) {
          var payload = JSON.stringify({ type: 'SHOP_SELECT', shopId: shopId });
          if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(payload);
          else window.parent.postMessage(payload, '*');
        }

        shops.forEach(function(shop) {
          var itemLines = shop.items.slice(0, 4).map(function(i) {
            return i.itemName + ' | Requested: ' + i.specification + ' | Shop: ' + i.specs + ' | Rs. ' + i.price;
          }).join('<br/>');

          var html = '<div class="shop-popup"><b>' + shop.shopName + '</b><br/>' +
            shop.distanceKm + ' km away<br/>' +
            'Timing: ' + (shop.shopTiming || 'No timings set') + '<br/>' +
            itemLines +
            '<br/><button onclick="window.__selectShop(' + shop.shopId + ')">Select shop</button></div>';

          L.marker([shop.latitude, shop.longitude])
            .addTo(allMarkers)
            .bindTooltip(shop.shopName, {
              permanent: true,
              direction: 'top',
              offset: [0, -28],
              className: 'shop-label'
            })
            .bindPopup(html);
        });

        window.__selectShop = sendShop;

        if (shops.length > 0) {
          map.fitBounds(allMarkers.getBounds(), { padding: [30, 30] });
        }
      </script>
    </body>
    </html>
  `;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2e4466" />
        <Text style={styles.loaderText}>Preparing cart...</Text>
      </View>
    );
  }

  const renderLocationCard = ({ title, chosen, location, icon, onPress }) => (
    <View style={styles.locationCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.locationBox}>
        <Ionicons
          name={chosen ? "location" : "location-outline"}
          size={20}
          color="#2e4466"
        />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.locationText} numberOfLines={2}>
            {location.label}
          </Text>
          <Text style={styles.coordsText}>
            {formatCoords(location.lat, location.lng)}
          </Text>
        </View>
      </View>
      <TouchableOpacity style={styles.primaryBtn} onPress={onPress}>
        <Ionicons name={icon} size={18} color="#fff" />
        <Text style={styles.primaryBtnText}>Choose Location</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={styles.mainContainer}>
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
          <Text style={styles.headerTitleText} numberOfLines={1}>
            {listName}
          </Text>
          <View style={{ width: 28 }} />
        </LinearGradient>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.sectionCard}>
            {renderLocationCard({
              title: "Choose Location To Buy Items From",
              chosen: locationChosen,
              location: selectedLocation,
              icon: "map-outline",
              onPress: () => openLocationPicker("buying"),
            })}

            {locationChosen && (
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={loadRegisteredShopsAndOpenMap}
                disabled={shopsLoading}
              >
                {shopsLoading ? (
                  <ActivityIndicator color="#2e4466" />
                ) : (
                  <>
                    <Ionicons
                      name="storefront-outline"
                      size={18}
                      color="#2e4466"
                    />
                    <Text style={styles.secondaryBtnText}>
                      Select Registered Shops Within {SEARCH_RADIUS_KM} km
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          {!finalized && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Your Items</Text>
                <Text style={styles.countBadge}>
                  {selectedCount}/{cartItems.length}
                </Text>
              </View>

              {selectedCartItems.map((item, index) => (
                <View key={item.id || index} style={styles.cartItemRow}>
                  {/* Item Title */}
                  <Text style={styles.itemName}>{item.name}</Text>

                  {/* Category */}
                  <View style={styles.itemDetailRow}>
                    <Ionicons
                      name="pricetag-outline"
                      size={14}
                      color="#1e293b"
                      style={styles.detailIcon}
                    />
                    <Text style={styles.detailText}>{item.categoryName}</Text>
                  </View>

                  {/* Quantity */}
                  <View style={styles.itemDetailRow}>
                    <Ionicons
                      name="cube-outline"
                      size={14}
                      color="#1e293b"
                      style={styles.detailIcon}
                    />
                    <Text style={styles.detailText}>Qty: {item.quantity}</Text>
                  </View>

                  {/* Specification */}
                  <View style={styles.itemDetailRow}>
                    <Ionicons
                      name="list-outline"
                      size={14}
                      color="#1e293b"
                      style={styles.detailIcon}
                    />
                    <Text style={styles.detailText}>
                      Spec: {item.specification || "None"}
                    </Text>
                  </View>

                  {/* Dynamic Footer Status */}
                  {item.selectedShopId ? (
                    <View style={styles.shopStatusBlock}>
                      <View style={styles.checkIconWrapper}>
                        <Ionicons name="checkbox" size={16} color="#10b981" />
                      </View>
                      <View style={styles.shopInfoColumn}>
                        <Text style={styles.shopNameText}>
                          {item.selectedShopName}
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <Text style={styles.notSelectedText}>
                      No shop selected yet
                    </Text>
                  )}
                </View>
              ))}

              {selectedCount > 0 && (
                <TouchableOpacity
                  style={styles.finalizeBtn}
                  onPress={handleFinalize}
                >
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={19}
                    color="#fff"
                  />
                  <Text style={styles.primaryBtnText}>Finalize Cart</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {finalized && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Final Cart</Text>
                <Text style={styles.countBadge}>
                  {selectedCount}/{cartItems.length}
                </Text>
              </View>

              {selectedCartItems.map((item, index) => (
                <View key={item.id || index} style={styles.finalRow}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.compactItemHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemName}>{item.name}</Text>
                        <View style={styles.finalItemDetails}>
                          {/* Category */}
                          <View style={styles.itemDetailRow}>
                            <Ionicons
                              name="pricetag-outline"
                              size={14}
                              color="#1e293b"
                              style={styles.detailIcon}
                            />
                            <Text style={styles.itemDetailText}>
                              {item.categoryName}
                            </Text>
                          </View>

                          {/* Quantity */}
                          <View style={styles.itemDetailRow}>
                            <Ionicons
                              name="cube-outline"
                              size={14}
                              color="#1e293b"
                              style={styles.detailIcon}
                            />
                            <Text style={styles.itemDetailText}>
                              Qty: {item.quantity}
                            </Text>
                          </View>

                          {/* Specification */}
                          <View style={styles.itemDetailRow}>
                            <Ionicons
                              name="list-outline"
                              size={14}
                              color="#1e293b"
                              style={styles.detailIcon}
                            />
                            <Text style={styles.itemDetailText}>
                              Spec: {item.specification || "None"}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                    {item.selectedShopId ? (
                      <View style={styles.finalShopLine}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.selectedShopText}>
                            {item.selectedShopName}
                          </Text>
                        </View>
                        <Text style={styles.priceText}>
                          Rs. {item.lineTotal}
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.notSelectedText}>
                        No shop selected yet
                      </Text>
                    )}
                  </View>
                  <View style={styles.finalActionColumn}>
                    <TouchableOpacity
                      style={styles.removePlainBtn}
                      onPress={() => removeCartItem(item.id)}
                      hitSlop={8}
                    >
                      <Text style={styles.removePlainText}>x</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Items Total</Text>
                <Text style={styles.totalPrice}>Rs. {total}</Text>
              </View>

              {renderLocationCard({
                title: "Delivery Location",
                chosen: deliveryLocationChosen,
                location: deliveryLocation,
                icon: "navigate-outline",
                onPress: () => openLocationPicker("delivery"),
              })}

              <View style={styles.billSummaryCard}>
                <Text style={styles.billSummaryTitle}>Order Total</Text>
                <View style={styles.billLine}>
                  <Text style={styles.billLabel}>Selected item prices</Text>
                  <Text style={styles.billValue}>Rs. {total}</Text>
                </View>
                <View style={styles.billLine}>
                  <Text style={styles.billLabel}>
                    Distance used for charges
                  </Text>
                  <Text style={styles.billValue}>
                    {payableDistanceKm.toFixed(2)} km
                  </Text>
                </View>
                <View style={styles.billLine}>
                  <Text style={styles.billLabel}>
                    Delivery charges ({DELIVERY_RATE_PER_KM} Rs/km)
                  </Text>
                  <Text style={styles.billValue}>Rs. {deliveryCharges}</Text>
                </View>
                <View style={styles.grandTotalRow}>
                  <Text style={styles.grandTotalLabel}>Grand Total</Text>
                  <Text style={styles.grandTotalPrice}>Rs. {grandTotal}</Text>
                </View>
              </View>

              <View style={styles.shareRow}>
                {/* FRIEND BUTTON (HIDE IN request_rider FLOW) */}
                {!isRequestRiderFlow && (
                  <TouchableOpacity
                    style={[styles.shareBtn, styles.shareFriendBtn]}
                    onPress={() => handleShareInitiation("Friend")}
                  >
                    <Ionicons name="people" size={18} color="#2e4466" />
                    <Text style={styles.shareFriendText}>
                      Share with Friend
                    </Text>
                  </TouchableOpacity>
                )}

                {/* RIDER BUTTON (ALWAYS SHOWN) */}
                <TouchableOpacity
                  style={[styles.shareBtn, styles.shareRiderBtn]}
                  onPress={() => handleShareInitiation("Rider")}
                >
                  <Ionicons name="bicycle" size={18} color="#fff" />
                  <Text style={styles.shareRiderText}>Share with Rider</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.bottomNav}>
          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => router.replace("/customerDashboard")}
          >
            <Ionicons name="home-outline" size={22} color="white" />
            <Text style={styles.navText}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => router.replace("/customerDashboard/savedlist")}
          >
            <MaterialCommunityIcons
              name="format-list-bulleted"
              size={22}
              color="white"
            />
            <Text style={styles.navText}>Saved Lists</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => router.push("/customerDashboard/inbox")}
          >
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={22}
              color="white"
            />
            <Text style={styles.navText}>Inbox</Text>
          </TouchableOpacity>
        </View>

        <Modal
          visible={locationModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setLocationModalVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ flex: 1 }}
          >
            <View style={styles.fullModalOverlay}>
              <View style={styles.locationModalBox}>
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.modalHeaderRow}>
                    <Text style={styles.modalTitle}>{activeLocationTitle}</Text>
                    <TouchableOpacity
                      onPress={() => setLocationModalVisible(false)}
                    >
                      <Ionicons name="close-circle" size={28} color="#94a3b8" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.searchRow}>
                    <TextInput
                      value={locationSearch}
                      onChangeText={setLocationSearch}
                      placeholder={
                        locationMode === "delivery"
                          ? "Search delivery location"
                          : "Search location, e.g. DHA Phase 6"
                      }
                      placeholderTextColor="#94a3b8"
                      style={styles.locationInput}
                    />
                    <TouchableOpacity
                      style={styles.searchBtn}
                      onPress={searchLocation}
                    >
                      <Ionicons name="search" size={20} color="#fff" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.mapBox}>
                    {Platform.OS === "web" ? (
                      <iframe
                        id="cart-location-map"
                        srcDoc={locationMapHtml}
                        style={{
                          width: "100%",
                          height: "100%",
                          border: "none",
                        }}
                        title="Cart Location Map"
                      />
                    ) : (
                      <WebView
                        ref={locationWebViewRef}
                        originWhitelist={["*"]}
                        source={{ html: locationMapHtml }}
                        onMessage={handleLocationMapMessage}
                        javaScriptEnabled
                        domStorageEnabled
                        style={styles.map}
                      />
                    )}
                  </View>

                  <Text style={styles.locationDetailText}>
                    {activeLocation.label}
                  </Text>
                  <Text style={styles.coordsText}>
                    {formatCoords(activeLocation.lat, activeLocation.lng)}
                  </Text>
                </ScrollView>
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={confirmLocation}
                >
                  <Text style={styles.primaryBtnText}>
                    {activeLocationChosen ? "Update Location" : "Done"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        <Modal
          visible={shopsMapModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setShopsMapModalVisible(false)}
        >
          <View style={styles.fullModalOverlay}>
            <View style={styles.shopMapModalBox}>
              <View style={styles.modalHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>Select Registered Shop</Text>
                  <Text style={styles.metaText}>
                    Showing shops within {SEARCH_RADIUS_KM} km of selected
                    buying area
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.selectionSummaryBtn}
                  onPress={() => setSelectedSummaryModalVisible(true)}
                >
                  <Ionicons name="receipt-outline" size={16} color="#2e4466" />
                  <Text style={styles.selectionSummaryText}>
                    {selectedCount}/{cartItems.length}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShopsMapModalVisible(false)}
                >
                  <Ionicons name="close-circle" size={28} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <View style={styles.shopMapBox}>
                {Platform.OS === "web" ? (
                  <iframe
                    id="cart-shops-map"
                    srcDoc={shopsMapHtml}
                    style={{ width: "100%", height: "100%", border: "none" }}
                    title="Registered Shops Map"
                  />
                ) : (
                  <WebView
                    ref={shopsWebViewRef}
                    originWhitelist={["*"]}
                    source={{ html: shopsMapHtml }}
                    onMessage={handleShopsMapMessage}
                    javaScriptEnabled
                    domStorageEnabled
                    style={styles.map}
                  />
                )}
              </View>

              <ScrollView
                style={styles.shopSideBox}
                showsVerticalScrollIndicator={false}
              >
                {nearbyShops.length === 0 ? (
                  <Text style={styles.emptyText}>
                    No matching shops found in this area.
                  </Text>
                ) : (
                  <>
                    <Text style={styles.comparisonHeading}>
                      Compare & Pick Your Shop
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.categoryFilterRow}
                    >
                      {categoryFilters.map((category) => {
                        const isActive = activeCategoryFilter === category;
                        return (
                          <TouchableOpacity
                            key={category}
                            style={[
                              styles.categoryFilterPill,
                              isActive && styles.activeCategoryFilterPill,
                            ]}
                            onPress={() => setActiveCategoryFilter(category)}
                          >
                            <Text
                              style={[
                                styles.categoryFilterText,
                                isActive && styles.activeCategoryFilterText,
                              ]}
                            >
                              {category.toUpperCase()}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                    <Text style={styles.comparisonSubHeading}>
                      Selected {selectedCount} item(s), {pendingCount} left
                    </Text>
                    {filteredPriceComparison.map((item) => (
                      <View key={item.itemKey} style={styles.comparisonBlock}>
                        <View style={styles.comparisonItemHeader}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.comparisonItemName}>
                              Item: {item.itemName}
                            </Text>
                            <Text style={styles.metaText}>
                              Spec: {item.specification} | Qty:{" "}
                              {item.requestedQuantity}
                            </Text>
                          </View>
                          <Text style={styles.categoryPill}>
                            {item.categoryName}
                          </Text>
                        </View>

                        {item.options.map((option, index) => {
                          const alreadySelected =
                            selectedItemsByKey[item.itemKey]?.selectedShopId ===
                            option.shopId;

                          return (
                            <TouchableOpacity
                              key={`${item.itemKey}-${option.shopId}-${index}`}
                              style={[
                                styles.comparisonOption,
                                alreadySelected &&
                                  styles.activeComparisonOption,
                              ]}
                              onPress={() => assignItemToShop(option)}
                            >
                              <View style={styles.radioCircle}>
                                {alreadySelected && (
                                  <View style={styles.radioDot} />
                                )}
                              </View>
                              <View style={styles.comparisonOptionText}>
                                <Text style={styles.shopName}>
                                  {option.shopName}{" "}
                                  {index === 0 && (
                                    <Text style={styles.cheapestText}>
                                      (Cheapest)
                                    </Text>
                                  )}
                                </Text>
                                {alreadySelected && (
                                  <Text style={styles.autoSelectedText}>
                                    Selected for this item
                                  </Text>
                                )}
                                <Text style={styles.comparisonMetaText}>
                                  Specs: {option.specs || "None"}
                                </Text>
                              </View>
                              <View style={styles.optionActionColumn}>
                                <TouchableOpacity
                                  style={styles.shopDetailsBtn}
                                  onPress={(event) => {
                                    event?.stopPropagation?.();
                                    openShopDetails(option.shop);
                                  }}
                                >
                                  <Text style={styles.shopDetailsText}>
                                    Shop Details
                                  </Text>
                                </TouchableOpacity>
                                <Text style={styles.comparisonPrice}>
                                  Rs. {option.price}
                                </Text>
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    ))}
                  </>
                )}
              </ScrollView>

              {selectedCount > 0 && (
                <TouchableOpacity
                  style={styles.finalizeBtn}
                  onPress={handleFinalize}
                >
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={19}
                    color="#fff"
                  />
                  <Text style={styles.primaryBtnText}>Finalize Cart</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Modal>

        <Modal
          visible={selectedSummaryModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedSummaryModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalBoxLarge}>
              <View style={styles.modalHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>Selected Shops Summary</Text>
                  <Text style={styles.metaText}>
                    Selected {selectedCount} of {cartItems.length} item(s)
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setSelectedSummaryModalVisible(false)}
                >
                  <Ionicons name="close-circle" size={28} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.summaryListBox}
                showsVerticalScrollIndicator={false}
              >
                {selectedCartItems.map((item, index) => (
                  <View
                    key={item.id || index}
                    style={[
                      styles.summaryItemRow,
                      item.selectedShopId && styles.summaryItemSelected,
                    ]}
                  >
                    <View style={styles.summaryItemHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.summaryItemName}>{item.name}</Text>
                        <Text style={styles.summaryMeta}>
                          Qty: {item.quantity} | Spec: {item.specification}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.summaryStatusPill,
                          item.selectedShopId
                            ? styles.summarySelectedPill
                            : styles.summaryPendingPill,
                        ]}
                      >
                        {item.selectedShopId ? "Selected" : "Left"}
                      </Text>
                    </View>

                    {item.selectedShopId ? (
                      <>
                        <Text style={styles.summaryShopText}>
                          {item.selectedShopName}
                        </Text>
                        <Text style={styles.summaryMeta}>
                          Price: Rs. {item.selectedShopPrice} | Total: Rs.{" "}
                          {item.lineTotal}
                        </Text>
                        {/* <Text style={styles.summaryMeta}>{item.selectedShopStatusText}</Text>
                      <Text style={styles.summaryMeta}>Shop Location: {item.selectedShopLatitude}, {item.selectedShopLongitude}</Text>
                      <Text style={styles.summaryMeta}>Buying Area: {item.buyingLocationLabel}</Text> */}
                      </>
                    ) : (
                      <Text style={styles.summaryPendingText}>
                        No shop selected for this item yet.
                      </Text>
                    )}
                  </View>
                ))}
              </ScrollView>

              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => setSelectedSummaryModalVisible(false)}
              >
                <Text style={styles.primaryBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal
          visible={shopItemsModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setShopItemsModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalBoxLarge}>
              <View style={styles.modalHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>
                    {selectedShop?.shopName}
                  </Text>
                  <Text style={styles.metaText}>
                    Lat/Lng: {selectedShop?.latitude}, {selectedShop?.longitude}
                  </Text>
                  <Text style={styles.metaText}>
                    {selectedShop?.distanceKm} km from selected buying area
                  </Text>
                  <Text
                    style={[
                      styles.metaText,
                      parseShopTiming(selectedShop?.shopTiming).isOpen ===
                        true && styles.openShopText,
                      parseShopTiming(selectedShop?.shopTiming).isOpen ===
                        false && styles.closedShopText,
                    ]}
                  >
                    {getShopStatusText(selectedShop?.shopTiming)}
                  </Text>
                  {!!selectedShop?.shopPhone && (
                    <Text style={styles.metaText}>
                      Phone: {selectedShop.shopPhone}
                    </Text>
                  )}
                  {!!selectedShop?.shopDescription && (
                    <Text style={styles.metaText}>
                      {selectedShop.shopDescription}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => setShopItemsModalVisible(false)}
                >
                  <Ionicons name="close-circle" size={28} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={{ width: "100%", maxHeight: 420 }}
                showsVerticalScrollIndicator={false}
              >
                {selectedShop?.items?.map((shopItem, index) => {
                  const alreadySelected =
                    selectedItemsByKey[shopItem.itemKey]?.selectedShopId ===
                    selectedShop.shopId;

                  return (
                    <TouchableOpacity
                      key={`${shopItem.itemKey}-${shopItem.productId}-${index}`}
                      style={[
                        styles.shopItemChoice,
                        alreadySelected && styles.activeShopItemChoice,
                      ]}
                      onPress={() => assignItemToShop(shopItem)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemName}>{shopItem.itemName}</Text>
                        <Text style={styles.metaText}>
                          Category: {shopItem.categoryName} | Requested:{" "}
                          {shopItem.specification} | Shop Spec: {shopItem.specs}
                        </Text>
                        <Text style={styles.metaText}>
                          Price: Rs. {shopItem.price} | Available:{" "}
                          {shopItem.availableQuantity} of{" "}
                          {shopItem.requestedQuantity}
                        </Text>
                      </View>
                      <View style={styles.choiceStatus}>
                        {alreadySelected ? (
                          <Ionicons
                            name="checkmark-circle"
                            size={24}
                            color="#10b981"
                          />
                        ) : (
                          <Ionicons
                            name="add-circle-outline"
                            size={24}
                            color="#2e4466"
                          />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => setShopItemsModalVisible(false)}
              >
                <Text style={styles.secondaryBtnText}>
                  Done Selecting From This Shop
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal
          visible={shopDetailsModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setShopDetailsModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <TouchableOpacity
                onPress={() => setShopDetailsModalVisible(false)}
                style={styles.closeCornerBtn}
              >
                <Text style={styles.closeX}>x</Text>
              </TouchableOpacity>

              <Text style={styles.modalTitle}>
                {detailsShop?.shopName || "Shop Details"}
              </Text>
              <View style={styles.detailsList}>
                <View style={styles.detailRow}>
                  <Ionicons name="navigate-outline" size={20} color="#2e4466" />
                  <View style={styles.detailTextBox}>
                    <Text style={styles.detailLabel}>Distance</Text>
                    <Text style={styles.detailValue}>
                      {Number(detailsShop?.distanceKm || 0).toFixed(2)} km away
                    </Text>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="time-outline" size={20} color="#2e4466" />
                  <View style={styles.detailTextBox}>
                    <Text style={styles.detailLabel}>Timing</Text>
                    <Text
                      style={[
                        styles.detailValue,
                        parseShopTiming(detailsShop?.shopTiming).isOpen ===
                          true && styles.openShopText,
                        parseShopTiming(detailsShop?.shopTiming).isOpen ===
                          false && styles.closedShopText,
                      ]}
                    >
                      {getShopStatusText(detailsShop?.shopTiming)}
                    </Text>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="call-outline" size={20} color="#2e4466" />
                  <View style={styles.detailTextBox}>
                    <Text style={styles.detailLabel}>Phone</Text>
                    <Text style={styles.detailValue}>
                      {detailsShop?.shopPhone || "Not provided"}
                    </Text>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="location-outline" size={20} color="#2e4466" />
                  <View style={styles.detailTextBox}>
                    <Text style={styles.detailLabel}>Location</Text>
                    <Text style={styles.detailValue}>
                      {detailsShop?.latitude}, {detailsShop?.longitude}
                    </Text>
                  </View>
                </View>
                {!!detailsShop?.shopDescription && (
                  <View style={styles.detailRow}>
                    <Ionicons
                      name="document-text-outline"
                      size={20}
                      color="#2e4466"
                    />
                    <View style={styles.detailTextBox}>
                      <Text style={styles.detailLabel}>About</Text>
                      <Text style={styles.detailValue}>
                        {detailsShop.shopDescription}
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={styles.confirmBtnFull}
                onPress={() => setShopDetailsModalVisible(false)}
              >
                <Text style={styles.confirmBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal
          visible={itemDetailsModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setItemDetailsModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <TouchableOpacity
                onPress={() => setItemDetailsModalVisible(false)}
                style={styles.closeCornerBtn}
              >
                <Text style={styles.closeX}>x</Text>
              </TouchableOpacity>

              <Text style={styles.modalTitle}>
                {detailsItem?.name || "Item Details"}
              </Text>
              <View style={styles.detailsList}>
                <View style={styles.detailRow}>
                  <Ionicons name="pricetag-outline" size={20} color="#2e4466" />
                  <View style={styles.detailTextBox}>
                    <Text style={styles.detailLabel}>ITEM</Text>
                    <Text style={styles.detailValue}>
                      {detailsItem?.categoryName} | Qty: {detailsItem?.quantity}{" "}
                      | Spec: {detailsItem?.specification}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <Ionicons
                    name="storefront-outline"
                    size={20}
                    color="#2e4466"
                  />
                  <View style={styles.detailTextBox}>
                    <Text style={styles.detailLabel}>SHOP</Text>
                    <Text style={styles.detailValue}>
                      {detailsItem?.selectedShopId
                        ? `${detailsItem.selectedShopName} | Rs. ${detailsItem.selectedShopPrice}`
                        : "No shop selected yet"}
                    </Text>
                    {!!detailsItem?.selectedShopId && (
                      <>
                        <Text style={styles.detailValue}>
                          {detailsItem.selectedShopStatusText}
                        </Text>
                        <Text style={styles.detailSubValue}>
                          Available: {detailsItem.availableQuantity} of{" "}
                          {detailsItem.quantity} | Total: Rs.{" "}
                          {detailsItem.lineTotal}
                        </Text>
                      </>
                    )}
                  </View>
                </View>

                {!!detailsItem?.selectedShopId && (
                  <View style={styles.detailRow}>
                    <Ionicons
                      name="location-outline"
                      size={20}
                      color="#2e4466"
                    />
                    <View style={styles.detailTextBox}>
                      <Text style={styles.detailLabel}>SHOP LOCATION</Text>
                      <Text style={styles.detailValue}>
                        {detailsItem.selectedShopLatitude},{" "}
                        {detailsItem.selectedShopLongitude}
                      </Text>
                    </View>
                  </View>
                )}

                <View style={styles.detailRow}>
                  <Ionicons name="navigate-outline" size={20} color="#2e4466" />
                  <View style={styles.detailTextBox}>
                    <Text style={styles.detailLabel}>BUYING AREA</Text>
                    <Text style={styles.detailValue}>
                      {detailsItem?.buyingLocationLabel ||
                        selectedLocation.label}
                    </Text>
                    <Text style={styles.detailSubValue}>
                      {formatCoords(
                        detailsItem?.buyingLocationLat || selectedLocation.lat,
                        detailsItem?.buyingLocationLng || selectedLocation.lng,
                      )}
                    </Text>
                  </View>
                </View>

                {deliveryLocationChosen && (
                  <View style={styles.detailRow}>
                    <Ionicons
                      name="bicycle-outline"
                      size={20}
                      color="#2e4466"
                    />
                    <View style={styles.detailTextBox}>
                      <Text style={styles.detailLabel}>DELIVERY LOCATION</Text>
                      <Text style={styles.detailValue}>
                        {deliveryLocation.label}
                      </Text>
                      <Text style={styles.detailSubValue}>
                        {formatCoords(
                          deliveryLocation.lat,
                          deliveryLocation.lng,
                        )}
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={styles.confirmBtnFull}
                onPress={() => setItemDetailsModalVisible(false)}
              >
                <Text style={styles.confirmBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal
          visible={shareModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setShareModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <TouchableOpacity
                onPress={() => setShareModalVisible(false)}
                style={styles.closeCornerBtn}
              >
                <Text style={styles.closeX}>x</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Share List</Text>
              <Text style={styles.modalSubtitle}>
                Share {listName} with selected shops, buying location, and
                delivery location to a {selectedShareType}?
              </Text>
              <View style={styles.modalButtonsRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setShareModalVisible(false)}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.confirmBtn}
                  onPress={proceedShare}
                >
                  <Text style={styles.confirmBtnText}>Proceed</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {showWarningBox && (
          <View style={styles.warningBox}>
            <Ionicons name="alert-circle-outline" size={20} color="#fff" />
            <Text style={styles.warningText}>{warningMessage}</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  /* -------------------- MAIN CONTAINER & HEADERS -------------------- */
  mainContainer: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    height: 85,
  },
  headerTitleText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#2e4466",
    textAlign: "center",
    flex: 1,
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 85,
  },

  /* -------------------- SECTION TITLE -------------------- */
  sectionHeader: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2e4466",
    marginTop: 25,
    marginBottom: 12,
    marginHorizontal: 20,
    letterSpacing: 0.5,
    borderLeftWidth: 5,
    borderLeftColor: "#4CAF50",
    paddingLeft: 10,
  },

  /* -------------------- CARDS & CONTAINERS -------------------- */
  sectionCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  locationCard: {
    marginTop: 8,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 8,
  },
  countBadge: {
    backgroundColor: "#eef4fe",
    color: "#2e4466",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    fontSize: 13,
    fontWeight: "500",
  },
  locationBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  locationText: {
    fontSize: 14,
    color: "#334155",
    fontWeight: "500",
  },
  coordsText: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 2,
    fontWeight: "500",
  },
  locationButtonContainer: {
    padding: 15,
    paddingBottom: Platform.OS === "ios" ? 25 : 15,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },

  /* -------------------- PRIMARY & SECONDARY INTERACTION BUTTONS -------------------- */
  primaryBtn: {
    minHeight: 42,
    borderRadius: 14,
    backgroundColor: "#314a73",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    paddingHorizontal: 12,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 6,
  },
  secondaryBtn: {
    minHeight: 42,
    borderRadius: 14,
    backgroundColor: "#eef4fe",
    borderWidth: 1,
    borderColor: "#b9d5ff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    paddingHorizontal: 12,
  },
  secondaryBtnText: {
    color: "#2e4466",
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 6,
  },
  finalizeBtn: {
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: "#10b981",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },

  /* -------------------- CART ITEM CONFIGURATION LAYOUTS -------------------- */
  cartItemRow: {
    paddingTop: 14,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  itemName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0a2540",
    marginBottom: 10,
  },
  itemDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 4,
  },
  detailIcon: {
    marginRight: 12,
    width: 20,
    textAlign: "center",
  },
  detailText: {
    fontSize: 14,
    color: "#1e293b",
  },
  shopStatusBlock: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 8,
  },
  checkIconWrapper: {
    marginRight: 12,
    width: 20,
    alignItems: "center",
    paddingTop: 3,
  },
  shopInfoColumn: {
    flexDirection: "column",
    paddingBottom: 10,
  },
  shopNameText: {
    fontSize: 14,
    color: "#1e293b",
    lineHeight: 22,
  },
  notSelectedText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#d94432",
    marginTop: 10,
    paddingBottom: 10,
  },

  /* -------------------- SHOP SELECTOR & COMPARISON LAYOUTS -------------------- */
  finalActionColumn: {
    alignItems: "flex-end",
    justifyContent: "flex-start",
    marginHorizontal: 12,
    minWidth: 50,
  },
  removePlainBtn: {
    paddingHorizontal: 4,
    paddingVertical: 0,
    marginBottom: 12,
  },
  removePlainText: {
    color: "#d45a3a",
    fontSize: 20,
    lineHeight: 18,
    fontWeight: "700",
  },
  metaText: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
    lineHeight: 15,
    fontWeight: "500",
  },
  openShopText: {
    color: "#047857",
    fontWeight: "500",
  },
  closedShopText: {
    color: "#b91c1c",
    fontWeight: "500",
  },
  locationDetailText: {
    fontSize: 13,
    color: "#334155",
    marginTop: 4,
    lineHeight: 15,
    fontWeight: "500",
  },
  shopName: {
    fontSize: 14,
    color: "#1e293b",
    fontWeight: "700",
  },
  selectionSummaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eef4fe",
    borderWidth: 1,
    borderColor: "#b9d5ff",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginHorizontal: 6,
  },
  selectionSummaryText: {
    color: "#2e4466",
    fontSize: 13,
    fontWeight: "500",
    marginLeft: 4,
  },
  comparisonHeading: {
    fontSize: 18,
    color: "#1e293b",
    fontWeight: "700",
    marginBottom: 12,
  },
  categoryFilterRow: {
    paddingBottom: 12,
  },
  categoryFilterPill: {
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#dbe5f1",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
  activeCategoryFilterPill: {
    backgroundColor: "#2e4466",
    borderColor: "#2e4466",
  },
  categoryFilterText: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "500",
  },
  activeCategoryFilterText: {
    color: "#ffffff",
  },
  comparisonSubHeading: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: "500",
    marginBottom: 8,
  },
  comparisonBlock: {
    borderBottomWidth: 1,
    borderBottomColor: "#e8edf5",
    paddingBottom: 12,
    marginBottom: 16,
  },
  comparisonItemHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  comparisonItemName: {
    fontSize: 16,
    color: "#1e293b",
    fontWeight: "700",
  },
  categoryPill: {
    backgroundColor: "#eef4fe",
    color: "#2e4466",
    fontSize: 12,
    fontWeight: "500",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: "hidden",
    marginLeft: 6,
  },
  comparisonOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5fb",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: "#2e4466",
    marginTop: 6,
  },
  activeComparisonOption: {
    backgroundColor: "#edf3fc",
    borderColor: "#2e4466",
  },
  comparisonOptionText: {
    flex: 1,
    marginLeft: 10,
    paddingRight: 6,
  },
  comparisonMetaText: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 2,
    lineHeight: 18,
    fontWeight: "500",
  },
  optionActionColumn: {
    alignItems: "flex-end",
    justifyContent: "space-between",
    minHeight: 60,
    marginLeft: 6,
  },
  shopDetailsBtn: {
    backgroundColor: "#eef4fe",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  shopDetailsText: {
    color: "#2563eb",
    fontSize: 12,
    fontWeight: "500",
  },
  comparisonPrice: {
    color: "#2e4466",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 6,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2.5,
    borderColor: "#2e4466",
    alignItems: "center",
    justifyContent: "center",
  },
  radioDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: "#2e4466",
  },
  cheapestText: {
    color: "#10b981",
    fontSize: 13,
    fontWeight: "500",
  },
  autoSelectedText: {
    color: "#047857",
    fontSize: 13,
    fontWeight: "500",
    marginTop: 2,
  },

  /* -------------------- FINALIZED CART LOGISTICS SECTIONS -------------------- */
  finalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  finalItemDetails: {
    marginTop: 6,
  },
  itemDetailText: {
    fontSize: 14,
    color: "#1e293b",
    fontWeight: "500",
  },
  finalShopLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    backgroundColor: "#f8fafc",
    padding: 10,
    borderRadius: 10,
    maxWidth: "70%",
  },
  selectedShopText: {
    fontSize: 14,
    color: "#10b981",
    fontWeight: "700",
  },
  priceText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2e4466",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  totalLabel: {
    fontSize: 14,
    color: "#1e293b",
    fontWeight: "700",
  },
  totalPrice: {
    fontSize: 16,
    color: "#10b981",
    fontWeight: "700",
  },

  /* -------------------- BILL SUMMARY CARD -------------------- */
  billSummaryCard: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#dbe5f1",
    borderRadius: 14,
    padding: 12,
    marginTop: 14,
  },
  billSummaryTitle: {
    fontSize: 15,
    color: "#1e293b",
    fontWeight: "700",
    marginBottom: 8,
  },
  billLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 5,
  },
  billLabel: {
    color: "#64748b",
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
    paddingRight: 10,
  },
  billValue: {
    color: "#2e4466",
    fontSize: 14,
    fontWeight: "500",
  },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#dbe5f1",
  },
  grandTotalLabel: {
    color: "#1e293b",
    fontSize: 15,
    fontWeight: "700",
  },
  grandTotalPrice: {
    color: "#10b981",
    fontSize: 18,
    fontWeight: "700",
  },

  /* -------------------- SHARE BUTTON ROW LAYOUTS -------------------- */
  shareRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
  },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 14,
    width: "48%",
    justifyContent: "center",
  },
  shareFriendBtn: {
    backgroundColor: "#e5e5e5",
  },
  shareRiderBtn: {
    backgroundColor: "#314a73",
  },
  shareFriendText: {
    fontSize: 15,
    color: "#333",
    marginLeft: 4,
    fontWeight: "700",
  },
  shareRiderText: {
    fontSize: 15,
    color: "#fff",
    marginLeft: 4,
    fontWeight: "700",
  },

  /* -------------------- TAB FOOTER WRAPPERS -------------------- */
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

  /* -------------------- FULL MODAL OVERLAYS & STRUCTURAL MAP BOXES -------------------- */
  fullModalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingTop: 20,
    backgroundColor: "rgba(15,23,42,0.45)",
  },
  locationModalBox: {
    width: "90%",
    maxHeight: "85%",
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 13,
    alignSelf: "center",
  },
  shopMapModalBox: {
    width: "96%",
    height: "92%",
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 16,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  locationInput: {
    flex: 1,
    height: 52,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#dbe4f0",
    borderRadius: 14,
    paddingHorizontal: 14,
    fontSize: 15,
    color: "#1e293b",
    marginRight: 10,
  },
  searchBtn: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#2e4466",
    justifyContent: "center",
    alignItems: "center",
  },
  mapBox: {
    width: "100%",
    height: Platform.OS === "web" ? 350 : 220,
    borderRadius: 14,
    overflow: "hidden",
    marginTop: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  shopMapBox: {
    width: "100%",
    height: 260,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
  },
  shopSideBox: {
    flex: 1,
    width: "100%",
  },
  map: {
    flex: 1,
  },

  /* -------------------- REFACTORED COMPACT SPECIFIC MODALS -------------------- */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 15,
  },
  modalBox: {
    width: "85%",
    backgroundColor: "#fff",
    borderRadius: 22,
    paddingTop: 15,
    paddingBottom: 25,
    paddingHorizontal: 30,
    alignItems: "center",
    position: "relative",
  },
  modalBoxLarge: {
    width: "85%",
    backgroundColor: "#fff",
    borderRadius: 22,
    paddingTop: 15,
    paddingBottom: 25,
    paddingHorizontal: 30,
    alignItems: "center",
    position: "relative",
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    width: "100%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111",
    marginTop: 18,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#555",
    marginTop: 12,
    marginBottom: 30,
    textAlign: "center",
    lineHeight: 20,
  },
  closeCornerBtn: {
    position: "absolute",
    top: 15,
    right: 20,
    zIndex: 10,
    padding: 5,
  },
  closeX: {
    fontSize: 22,
    color: "#94a3b8",
    fontWeight: "bold",
  },
  modalButtonsRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: "#e5e5e5",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginRight: 8,
  },
  confirmBtn: {
    flex: 1,
    backgroundColor: "#314a73",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginLeft: 8,
  },
  confirmBtnFull: {
    width: "100%",
    backgroundColor: "#314a73",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 15,
  },
  cancelBtnText: {
    color: "#333",
    fontWeight: "700",
    fontSize: 15,
  },
  confirmBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },

  /* -------------------- FLOATING NOTIFICATIONS & DETAIL VIEWS -------------------- */
  detailsList: {
    width: "100%",
    marginTop: 12,
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  detailTextBox: {
    flex: 1,
    marginLeft: 8,
  },
  detailLabel: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 2,
  },
  detailValue: {
    color: "#1e293b",
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
  },
  warningBox: {
    position: "absolute",
    bottom: 80,
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
  loaderText: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 8,
    fontWeight: "500",
  },
  shopItemChoice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 8,
  },
  activeShopItemChoice: {
    borderColor: "#10b981",
    backgroundColor: "#ecfdf5",
  },
  choiceStatus: {
    marginLeft: 8,
  },
  emptyText: {
    textAlign: "center",
    color: "#94a3b8",
    paddingVertical: 14,
    fontWeight: "500",
  },
  summaryListBox: {
    width: "100%",
    maxHeight: 380,
  },
  summaryItemRow: {
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 10,
    marginBottom: 8,
  },
  summaryItemSelected: {
    backgroundColor: "#ecfdf5",
    borderColor: "#10b981",
  },
  summaryItemHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  summaryItemName: {
    color: "#1e293b",
    fontSize: 14,
    fontWeight: "700",
  },
  summaryMeta: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 2,
    lineHeight: 15,
    fontWeight: "500",
  },
  summaryShopText: {
    color: "#10b981",
    fontSize: 12,
    fontWeight: "500",
    marginTop: 4,
  },
  summaryPendingText: {
    color: "#d45a3a",
    fontSize: 12,
    fontWeight: "500",
    marginTop: 4,
  },
  summaryStatusPill: {
    overflow: "hidden",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 10,
    fontWeight: "500",
    marginLeft: 6,
  },
  summarySelectedPill: {
    backgroundColor: "#d1fae5",
    color: "#047857",
  },
  summaryPendingPill: {
    backgroundColor: "#fee2e2",
    color: "#b91c1c",
  },
});
