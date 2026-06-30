import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { API_URLS } from '../../src/services/apiConfig';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
  TextInput,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";

export default function RiderOptimizer() {
  const router = useRouter();
  const webViewRef = useRef(null);
  const { requestId, downloadedListId, optimizerMode } = useLocalSearchParams();
  const isDownloadedListMode = optimizerMode === "downloaded" || !!downloadedListId;
  const optimizerId = isDownloadedListMode ? downloadedListId : requestId;

  const [loading, setLoading] = useState(true);
  const [savingItemId, setSavingItemId] = useState(null);
  const [plan, setPlan] = useState(null);
  const [optimized, setOptimized] = useState(null);
  const [deliveryRoute, setDeliveryRoute] = useState(null);
  const [routeOverview, setRouteOverview] = useState({ totalDistance: "0 km", travelTime: "0 mins" });
  const [reportModal, setReportModal] = useState({ visible: false, shop: null, mode: null });
  const [reportReason, setReportReason] = useState("");
  const [reportingShopId, setReportingShopId] = useState(null);
  const [showWarningBox, setShowWarningBox] = useState(false);
  const [warningMessage, setWarningMessage] = useState("");

  const allItemsDone = useMemo(() => {
    const stops = optimized?.stops || plan?.stops || [];
    const items = stops.flatMap((stop) => stop.items || []);
    return items.length > 0 && items.every((item) => item.optimizerDone || item.riderOptimizerDone || item.customerOptimizerDone);
  }, [optimized, plan]);

  const waypoints = useMemo(() => {
    if (deliveryRoute) {
      return [
        { label: deliveryRoute.origin.label, lat: deliveryRoute.origin.lat, lng: deliveryRoute.origin.lng },
        { label: deliveryRoute.destination.label, lat: deliveryRoute.destination.lat, lng: deliveryRoute.destination.lng },
      ];
    }

    if (!optimized) return [];

    return [
      { label: optimized.origin.label, lat: optimized.origin.lat, lng: optimized.origin.lng },
      ...(optimized.stops || []).map((stop) => ({
        label: `Stop ${stop.stopNumber}: ${stop.shopName}`,
        lat: stop.latitude,
        lng: stop.longitude,
      })),
    ];
  }, [deliveryRoute, optimized]);

  const pushWaypointsToMap = useCallback((points) => {
    const messageObj = { type: "UPDATE_WAYPOINTS", data: points };

    if (Platform.OS === "web") {
      const iframe = document.getElementById("rider-optimizer-map-iframe");
      iframe?.contentWindow?.postMessage(JSON.stringify(messageObj), "*");
      setTimeout(() => {
        iframe?.contentWindow?.postMessage(JSON.stringify(messageObj), "*");
      }, 400);
    } else if (webViewRef.current) {
      const jsCode = `
        (function() {
          var event = new MessageEvent('message', {
            data: ${JSON.stringify(JSON.stringify(messageObj))}
          });
          window.dispatchEvent(event);
        })();
      `;
      webViewRef.current.injectJavaScript(jsCode);
    }
  }, []);

  useEffect(() => {
    if (waypoints.length > 0) pushWaypointsToMap(waypoints);
  }, [pushWaypointsToMap, waypoints]);

  const getLiveLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Location access needed",
        "Please allow live location access so the optimizer can build the shortest route from your current position."
      );
      throw new Error("LOCATION_PERMISSION_DENIED");
    }

    const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { riderLat: location.coords.latitude, riderLng: location.coords.longitude };
  };

  const loadPlan = useCallback(async () => {
    if (!optimizerId) {
      Alert.alert("Error", isDownloadedListMode ? "Missing downloaded list id" : "Missing request id");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      const path = isDownloadedListMode
        ? `${API_URLS.RIDER_OPTIMIZER}/downloaded-lists/${optimizerId}/plan`
        : `${API_URLS.RIDER_OPTIMIZER}/requests/${optimizerId}/plan`;
      const response = await axios.get(path, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPlan(response.data);
    } catch (error) {
      Alert.alert("Error", error.response?.data?.message || "Could not load rider optimizer.");
    } finally {
      setLoading(false);
    }
  }, [isDownloadedListMode, optimizerId]);

  const optimizePickupRoute = useCallback(async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      const { riderLat, riderLng } = await getLiveLocation();
      const path = isDownloadedListMode
        ? `${API_URLS.RIDER_OPTIMIZER}/downloaded-lists/${optimizerId}/optimize`
        : `${API_URLS.RIDER_OPTIMIZER}/requests/${optimizerId}/optimize`;
      const response = await axios.post(
        path,
        { riderLat, riderLng },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setOptimized(response.data);
      setDeliveryRoute(null);
      setRouteOverview({
        totalDistance: `${response.data.totalDistanceKm} km`,
        travelTime: `${response.data.estimatedMinutes} mins`,
      });
    } catch (error) {
      if (error.message !== "LOCATION_PERMISSION_DENIED") {
        Alert.alert("Error", error.response?.data?.message || "Could not optimize route.");
      }
    } finally {
      setLoading(false);
    }
  }, [isDownloadedListMode, optimizerId]);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  useEffect(() => {
    if (plan && !optimized) optimizePickupRoute();
  }, [optimizePickupRoute, optimized, plan]);

  const mergeUpdatedItemsIntoStops = (stops = [], updatedItems = []) =>
    stops.map((stop) => ({
      ...stop,
      items: (stop.items || []).map((item) => {
        const updated = updatedItems.find((fresh) => String(fresh.id) === String(item.id));
        if (!updated) return item;
        const merged = { ...item, ...updated };
        return {
          ...merged,
          optimizerDone: Boolean(merged.riderOptimizerDone || merged.customerOptimizerDone),
        };
      }),
    }));

  const updateItemDone = async (itemId, done) => {
    try {
      setSavingItemId(itemId);
      const token = await AsyncStorage.getItem("token");
      const path = isDownloadedListMode
        ? `${API_URLS.RIDER_OPTIMIZER}/downloaded-lists/${optimizerId}/items/${itemId}/done`
        : `${API_URLS.RIDER_OPTIMIZER}/requests/${optimizerId}/items/${itemId}/done`;
      const response = await axios.patch(
        path,
        { done },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const updatedItems = response.data.request?.items || response.data.list?.items || [];

      setOptimized((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          stops: mergeUpdatedItemsIntoStops(prev.stops, updatedItems),
        };
      });
      setPlan((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          stops: mergeUpdatedItemsIntoStops(prev.stops, updatedItems),
        };
      });
    } catch (error) {
      Alert.alert("Error", error.response?.data?.message || "Could not update item.");
    } finally {
      setSavingItemId(null);
    }
  };

  const triggerWarning = (msg) => {
    setWarningMessage(msg);
    setShowWarningBox(true);
    setTimeout(() => {
      setShowWarningBox(false);
    }, 2500);
  };

  const closeReportModal = () => {
    setReportModal({ visible: false, shop: null, mode: null });
    setReportReason("");
  };

  const submitShopReport = async (shop, title, reason = "") => {
    if (!shop?.shopId) {
      Alert.alert("Error", "This shop cannot be reported because its shop id is missing.");
      return;
    }

    if (title === "OTHER_REASON" && !reason.trim()) {
      Alert.alert("Reason required", "Please type the report reason.");
      return;
    }

    try {
      setReportingShopId(shop.shopId);
      const token = await AsyncStorage.getItem("token");
      await axios.post(
        `${API_URLS.RIDER_OPTIMIZER}/shops/${shop.shopId}/report`,
        {
          title,
          reason,
          source: isDownloadedListMode ? "customer_optimizer" : "rider_optimizer",
          riderRequestId: !isDownloadedListMode ? Number(requestId) : null,
          downloadedListId: isDownloadedListMode ? Number(downloadedListId) : null,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      closeReportModal();
      triggerWarning("Thank you for your feedback.");
    } catch (error) {
      triggerWarning(error.response?.data?.message || "Could not report shop.");
    } finally {
      setReportingShopId(null);
    }
  };

  const createDeliveryRoute = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      const { riderLat, riderLng } = await getLiveLocation();
      const path = isDownloadedListMode
        ? `${API_URLS.RIDER_OPTIMIZER}/downloaded-lists/${optimizerId}/delivery-route`
        : `${API_URLS.RIDER_OPTIMIZER}/requests/${optimizerId}/delivery-route`;
      const response = await axios.post(
        path,
        { riderLat, riderLng },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setDeliveryRoute(response.data);
      setRouteOverview({
        totalDistance: `${response.data.totalDistanceKm} km`,
        travelTime: `${response.data.estimatedMinutes} mins`,
      });
    } catch (error) {
      if (error.message !== "LOCATION_PERMISSION_DENIED") {
        Alert.alert("Error", error.response?.data?.message || "Could not create delivery route.");
      }
    } finally {
      setLoading(false);
    }
  };

  const wordCount = (value) => String(value || "").trim().split(/\s+/).filter(Boolean).length;

  const mapHtmlTemplate = useMemo(() => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        body, html, #map { margin: 0; padding: 0; height: 100%; width: 100%; background: #e2e8f0; }
        .leaflet-attribution-flag { display: none !important; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map', { zoomControl: true }).setView([31.5204, 74.3587], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
        var markerGroup = L.featureGroup().addTo(map);
        var polylineGroup = L.featureGroup().addTo(map);

        function iconForIndex(index) {
          var color = index === 0 ? '#2e4466' : '#ef4444';
          return L.divIcon({
            html: '<div style="background:' + color + ';color:white;border-radius:999px;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-weight:800;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,.25)">' + (index === 0 ? 'R' : index) + '</div>',
            className: '',
            iconSize: [28, 28],
            iconAnchor: [14, 14]
          });
        }

        function renderRouteUsingOSRM(points) {
          markerGroup.clearLayers();
          polylineGroup.clearLayers();
          points = (points || []).filter(function(p) {
            return Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng));
          }).map(function(p) {
            return { label: p.label, lat: Number(p.lat), lng: Number(p.lng) };
          });
          if (!points || points.length === 0) return;

          points.forEach(function(p, index) {
            L.marker([p.lat, p.lng], { icon: iconForIndex(index) }).addTo(markerGroup).bindPopup('<b>' + p.label + '</b>');
          });

          var fallbackCoords = points.map(p => [p.lat, p.lng]);
          if (fallbackCoords.length > 1) {
            L.polyline(fallbackCoords, { color: '#ef4444', weight: 5, opacity: 0.9 }).addTo(polylineGroup);
          }
          map.fitBounds(L.latLngBounds(fallbackCoords), { padding: [40, 40] });

          if (points.length < 2) return;

          var coordString = points.map(p => p.lng + ',' + p.lat).join(';');
          var osrmUrl = 'https://router.project-osrm.org/route/v1/driving/' + coordString + '?overview=full&geometries=geojson';

          fetch(osrmUrl)
            .then(res => res.json())
            .then(data => {
              if (data.routes && data.routes.length > 0) {
                polylineGroup.clearLayers();
                var routeCoords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
                L.polyline(routeCoords, { color: '#ef4444', weight: 5, opacity: 0.9 }).addTo(polylineGroup);
              }
            })
            .catch(() => {});
        }

        var initialPoints = ${JSON.stringify(waypoints)};
        if (initialPoints && initialPoints.length > 0) renderRouteUsingOSRM(initialPoints);

        window.addEventListener('message', function(event) {
          try {
            var message = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
            if (message && message.type === 'UPDATE_WAYPOINTS') renderRouteUsingOSRM(message.data);
          } catch(e) {}
        });
      </script>
    </body>
    </html>
  `, [waypoints]);

  if (loading && !optimized) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2e4466" />
        <Text style={styles.loadingText}>Building pickup path...</Text>
      </View>
    );
  }

  const visibleStops = optimized?.stops || plan?.stops || [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      
      <View style={styles.container}>
        {/* TOP GADIENT HEADER */}
        <LinearGradient 
          colors={["#eef4fe", "#2e4466"]} 
          start={{ x: 1, y: 0 }} 
          end={{ x: 0, y: 0 }} 
          style={styles.header}
        >
          <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace("/riderDashboard"))}>
            <Ionicons name="chevron-back" size={28} color="#eef4fe" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isDownloadedListMode ? "List Optimizer" : "Rider Optimizer"}
          </Text>
        </LinearGradient>

        {/* CONTENT LAYER */}
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.mapCard}>
            {Platform.OS === "web" ? (
              <iframe key={deliveryRoute ? "delivery-route-map" : "pickup-route-map"} id="rider-optimizer-map-iframe" srcDoc={mapHtmlTemplate} style={{ width: "100%", height: "100%", border: "none" }} title="Rider Optimizer Map" />
            ) : (
              <WebView
                key={deliveryRoute ? "delivery" : "pickup"}
                ref={webViewRef}
                originWhitelist={["*"]}
                source={{ html: mapHtmlTemplate }}
                style={styles.map}
                javaScriptEnabled
                domStorageEnabled
              />
            )}
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{deliveryRoute ? "Delivery Route" : "Pickup Route"}</Text>
            <View style={styles.metricRow}>
              <Ionicons name="navigate-outline" size={20} color="#2e4466" />
              <Text style={styles.metricLabel}>Distance</Text>
              <Text style={styles.metricValue}>{routeOverview.totalDistance}</Text>
            </View>
            <View style={styles.metricRow}>
              <Ionicons name="time-outline" size={20} color="#2e4466" />
              <Text style={styles.metricLabel}>Estimated Time</Text>
              <Text style={styles.metricValue}>{routeOverview.travelTime}</Text>
            </View>
            {!!plan?.buyingLocation?.label && <Text style={styles.locationText}>Buy items from: {plan.buyingLocation.label}</Text>}
            {!!plan?.deliveryLocation?.label && <Text style={styles.locationText}>Deliver to: {plan.deliveryLocation.label}</Text>}
          </View>

          {allItemsDone && !deliveryRoute && (
            <TouchableOpacity style={styles.deliveryRouteBtn} onPress={createDeliveryRoute}>
              <Ionicons name="location-outline" size={18} color="#fff" />
              <Text style={styles.deliveryRouteText}>Use Live Location For Delivery Route</Text>
            </TouchableOpacity>
          )}

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Stops and Purchases</Text>
            {visibleStops.length === 0 ? (
              <Text style={styles.emptyText}>No selected shop locations found for this list.</Text>
            ) : (
              visibleStops.map((stop, index) => {
                const subtotal = (stop.items || []).reduce((sum, item) => sum + Number(item.lineTotal || 0), 0);
                return (
                  <View key={stop.shopKey || index} style={styles.stopCard}>
                    <View style={styles.stopHeader}>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <View style={styles.stopTitleRow}>
                          <View style={styles.stopBadge}>
                            <Text style={styles.stopBadgeText}>{stop.stopNumber || index + 1}</Text>
                          </View>
                          <Text style={styles.stopTitle} numberOfLines={1}>Stop {stop.stopNumber || index + 1}: {stop.shopName}</Text>
                        </View>
                        <Text style={styles.stopMeta}>Subtotal: Rs. {subtotal}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.reportShopBtn}
                        onPress={() => setReportModal({ visible: true, shop: stop, mode: null })}
                      >
                        <Ionicons name="flag-outline" size={14} color="#ef4444" />
                        <Text style={styles.reportShopText}>Report</Text>
                      </TouchableOpacity>
                    </View>

                    {(stop.items || []).map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        style={styles.itemRow}
                        onPress={() => updateItemDone(item.id, !(item.optimizerDone || item.riderOptimizerDone || item.customerOptimizerDone))}
                        disabled={savingItemId === item.id}
                        activeOpacity={0.7}
                    >
                        <Ionicons
                          name={(item.optimizerDone || item.riderOptimizerDone || item.customerOptimizerDone) ? "checkbox" : "square-outline"}
                          size={22}
                          color={(item.optimizerDone || item.riderOptimizerDone || item.customerOptimizerDone) ? "#10b981" : "#94a3b8"}
                        />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={[styles.itemName, (item.optimizerDone || item.riderOptimizerDone || item.customerOptimizerDone) && styles.doneText]}>{item.name}</Text>
                          <Text style={styles.itemMeta}>
                            Qty: {item.quantity || 1} | Spec: {item.specification || "None"} | Price: Rs. {item.selectedShopPrice || 0}
                          </Text>
                        </View>
                        {savingItemId === item.id && <ActivityIndicator size="small" color="#2e4466" />}
                      </TouchableOpacity>
                    ))}
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>

        {/* BOTTOM NAVIGATION BAR LAYER */}
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

      {/* REPORT CONTEXT MODAL */}
      <Modal visible={reportModal.visible} transparent animationType="fade" onRequestClose={closeReportModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.reportModalBox}>
            <TouchableOpacity style={styles.modalCloseIcon} onPress={closeReportModal}>
              <Ionicons name="close" size={20} color="#64748b" />
            </TouchableOpacity>
            <Text style={styles.reportModalTitle}>Report shop</Text>
            <Text style={styles.reportModalSubtitle}>{reportModal.shop?.shopName || "Selected shop"}</Text>

            {!reportModal.mode && (
              <>
                <TouchableOpacity
                  style={styles.reportOptionBtn}
                  onPress={() => submitShopReport(reportModal.shop, "SHOP_DOES_NOT_EXIST")}
                  disabled={reportingShopId === reportModal.shop?.shopId}
                >
                  <Ionicons name="storefront-outline" size={18} color="#2e4466" />
                  <Text style={styles.reportOptionText}>The shop does not exist</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.reportOptionBtn}
                  onPress={() => setReportModal((prev) => ({ ...prev, mode: "OTHER_REASON" }))}
                >
                  <Ionicons name="chatbox-ellipses-outline" size={18} color="#2e4466" />
                  <Text style={styles.reportOptionText}>Other reason</Text>
                </TouchableOpacity>
              </>
            )}

            {reportModal.mode === "OTHER_REASON" && (
              <>
                <TextInput
                  value={reportReason}
                  onChangeText={setReportReason}
                  placeholder="Type reason, max 500 words"
                  placeholderTextColor="#94a3b8"
                  multiline
                  style={styles.reportInput}
                />
                <Text style={[styles.wordCounter, wordCount(reportReason) > 500 && styles.wordCounterError]}>
                  {wordCount(reportReason)} / 500 words
                </Text>
                <TouchableOpacity
                  style={styles.sendReportBtn}
                  onPress={() => submitShopReport(reportModal.shop, "OTHER_REASON", reportReason)}
                  disabled={reportingShopId === reportModal.shop?.shopId}
                >
                  <Ionicons name="send" size={17} color="#fff" />
                  <Text style={styles.sendReportText}>{reportingShopId === reportModal.shop?.shopId ? "Sending..." : "Send"}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {showWarningBox && (
        <View style={styles.warningBox}>
          <Ionicons name="alert-circle-outline" size={20} color="#fff" />
          <Text style={styles.warningText}>{warningMessage}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f8fafc" },
  loadingText: { marginTop: 12, color: "#64748b", fontWeight: "700" },
  container: { flex: 1, backgroundColor: "#f8fafc" },
  
  header: { 
    height: 85, 
    paddingHorizontal: 20, 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "space-between" 
  },
  headerTitle: { 
    flex: 1, 
    textAlign: "center", 
    fontSize: 22, 
    fontWeight: "700", 
    color: "#2e4466" 
  },
  
  scrollContainer: { padding: 16, paddingBottom: 110 },
  mapCard: { width: "100%", height: 240, borderRadius: 16, overflow: "hidden", backgroundColor: "#e2e8f0", marginBottom: 16, borderWidth: 1, borderColor: "#e2e8f0" },
  map: { flex: 1 },
  sectionCard: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "#e2e8f0" },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: "#1e293b", marginBottom: 12 },
  metricRow: { flexDirection: "row", alignItems: "center", paddingVertical: 6 },
  metricLabel: { flex: 1, fontSize: 13, color: "#475569", marginLeft: 10, fontWeight: "600" },
  metricValue: { fontSize: 13, fontWeight: "800", color: "#1e293b" },
  locationText: { color: "#475569", fontSize: 12, fontWeight: "600", marginTop: 6 },
  deliveryRouteBtn: { backgroundColor: "#10b981", borderRadius: 12, paddingVertical: 14, marginBottom: 16, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  deliveryRouteText: { color: "#fff", fontWeight: "800", fontSize: 14, marginLeft: 8 },
  emptyText: { textAlign: "center", color: "#94a3b8", paddingVertical: 20, fontSize: 14, fontWeight: "600" },
  stopCard: { marginBottom: 12, backgroundColor: "#f8fafc", borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", padding: 12 },
  stopHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "#e2e8f0", paddingBottom: 8, marginBottom: 8 },
  stopTitleRow: { flexDirection: "row", alignItems: "center", flex: 1 },
  stopBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: "#2e4466", alignItems: "center", justifyContent: "center", marginRight: 8 },
  stopBadgeText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  stopTitle: { color: "#1e293b", fontSize: 14, fontWeight: "700", flex: 1 },
  stopMeta: { color: "#10b981", fontSize: 11, marginTop: 2, fontWeight: "700" },
  reportShopBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#fef2f2", borderRadius: 8, borderWidth: 1, borderColor: "#fecaca", paddingHorizontal: 8, paddingVertical: 4 },
  reportShopText: { color: "#ef4444", fontSize: 11, fontWeight: "700", marginLeft: 4 },
  itemRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderTopWidth: 1, borderTopColor: "#e2e8f0" },
  itemName: { color: "#334155", fontSize: 13, fontWeight: "700" },
  doneText: { color: "#10b981", textDecorationLine: "line-through" },
  itemMeta: { color: "#64748b", fontSize: 11, marginTop: 2, lineHeight: 16 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.6)", justifyContent: "center", alignItems: "center", padding: 20 },
  reportModalBox: { width: "100%", maxWidth: 400, backgroundColor: "#fff", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#e2e8f0" },
  modalCloseIcon: { position: "absolute", top: 12, right: 12, zIndex: 2, width: 28, height: 28, borderRadius: 14, backgroundColor: "#f8fafc", alignItems: "center", justifyContent: "center" },
  reportModalTitle: { color: "#1e293b", fontSize: 17, fontWeight: "800", paddingRight: 34 },
  reportModalSubtitle: { color: "#64748b", fontSize: 13, fontWeight: "600", marginTop: 4, marginBottom: 16 },
  reportOptionBtn: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#dbeafe", backgroundColor: "#eff6ff", borderRadius: 12, padding: 12, marginTop: 10 },
  reportOptionText: { color: "#2e4466", fontSize: 14, fontWeight: "700", marginLeft: 10 },
  reportInput: { minHeight: 120, textAlignVertical: "top", borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 12, padding: 12, color: "#1e293b", backgroundColor: "#f8fafc", fontSize: 14, lineHeight: 20 },
  wordCounter: { textAlign: "right", color: "#64748b", fontSize: 11, fontWeight: "600", marginTop: 6 },
  wordCounterError: { color: "#ef4444" },
  sendReportBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#2e4466", borderRadius: 12, paddingVertical: 12, marginTop: 12 },
  sendReportText: { color: "#fff", fontSize: 14, fontWeight: "700", marginLeft: 8 },
  
  // Bottom Navigation Bar Styles matching RiderSetLocation explicitly
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
  
  warningBox: {
    position: "absolute",
    bottom: 90, // Raised above the bottom navigation panel
    left: 16,
    right: 16,
    backgroundColor: "#e67e22",
    padding: 12,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 9999,
  },
  warningText: {
    color: "#fff",
    marginLeft: 8,
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
});