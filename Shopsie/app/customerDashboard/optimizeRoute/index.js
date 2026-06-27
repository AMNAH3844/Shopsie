import React, { useState, useEffect, useRef, useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Platform, Modal, Pressable } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { WebView } from "react-native-webview";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { LinearGradient } from "expo-linear-gradient";
import { API_URLS } from '../../../src/services/apiConfig';

export default function OptimizeRoute() {
  const router = useRouter();
  const webViewRef = useRef(null);
  const { listId, isDownloaded } = useLocalSearchParams();

  const [loading, setLoading] = useState(true);
  const [rawPayload, setRawPayload] = useState(null);
  const [selectedShops, setSelectedShops] = useState({});

  const [categories, setCategories] = useState(["All"]);
  const [selectedCategory, setSelectedCategory] = useState("All");

const [routeOverview, setRouteOverview] = useState({
  totalDistance: "0 km",
  travelTime: "0 mins"
});
  const [instructions, setInstructions] = useState([]);
  const [waypoints, setWaypoints] = useState([]);
  const [shopGroupedSummary, setShopGroupedSummary] = useState([]);

  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [activeShopDetails, setActiveShopDetails] = useState(null);

  useEffect(() => {
    if (listId) fetchItemChoices();
  }, [listId]);

  useEffect(() => {
    if (rawPayload) {
      calculateClientSideRoute();
    }
  }, [selectedShops, rawPayload]);

  useEffect(() => {
    if (waypoints.length > 0) {
      const messageObj = { type: "UPDATE_WAYPOINTS", data: waypoints };

      if (Platform.OS === "web") {
        const iframe = document.getElementById("leaflet-route-iframe");
        iframe?.contentWindow?.postMessage(JSON.stringify(messageObj), "*");
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
    }
  }, [waypoints]);

  const fetchItemChoices = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      let userLat = 31.5204;
      let userLng = 74.3587;

      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          userLat = location.coords.latitude;
          userLng = location.coords.longitude;
        }
      } catch (e) {
        console.log("Location permission fetch skipped/denied.");
      }

      const response = await axios.post(
  `${API_URLS.ROUTE_OPTIMIZE}/optimize`,
  { listId: Number(listId), userLat, userLng, isDownloaded: isDownloaded },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const data = response.data;
      setRawPayload(data);

      const incomingCategories = new Set(["All"]);
      data.itemsWithShops.forEach(item => {
        if (item.categoryName) incomingCategories.add(item.categoryName);
      });
      setCategories(Array.from(incomingCategories));

      const initialSelections = {};
      data.itemsWithShops.forEach(item => {
        if (item.options && item.options.length > 0) {
          initialSelections[item.itemKey] = item.options[0].shopId;
        }
      });

      setSelectedShops(initialSelections);
      setLoading(false);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Could not load item specifications configurations.");
      setLoading(false);
    }
  };

  const getDist = (la1, lo1, la2, lo2) => {
  const R = 6371; // Earth radius in KM

  const dLat = ((la2 - la1) * Math.PI) / 180;
  const dLon = ((lo2 - lo1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((la1 * Math.PI) / 180) *
      Math.cos((la2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

  const permute = (arr) => {
    if (arr.length === 0) return [[]];
    const result = [];
    for (let i = 0; i < arr.length; i++) {
      const current = arr[i];
      const remaining = arr.slice(0, i).concat(arr.slice(i + 1));
      const remainingPerms = permute(remaining);
      for (let j = 0; j < remainingPerms.length; j++) {
        result.push([current, ...remainingPerms[j]]);
      }
    }
    return result;
  };

  const calculateClientSideRoute = () => {
    if (!rawPayload) return;

    const { origin, itemsWithShops } = rawPayload;
    const uniqueShopsMap = new Map();

    itemsWithShops.forEach(item => {
      const chosenShopId = selectedShops[item.itemKey];
      const matchedOption = item.options.find(opt => opt.shopId === chosenShopId);

      if (matchedOption) {
        const selectedItem = {
          name: item.itemName,
          specification: item.specification || "None",
          requestedQuantity: Number(item.requestedQuantity || matchedOption.requestedQuantity || 1),
          availableQuantity: Number(matchedOption.availableQuantity || 0),
          price: Number(matchedOption.price || 0),
          lineTotal: Number(matchedOption.price || 0) * Math.min(
            Number(item.requestedQuantity || matchedOption.requestedQuantity || 1),
            Number(matchedOption.availableQuantity || 0)
          ),
        };

        if (!uniqueShopsMap.has(chosenShopId)) {
          uniqueShopsMap.set(chosenShopId, {
            id: chosenShopId,
            shopName: matchedOption.shopName,
            latitude: matchedOption.latitude,
            longitude: matchedOption.longitude,
            items: [selectedItem],
          });
        } else {
          uniqueShopsMap.get(chosenShopId).items.push(selectedItem);
        }
      }
    });

    const targetShops = Array.from(uniqueShopsMap.values());
    const startLat = origin?.lat || 31.5204;
    const startLng = origin?.lng || 74.3587;

    let bestSequence = [];
    let minTotalDistance = Infinity;

    if (targetShops.length > 0) {
      if (targetShops.length <= 7) {
        const allPossibleSequences = permute(targetShops);
        allPossibleSequences.forEach(sequence => {
          let currentLat = startLat;
          let currentLng = startLng;
          let currentSequenceDistance = 0;

          for (let i = 0; i < sequence.length; i++) {
            currentSequenceDistance += getDist(currentLat, currentLng, sequence[i].latitude, sequence[i].longitude);
            currentLat = sequence[i].latitude;
            currentLng = sequence[i].longitude;
          }

          if (currentSequenceDistance < minTotalDistance) {
            minTotalDistance = currentSequenceDistance;
            bestSequence = sequence;
          }
        });
      } else {
        let unvisited = [...targetShops];
        let currentLat = startLat;
        let currentLng = startLng;
        minTotalDistance = 0;

        while (unvisited.length > 0) {
          let nearestIdx = 0;
          let minD = Infinity;

          for (let i = 0; i < unvisited.length; i++) {
            let d = getDist(currentLat, currentLng, unvisited[i].latitude, unvisited[i].longitude);
            if (d < minD) {
              minD = d;
              nearestIdx = i;
            }
          }

          minTotalDistance += minD;
          currentLat = unvisited[nearestIdx].latitude;
          currentLng = unvisited[nearestIdx].longitude;
          bestSequence.push(unvisited[nearestIdx]);
          unvisited.splice(nearestIdx, 1);
        }
      }
    } else {
      minTotalDistance = 0;
    }

    setShopGroupedSummary(bestSequence);

    const computedWaypoints = [{ label: "Your Location", lat: startLat, lng: startLng }];
    const computedInstructions = [];
    let currentLat = startLat;
    let currentLng = startLng;
    let counter = 1;

    bestSequence.forEach(nextStop => {
      const segmentDistance = getDist(currentLat, currentLng, nextStop.latitude, nextStop.longitude);
      currentLat = nextStop.latitude;
      currentLng = nextStop.longitude;

      const letter = String.fromCharCode(64 + counter);
      computedWaypoints.push({ label: `Stop ${letter}: ${nextStop.shopName}`, lat: nextStop.latitude, lng: nextStop.longitude });

      const namesOnly = nextStop.items.map(item =>
        `${item.name} (${item.availableQuantity} of ${item.requestedQuantity})`
      );

      computedInstructions.push({
        id: counter,
        icon: "storefront-outline",
        text: `Go to Stop ${letter}: ${nextStop.shopName}`,
detail: `Pick up: ${namesOnly.join(", ")} (${segmentDistance.toFixed(1)} km away)`,      });
      counter++;
    });

    computedInstructions.push({
      id: counter,
      icon: "check-circle",
      text: "Route Optimization Completed",
      detail: "Enjoy your short trip sequence!",
    });

    setWaypoints(computedWaypoints);
    setInstructions(computedInstructions);
    setRouteOverview({
  totalDistance: `${minTotalDistance.toFixed(1)} km`,
  travelTime: `${Math.round((minTotalDistance / 35) * 60) + (bestSequence.length * 4)} mins`,
});
  };

  const handleSelectShop = (itemKey, shopId) => {
    setSelectedShops(prev => ({ ...prev, [itemKey]: shopId }));
  };

  const filteredItems = useMemo(() => {
    return rawPayload?.itemsWithShops.filter(item => {
      if (selectedCategory === "All") return true;
      return item.categoryName === selectedCategory;
    }) || [];
  }, [rawPayload, selectedCategory]);

  const openShopDetails = (opt) => {
    setActiveShopDetails(opt);
    setDetailsModalVisible(true);
  };

  const mapHtmlTemplate = `
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

        function renderRouteUsingOSRM(points) {
          markerGroup.clearLayers();
          polylineGroup.clearLayers();
          if (!points || points.length === 0) return;

          points.forEach(function(p) {
            L.marker([p.lat, p.lng]).addTo(markerGroup).bindPopup('<b>' + p.label + '</b>');
          });

          var coordString = points.map(p => p.lng + ',' + p.lat).join(';');
          var osrmUrl = 'https://router.project-osrm.org/route/v1/driving/' + coordString + '?overview=full&geometries=geojson';

          fetch(osrmUrl)
            .then(res => res.json())
            .then(data => {
              if (data.routes && data.routes.length > 0) {
                var routeCoords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
                L.polyline(routeCoords, { color: '#f06543', weight: 5, opacity: 0.85 }).addTo(polylineGroup);
                map.fitBounds(markerGroup.getBounds(), { padding: [40, 40] });
              }
            })
            .catch(err => {
              polylineGroup.clearLayers();
              var straightLines = points.map(p => [p.lat, p.lng]);
              L.polyline(straightLines, { color: '#ef4444', weight: 4, dashArray: '5, 10' }).addTo(polylineGroup);
              map.fitBounds(markerGroup.getBounds(), { padding: [40, 40] });
            });
        }

        var initialPoints = ${JSON.stringify(waypoints)};
        if (initialPoints && initialPoints.length > 0) { renderRouteUsingOSRM(initialPoints); }

        window.addEventListener('message', function(event) {
          try {
            var message = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
            if (message && message.type === 'UPDATE_WAYPOINTS') { renderRouteUsingOSRM(message.data); }
          } catch(e) {}
        });
      </script>
    </body>
    </html>
  `;

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#2e4466" />
        <Text style={{ marginTop: 12, color: "#64748b", fontWeight: "500" }}>Calculating shortest path permutation...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#eef4fe", "#2e4466"]} start={{ x: 1, y: 0 }} end={{ x: 0, y: 0 }} style={styles.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace("/customerDashboard")} style={styles.backButtonContainer}>
          <Ionicons name="chevron-back" size={28} color="#eef4fe" />
        </TouchableOpacity>
        <Text style={styles.headerTitleText}>Optimize Route</Text>
        <View style={styles.headerSpacer} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.mapCard}>
          {Platform.OS === "web" ? (
            <iframe id="leaflet-route-iframe" srcDoc={mapHtmlTemplate} style={{ width: "100%", height: "100%", border: "none" }} title="OSRM Map Track Preview" />
          ) : (
            <WebView
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
          <Text style={styles.sectionTitle}>Shortest Path Summary</Text>
          <View style={styles.metricRow}>
            <Ionicons name="navigate-outline" size={22} color="#2e4466" />
            <Text style={styles.metricLabel}>Total Minimized Distance:</Text>
            <Text style={styles.metricValue}>{routeOverview.totalDistance}</Text>
          </View>
          <View style={styles.metricRow}>
            <Ionicons name="time-outline" size={22} color="#2e4466" />
            <Text style={styles.metricLabel}>Est. Driving Time:</Text>
            <Text style={styles.metricValue}>{routeOverview.travelTime}</Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Compare & Pick Your Shop</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsContainer}>
            {categories.map((cat, idx) => (
              <TouchableOpacity
                key={idx}
                activeOpacity={0.9}
                style={[styles.chipButton, selectedCategory === cat && styles.activeChipButton]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text style={[styles.chipText, selectedCategory === cat && styles.activeChipText]}>
                  {cat.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {filteredItems.length === 0 ? (
            <Text style={styles.emptyText}>No products found under this category filter.</Text>
          ) : (
            filteredItems.map((item, idx) => (
              <View key={item.itemKey || idx} style={styles.productBlock}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.productNameLabel}>Item: {item.itemName}</Text>
                    <Text style={styles.specsText}>
                      Required Qty: {item.requestedQuantity} | Spec: {item.specification || "None"}
                    </Text>
                  </View>

                  {item.categoryName && (
                    <View style={styles.categoryBadgeContainer}>
                      <Text style={styles.categoryBadgeText}>{item.categoryName}</Text>
                    </View>
                  )}
                </View>

                {item.options.length === 0 ? (
                  <Text style={styles.specsText}>No shops have this exact item specification in stock right now.</Text>
                ) : (
                  item.options.map((opt, oIdx) => {
                    const isSelected = selectedShops[item.itemKey] === opt.shopId;
                    return (
                      <TouchableOpacity
                        key={`${item.itemKey}-${opt.shopId}-${oIdx}`}
                        activeOpacity={0.8}
                        style={[styles.optionRow, isSelected && styles.activeSelectionBorder]}
                        onPress={() => handleSelectShop(item.itemKey, opt.shopId)}
                      >
                        <View style={styles.radioCircle}>
                          {isSelected && <View style={styles.radioInnerDot} />}
                        </View>

                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={styles.shopNameText}>
                            {opt.shopName} {oIdx === 0 && <Text style={{ color: "#10B981", fontSize: 11 }}>(Cheapest)</Text>}
                          </Text>
                          <Text style={styles.specsText}>Specs: {opt.specs || "None"}</Text>
                          <Text style={styles.specsText}>
                            Available: {opt.availableQuantity} of {opt.requestedQuantity}
                          </Text>
                        </View>

                        <View style={{ alignItems: "flex-end", justifyContent: "center", marginLeft: 8 }}>
                          <Pressable
                            onPress={(e) => {
                              e.stopPropagation();
                              openShopDetails(opt);
                            }}
                            hitSlop={8}
                            style={({ pressed }) => [
                              { opacity: pressed ? 0.6 : 1.0, marginBottom: 4, paddingVertical: 4, paddingHorizontal: 8, backgroundColor: "#EFF6FF", borderRadius: 6 },
                            ]}
                          >
                            <Text style={{ fontSize: 10, fontWeight: "700", color: "#2563EB" }}>Shop Details</Text>
                          </Pressable>

                          <Text style={[styles.priceTagText, isSelected && { color: "#2E4466" }]}>
                            Rs. {opt.price}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            ))
          )}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Stops Sequence Based on Choice</Text>
          {instructions.map((item, index) => (
            <View key={index} style={styles.instructionRow}>
              <View style={styles.iconContainer}>
                <MaterialCommunityIcons name={item.icon || "directions"} size={22} color="#64748b" />
              </View>
              <View style={styles.instructionTextContent}>
                <Text style={styles.instructionMainText}>{item.text}</Text>
                <Text style={styles.instructionSubText}>{item.detail}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Shortest Sequence Haul breakdown</Text>
          {shopGroupedSummary.length === 0 ? (
            <Text style={styles.emptyText}>No shop selections confirmed.</Text>
          ) : (
            shopGroupedSummary.map((group, index) => {
              const shopSubtotal = group.items.reduce((acc, curr) => acc + Number(curr.lineTotal || curr.price || 0), 0);

              return (
                <View key={index} style={styles.groupedShopContainer}>
                  <View style={styles.groupedShopHeader}>
                    <Text style={styles.groupedShopName}>Stop {index + 1}: {group.shopName}</Text>
                    <Text style={styles.groupedShopTotal}>Total: Rs. {shopSubtotal}</Text>
                  </View>

                  <View style={styles.groupedItemsList}>
                    {group.items.map((prod, pIdx) => (
                      <View key={pIdx} style={styles.groupedItemRow}>
                        <Text style={styles.groupedItemBullet}>
                          • {prod.name} | Spec: {prod.specification || "None"} | Qty: {prod.availableQuantity} of {prod.requestedQuantity}
                        </Text>
                        <Text style={styles.groupedItemPrice}>Rs. {prod.lineTotal}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      <Modal
        animationType="fade"
        transparent={true}
        visible={detailsModalVisible}
        onRequestClose={() => setDetailsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalHeading}>{activeShopDetails?.shopName || "Shop Details"}</Text>
              <TouchableOpacity onPress={() => setDetailsModalVisible(false)}>
                <Ionicons name="close-circle" size={26} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 300, marginVertical: 12 }}>
              <View style={styles.infoBlock}>
                <Text style={styles.infoLabel}>OPERATIONAL HOURS</Text>
                <Text style={styles.infoValue}>{activeShopDetails?.shopTiming || "No timings set"}</Text>
              </View>

              <View style={styles.infoBlock}>
                <Text style={styles.infoLabel}>PHONE CONTACT</Text>
                <Text style={styles.infoValue}>{activeShopDetails?.shopPhone || "No contact line available"}</Text>
              </View>

              <View style={styles.infoBlock}>
                <Text style={styles.infoLabel}>BUSINESS DESCRIPTION</Text>
                <Text style={styles.infoValue}>{activeShopDetails?.shopDescription || "No registration bio info saved."}</Text>
              </View>
            </ScrollView>

            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setDetailsModalVisible(false)}>
              <Text style={styles.modalCloseButtonText}>Dismiss View</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.tabItem} onPress={() => router.replace("/customerDashboard")}>
          <Ionicons name="home" size={22} color="white" />
          <Text style={styles.navText}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => router.replace("/customerDashboard/savedlist")}>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    height: Platform.OS === "ios" ? 105 : 85,
    paddingTop: Platform.OS === "ios" ? 35 : 0,
  },
  backButtonContainer: { width: 40, alignItems: "flex-start", zIndex: 10 },
  headerSpacer: { width: 40 },
  headerTitleText: { fontSize: 22, fontWeight: "700", color: "#eef4fe", textAlign: "center", flex: 1 },
  scrollContainer: { padding: 16, paddingTop: 25, paddingBottom: 100 },
  mapCard: { width: "100%", height: 250, borderRadius: 24, overflow: "hidden", backgroundColor: "#e2e8f0", elevation: 3, marginBottom: 16 },
  map: { flex: 1 },
  sectionCard: { backgroundColor: "white", borderRadius: 20, paddingHorizontal: 18, paddingTop: 20, paddingBottom: 16, elevation: 2, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#1e293b", marginBottom: 12 },
  chipsContainer: { flexDirection: "row", marginBottom: 16, paddingBottom: 4 },
  chipButton: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: "#f1f5f9", marginRight: 8, borderWidth: 1, borderColor: "#e2e8f0" },
  activeChipButton: { backgroundColor: "#2e4466", borderColor: "#2e4466" },
  chipText: { fontSize: 11, fontWeight: "700", color: "#64748b" },
  activeChipText: { color: "white" },
  categoryBadgeContainer: { backgroundColor: "#eef4fe", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  categoryBadgeText: { fontSize: 10, fontWeight: "600", color: "#2e4466" },
  emptyText: { textAlign: "center", color: "#94a3b8", paddingVertical: 20, fontSize: 14 },
  metricRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8 },
  metricLabel: { flex: 1, fontSize: 14, color: "#475569", marginLeft: 12, fontWeight: "500" },
  metricValue: { fontSize: 14, fontWeight: "600", color: "#1e293b" },
  productBlock: { borderBottomWidth: 1, borderBottomColor: "#F1F5F9", paddingBottom: 12 },
  productNameLabel: { fontSize: 15, fontWeight: "700", color: "#1E293B", marginBottom: 4, marginTop: 20 },
  optionRow: { flexDirection: "row", alignItems: "center", padding: 12, backgroundColor: "#F8FAFC", borderRadius: 12, marginTop: 8, borderWidth: 1, borderColor: "#E2E8F0" },
  activeSelectionBorder: { borderColor: "#2E4466", backgroundColor: "#F0F4FA" },
  radioCircle: { height: 18, width: 18, borderRadius: 9, borderWidth: 2, borderColor: "#2E4466", alignItems: "center", justifyContent: "center" },
  radioInnerDot: { height: 9, width: 9, borderRadius: 4.5, backgroundColor: "#2E4466" },
  shopNameText: { fontSize: 13, fontWeight: "600", color: "#334155" },
  specsText: { fontSize: 12, color: "#64748B", marginTop: 2 },
  priceTagText: { fontSize: 14, fontWeight: "700", color: "#64748B" },
  instructionRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  iconContainer: { width: 32, alignItems: "center" },
  instructionTextContent: { flex: 1, marginLeft: 12 },
  instructionMainText: { fontSize: 14, fontWeight: "500", color: "#334155" },
  instructionSubText: { fontSize: 12, color: "#94a3b8", marginTop: 2 },
  bottomNav: { position: "absolute", bottom: 0, left: 0, right: 0, height: 75, flexDirection: "row", justifyContent: "space-around", alignItems: "center", backgroundColor: "#2e4466", elevation: 10 },
  tabItem: { justifyContent: "center", alignItems: "center" },
  navText: { color: "white", fontSize: 12, marginTop: 4, fontWeight: "500" },
  groupedShopContainer: { marginBottom: 14, backgroundColor: "#F8FAFC", borderRadius: 14, borderWidth: 1, borderColor: "#E2E8F0", padding: 12 },
  groupedShopHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#E2E8F0", paddingBottom: 8, marginBottom: 8 },
  groupedShopName: { fontSize: 14, fontWeight: "700", color: "#1E293B", flex: 1, paddingRight: 8 },
  groupedShopTotal: { fontSize: 13, fontWeight: "700", color: "#10B981" },
  groupedItemsList: { paddingLeft: 6 },
  groupedItemRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginVertical: 3 },
  groupedItemBullet: { fontSize: 13, color: "#475569", fontWeight: "500", flex: 1, paddingRight: 8 },
  groupedItemPrice: { fontSize: 12, color: "#64748B", fontWeight: "600" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.6)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalContentCard: { backgroundColor: "white", borderRadius: 24, padding: 24, width: "100%", maxWidth: 450, elevation: 20 },
  modalHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#f1f5f9", paddingBottom: 12 },
  modalHeading: { fontSize: 18, fontWeight: "800", color: "#1e293b" },
  infoBlock: { marginBottom: 14 },
  infoLabel: { fontSize: 11, fontWeight: "700", color: "#64748b", letterSpacing: 0.5, marginBottom: 4 },
  infoValue: { fontSize: 14, color: "#334155", fontWeight: "500", lineHeight: 20 },
  modalCloseButton: { backgroundColor: "#2e4466", borderRadius: 14, paddingVertical: 12, alignItems: "center", marginTop: 8 },
  modalCloseButtonText: { color: "white", fontWeight: "700", fontSize: 14 },
});