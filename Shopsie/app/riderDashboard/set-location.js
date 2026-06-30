import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Switch,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
import { useRouter, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import * as Location from "expo-location";
import { API_URLS } from '../../src/services/apiConfig';

const DEFAULT_LAT = 31.5204;
const DEFAULT_LNG = 74.3587;

const formatCoords = (lat, lng) =>
  `Lat: ${Number(lat).toFixed(6)} | Lng: ${Number(lng).toFixed(6)}`;

export default function RiderSetLocation() {
  const router = useRouter();
  const webViewRef = useRef(null);

  // ==========================================
  // STATE MANAGEMENT ENTRIES
  // ==========================================
  const [lat, setLat] = useState(DEFAULT_LAT);
  const [lng, setLng] = useState(DEFAULT_LNG);
  const [label, setLabel] = useState("Current rider location");
  const [search, setSearch] = useState("");
  const [isLocationOn, setIsLocationOn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [warning, setWarning] = useState("");

  // ==========================================
  // UTILITY NOTIFICATION HANDLERS
  // ==========================================
  const triggerWarning = (message) => {
    setWarning(message);
    setTimeout(() => {
      setWarning("");
    }, 3000);
  };

  // ==========================================
  // HTTP REMOTE API DATA INTERACTIONS
  // ==========================================
  const loadLocation = useCallback(async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");

      const res = await axios.get(`${API_URLS.RIDER}/me/location`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = res.data;
      if (data && data.currentLat !== null && data.currentLng !== null) {
        setLat(Number(data.currentLat));
        setLng(Number(data.currentLng));
        setLabel(data.locationLabel || "Saved Location");
        setIsLocationOn(Boolean(data.isLocationOn));
      }
    } catch (e) {
      console.log("Load location error:", e.message);
      triggerWarning("Could not refresh background data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadLocation();
    }, [loadLocation])
  );

  // ==========================================
  // WEB & MOBILE WEBVIEW POST-MESSAGE BRIDGE
  // ==========================================
  useEffect(() => {
    const payload = { type: "UPDATE_LOCATION", lat: Number(lat), lng: Number(lng) };

    if (Platform.OS === "web") {
      document
        .getElementById("rider-location-map")
        ?.contentWindow?.postMessage(JSON.stringify(payload), "*");
    } else if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        window.dispatchEvent(new MessageEvent('message', {
          data: ${JSON.stringify(JSON.stringify(payload))}
        }));
        true;
      `);
    }
  }, [lat, lng]);

  // ==========================================
  // HARDWARE PERMISSION AND LOCATION HANDLERS
  // ==========================================
  const saveLocation = async (nextOnline = isLocationOn) => {
    try {
      const nextLat = Number(lat);
      const nextLng = Number(lng);

      if (!Number.isFinite(nextLat) || !Number.isFinite(nextLng)) {
        return Alert.alert("Invalid location", "Please select a valid rider location.");
      }

      setSaving(true);
      const token = await AsyncStorage.getItem("token");

      const res = await axios.post(
        `${API_URLS.RIDER}/me/location`,
        {
          lat: nextLat,
          lng: nextLng,
          label: label || "Current rider location",
          isLocationOn: Boolean(nextOnline),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      setLat(Number(res.data.currentLat));
      setLng(Number(res.data.currentLng));
      setLabel(res.data.locationLabel || "Current rider location");
      setIsLocationOn(Boolean(res.data.isLocationOn));

      setSuccessMsg(
        Boolean(res.data.isLocationOn)
          ? "Location saved. You are now on duty."
          : "Location saved. You are off duty."
      );

      setTimeout(() => {
        setSuccessMsg("");
      }, 2500);
    } catch (e) {
      triggerWarning(e.response?.data?.message || e.message || "Could not save location");
    } finally {
      setSaving(false);
    }
  };

  const useGps = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        return Alert.alert("Permission denied", "Allow location access first.");
      }

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setLat(Number(current.coords.latitude));
      setLng(Number(current.coords.longitude));
      setLabel("GPS current location");
    } catch (e) {
      triggerWarning("Could not get GPS location.");
    }
  };

  const searchLocation = async () => {
    const query = search.trim();
    if (!query) return;

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`,
        { headers: { "User-Agent": "ShoppingRiderApp/1.0" } }
      );
      const data = await res.json();

      if (!data?.length) {
        return Alert.alert("Not found", "No matching location found.");
      }

      setLat(Number(data[0].lat));
      setLng(Number(data[0].lon));
      setLabel(data[0].display_name || query);
    } catch (e) {
      triggerWarning("Could not search location.");
    }
  };

  const onMapMessage = (event) => {
    try {
      const raw = Platform.OS === "web" ? event.data : event.nativeEvent.data;
      const payload = typeof raw === "string" ? JSON.parse(raw) : raw;

      if (payload.lat !== undefined && payload.lng !== undefined) {
        setLat(Number(payload.lat));
        setLng(Number(payload.lng));
        setLabel("Selected rider location");
      }
    } catch (e) {}
  };

  const mapHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          body, html, #map { margin: 0; padding: 0; height: 100%; width: 100%; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var map = L.map('map').setView([${Number(lat)}, ${Number(lng)}], 14);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
          var marker = L.marker([${Number(lat)}, ${Number(lng)}], { draggable: true }).addTo(map);

          function send(lat, lng) {
            var payload = JSON.stringify({ lat: lat, lng: lng });
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(payload);
            } else {
              window.parent.postMessage(payload, "*");
            }
          }

          function updateLocation(lat, lng) {
            var next = [Number(lat), Number(lng)];
            marker.setLatLng(next);
            map.setView(next, 14);
          }

          marker.on('dragend', function() {
            var p = marker.getLatLng();
            send(p.lat, p.lng);
          });

          map.on('click', function(e) {
            marker.setLatLng(e.latlng);
            send(e.latlng.lat, e.latlng.lng);
          });

          window.addEventListener('message', function(event) {
            try {
              var payload = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
              if (payload && payload.type === 'UPDATE_LOCATION') {
                updateLocation(payload.lat, payload.lng);
              }
            } catch (e) {}
          });
        </script>
      </body>
    </html>
  `;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2e4466" />
      </View>
    );
  }

  // ==========================================
  // ROOT UI SCREEN PRESENTATION ENGINE
  // ==========================================
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={styles.container}>
        
        <LinearGradient colors={["#eef4fe", "#2e4466"]} start={{ x: 1, y: 0 }} end={{ x: 0, y: 0 }} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color="#eef4fe" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Set Location</Text>
          <View style={{ width: 28 }} />
        </LinearGradient>

        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"} 
          style={{ flex: 1 }}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollBody} 
            showsVerticalScrollIndicator={false}
          >
            {!!successMsg && (
              <View style={styles.successBox}>
                <Text style={styles.successText}>{successMsg}</Text>
              </View>
            )}

            <View style={styles.searchRow}>
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search location"
                style={styles.input}
                placeholderTextColor="#94a3b8"
                color="#334155"
              />
              <TouchableOpacity style={styles.iconBtn} onPress={searchLocation}>
                <Ionicons name="search" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.mapBox}>
              {Platform.OS === "web" ? (
                <iframe
                  id="rider-location-map"
                  srcDoc={mapHtml}
                  style={{ width: "100%", height: "100%", border: "none" }}
                />
              ) : (
                <WebView
                  ref={webViewRef}
                  source={{ html: mapHtml }}
                  onMessage={onMapMessage}
                  javaScriptEnabled
                  domStorageEnabled
                />
              )}
            </View>

            <Text style={styles.labelText} numberOfLines={1}>{label}</Text>
            <Text style={styles.coordsText}>{formatCoords(lat, lng)}</Text>

            <TouchableOpacity style={styles.gpsBtn} onPress={useGps}>
              <Ionicons name="locate" size={18} color="#2e4466" />
              <Text style={styles.gpsText}>Use GPS</Text>
            </TouchableOpacity>

            <View style={styles.toggleRow}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.toggleTitle}>Show location to customers</Text>
                <Text style={styles.toggleSub}>
                  {isLocationOn ? "You are online for rider requests." : "You are off duty."}
                </Text>
              </View>
              <Switch
                value={isLocationOn}
                disabled={saving}
                onValueChange={(next) => saveLocation(next)}
              />
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={() => saveLocation(isLocationOn)}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveText}>Save Location</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>

        {!!warning && (
          <View style={styles.warningBox}>
            <Ionicons name="warning" size={20} color="#fff" />
            <Text style={styles.warningText}>{warning}</Text>
          </View>
        )}

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
    </SafeAreaView>
  );
}

// ==========================================
// CENTRAL DESIGN LAYOUT REGISTRY
// ==========================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f8fafc" },
  header: { height: 85, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { flex: 1, color: "#2e4466", fontSize: 22, fontWeight: "700", textAlign: "center" },
  scrollBody: { padding: 16, paddingBottom: 100 },
  successBox: { backgroundColor: "#d1fae5", padding: 10, borderRadius: 10, marginBottom: 12 },
  successText: { color: "#065f46", fontWeight: "700", textAlign: "center" },
  searchRow: { flexDirection: "row", marginBottom: 12 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#fff",
    color: "#334155",
  },
  iconBtn: {
    marginLeft: 8,
    backgroundColor: "#2e4466",
    paddingHorizontal: 16,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  mapBox: { height: 250, borderRadius: 16, overflow: "hidden", backgroundColor: "#e2e8f0" },
  labelText: { marginTop: 12, fontWeight: "700", color: "#1e293b", fontSize: 14 },
  coordsText: { color: "#64748b", fontSize: 12, marginTop: 2 },
  gpsBtn: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#eef4fe",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  gpsText: { marginLeft: 6, fontWeight: "700", color: "#2e4466" },
  toggleRow: {
    flexDirection: "row",
    marginTop: 12,
    padding: 12,
    backgroundColor: "#fff",
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  toggleTitle: { fontWeight: "700", color: "#1e293b", fontSize: 14 },
  toggleSub: { color: "#64748b", fontSize: 12, marginTop: 2 },
  saveBtn: {
    marginTop: 14,
    backgroundColor: "#2e4466",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveText: { color: "#fff", fontWeight: "800", fontSize: 15 },
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
    position: 'absolute',
    bottom: 90,
    left: 20,
    right: 20,
    backgroundColor: '#e67e22',
    padding: 14,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 9999,
    elevation: 6,
  },
  warningText: { color: '#fff', marginLeft: 10, fontSize: 14, fontWeight: '600', flex: 1 },
});