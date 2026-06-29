import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  Platform,
  StatusBar,
  KeyboardAvoidingView,
} from "react-native";
import BottomNav from "./BottomNav";
import React, { useState, useEffect, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { WebView } from "react-native-webview";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { API_URLS } from '../../src/services/apiConfig';

const { width } = Dimensions.get("window");

export default function ShopDetails() {
  const router = useRouter();
  const webViewRef = useRef(null);

  // Form Fields State
  const [shopName, setShopName] = useState("");
  const [city, setCity] = useState("");
  const [latitude, setLatitude] = useState("31.464836"); 
  const [longitude, setLongitude] = useState("74.289090");
  const [phone, setPhone] = useState("");
  const [timing, setTiming] = useState("");
  const [description, setDescription] = useState("");
  const [searchLocation, setSearchLocation] = useState("");
  const [searchingLocation, setSearchingLocation] = useState(false);

  // App Lifecycle States
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false); 
  const [hasExistingProfile, setHasExistingProfile] = useState(false);

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
    fetchSavedShopDetails();
    return () => {
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handleWebMessage = (e) => {
      try {
        const coords = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        if (coords.latitude && coords.longitude) {
          setLatitude(coords.latitude.toFixed(6).toString());
          setLongitude(coords.longitude.toFixed(6).toString());
        }
      } catch (err) {}
    };
    window.addEventListener("message", handleWebMessage);
    return () => window.removeEventListener("message", handleWebMessage);
  }, []);

  useEffect(() => {
    if (loading) return;
    const jsCode = `
      if (typeof map !== 'undefined' && typeof marker !== 'undefined') {
        var newLatLng = new L.LatLng(${latitude}, ${longitude});
        marker.setLatLng(newLatLng);
        map.setView(newLatLng, map.getZoom());
      }
    `;
    if (Platform.OS === 'web') {
      const iframe = document.getElementById("leaflet-iframe");
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage(JSON.stringify({ type: 'UPDATE_COORDS', lat: latitude, lng: longitude }), "*");
      }
    } else if (webViewRef.current) {
      webViewRef.current.injectJavaScript(jsCode);
    }
  }, [latitude, longitude, loading]);

  const fetchSavedShopDetails = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        setHasExistingProfile(false);
        setIsEditMode(true);
        return;
      }

      const response = await fetch(API_URLS.SHOP_PROFILE_GET, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();

      if (response.ok && data.success && data.profileExists) {
        setShopName(data.shop.shopName || "");
        setCity(data.shop.city || "");
        setLatitude(data.shop.latitude?.toString() || "31.464836");
        setLongitude(data.shop.longitude?.toString() || "74.289090");
        setPhone(data.shop.phone || "");
        setTiming(data.shop.timing || "");
        setDescription(data.shop.description || "");
        setHasExistingProfile(true);
        setIsEditMode(false);
      } else {
        setHasExistingProfile(false);
        setIsEditMode(true);
        setShopName(data.shop?.shopName || "");
        await fetchCurrentGPSLocation(true);
      }
    } catch (err) {
      triggerWarningNotification(`Could not connect to server: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentGPSLocation = async (quiet = false) => {
    try {
      setLocating(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        if (!quiet) triggerWarningNotification("Warning: Allow location access to find your shop.");
        return;
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLatitude(location.coords.latitude.toString());
      setLongitude(location.coords.longitude.toString());
      if (!quiet) triggerWarningNotification("Success: Store pinpoint updated via live phone GPS!");
    } catch (err) {
      if (!quiet) triggerWarningNotification("Warning: Could not detect location automatically.");
    } finally {
      setLocating(false);
    }
  };

  const searchAndMovePin = async () => {
    if (!searchLocation.trim()) {
      triggerWarningNotification("Warning: Please enter a location name before searching.");
      return;
    }
    try {
      setSearchingLocation(true);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchLocation)}`,
        { headers: { "User-Agent": "ShopKeeperMobileApp/1.0", "Accept-Language": "en" } }
      );
      if (!response.ok) throw new Error(`HTTP Error Status: ${response.status}`);
      const results = await response.json();

      if (!results || results.length === 0) {
        triggerWarningNotification("Warning: Location name not found. Try adding a city name.");
        return;
      }
      const lat = parseFloat(results[0].lat);
      const lng = parseFloat(results[0].lon);
      setLatitude(lat.toFixed(6));
      setLongitude(lng.toFixed(6));
      if (webViewRef.current) {
        webViewRef.current.injectJavaScript(`
          if (typeof marker !== 'undefined' && typeof map !== 'undefined') {
            marker.setLatLng([${lat}, ${lng}]);
            map.flyTo([${lat}, ${lng}], 17);
          }
          true;
        `);
      }
      triggerWarningNotification("Success: Found location and map marker shifted.");
    } catch (error) {
      triggerWarningNotification("Warning: Failed to query location. Check your internet connection.");
    } finally {
      setSearchingLocation(false);
    }
  };

  const handleMapMessage = (event) => {
    try {
      const coords = JSON.parse(event.nativeEvent.data);
      if (coords.latitude && coords.longitude) {
        setLatitude(coords.latitude.toFixed(6).toString());
        setLongitude(coords.longitude.toFixed(6).toString());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveOrUpdate = async () => {
    if (!shopName || !city || !latitude || !longitude || !phone || !timing || !description) {
      triggerWarningNotification("Warning: Please complete all registration fields.");
      return;
    }
    try {
      setSaving(true);
      const token = await AsyncStorage.getItem("token");
      const response = await fetch(API_URLS.SHOP_PROFILE_UPDATE, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          shopName, city, latitude: parseFloat(latitude), longitude: parseFloat(longitude), phone, timing, description,
        }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setHasExistingProfile(true);
        setIsEditMode(false);
        setShopName(data.shop.shopName);
        setCity(data.shop.city);
        setPhone(data.shop.phone);
        setTiming(data.shop.timing);
        setDescription(data.shop.description);
        triggerWarningNotification("Success: Shop metadata updates saved securely!");
      } else {
        triggerWarningNotification(data.message || "Warning: Failed to save changes to profile.");
      }
    } catch (err) {
      triggerWarningNotification(`Warning: Network connection breakdown: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={localStyles.centered}>
        <ActivityIndicator size="large" color="#1E3A8A" />
        <Text style={localStyles.loadingText}>Syncing your shop records...</Text>
      </View>
    );
  }

  const leafletHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>body, html, #map { margin: 0; padding: 0; height: 100%; width: 100%; background: #f8fafc; } .leaflet-attribution-flag { display: none !important; }</style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map', {
          dragging: ${isEditMode}, touchZoom: ${isEditMode}, scrollWheelZoom: ${isEditMode}, doubleClickZoom: ${isEditMode}, boxZoom: ${isEditMode}, zoomControl: ${isEditMode}
        }).setView([${latitude}, ${longitude}], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
        var marker = L.marker([${latitude}, ${longitude}], { draggable: ${isEditMode} }).addTo(map);
        ${isEditMode ? `marker.bindPopup("<b>Drag pin to store entrance</b>").openPopup();` : `marker.bindPopup("<b>${shopName || "My Store"}</b>").openPopup();`}
        function broadcastCoords(lat, lng) {
          var coords = { latitude: lat, longitude: lng };
          if (window.ReactNativeWebView) { window.ReactNativeWebView.postMessage(JSON.stringify(coords)); }
          else { window.parent.postMessage(JSON.stringify(coords), "*"); }
        }
        marker.on('dragend', function(event) { var position = marker.getLatLng(); broadcastCoords(position.lat, position.lng); });
      </script>
    </body>
    </html>
  `;

  return (
    <View style={localStyles.mainContainer}>
      <StatusBar barStyle="light-content" />
      
      {/* HEADER */}
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
            {isEditMode ? "Edit Shop" : "Shop Profile"}
          </Text>
        </View>
        <View style={{ width: 28 }} />
      </LinearGradient>

      {/* FIXED NATIVE CONTAINER AND BEHAVIOR SETTINGS */}
      <KeyboardAvoidingView 
        style={localStyles.flexContainer} 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={localStyles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={localStyles.contentBody}>
            
            {/* SECTION 1: General Information */}
            <Text style={localStyles.sectionHeading}>General Information</Text>
            <View style={localStyles.card}>
              <Text style={localStyles.fieldLabel}>Shop Name</Text>
              <View style={[localStyles.inputWrapper, !isEditMode && localStyles.disabledWrapper]}>
                <Ionicons name="storefront-outline" size={20} color={isEditMode ? "#64748B" : "#94A3B8"} style={localStyles.inputIcon} />
                <TextInput
                  placeholder="Enter Shop Name"
                  placeholderTextColor="#94A3B8"
                  value={shopName}
                  onChangeText={setShopName}
                  editable={isEditMode}
                  style={[localStyles.baseInputOverride, !isEditMode && localStyles.disabledTextOverride]}
                />
              </View>
            
              <Text style={localStyles.fieldLabel}>City</Text>
              <View style={[localStyles.inputWrapper, !isEditMode && localStyles.disabledWrapper]}>
                <Ionicons name="business-outline" size={20} color={isEditMode ? "#64748B" : "#94A3B8"} style={localStyles.inputIcon} />
                <TextInput
                  placeholder="Enter City"
                  placeholderTextColor="#94A3B8"
                  value={city}
                  onChangeText={setCity}
                  editable={isEditMode}
                  style={[localStyles.baseInputOverride, !isEditMode && localStyles.disabledTextOverride]}
                />
              </View>

              <Text style={localStyles.fieldLabel}>Phone</Text>
              <View style={[localStyles.inputWrapper, !isEditMode && localStyles.disabledWrapper]}>
                <Ionicons name="call-outline" size={20} color={isEditMode ? "#64748B" : "#94A3B8"} style={localStyles.inputIcon} />
                <TextInput
                  placeholder="Enter Phone Number"
                  placeholderTextColor="#94A3B8"
                  value={phone}
                  onChangeText={setPhone}
                  editable={isEditMode}
                  keyboardType="phone-pad"
                  style={[localStyles.baseInputOverride, !isEditMode && localStyles.disabledTextOverride]}
                />
              </View>
            </View>

            {/* SECTION 2: Storefront Pinpoint */}
            <View style={localStyles.mapHeaderRow}>
              <View style={{ flex: 1 }}>
                <View style={localStyles.flexRowAlignCenter}>
                  <Ionicons name="location" size={18} color="#1E3A8A" style={{ marginRight: 6 }} />
                  <Text style={localStyles.mapSectionTitle}>Shopfront Pinpoint</Text>
                </View>
                <Text style={localStyles.mapHelpText}>
                  {isEditMode ? "Hold and drag the marker pin directly onto your storefront door location." : "This is your currently saved location coordinate displayed to drivers."}
                </Text>

                {isEditMode && (
                  <View style={localStyles.searchContainer}>
                    <TextInput
                      placeholder="Search shop location..."
                      placeholderTextColor="#94A3B8"
                      value={searchLocation}
                      onChangeText={setSearchLocation}
                      style={localStyles.searchInput}
                    />
                    <TouchableOpacity onPress={searchAndMovePin} disabled={searchingLocation} style={localStyles.searchButton}>
                      {searchingLocation ? <ActivityIndicator color="#fff" /> : <Text style={localStyles.searchButtonText}>Search</Text>}
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {isEditMode && (
                <TouchableOpacity onPress={() => fetchCurrentGPSLocation(false)} disabled={locating} style={localStyles.gpsButton} activeOpacity={0.7}>
                  <Ionicons name="locate" size={14} color="#0284C7" style={{ marginRight: 4 }} />
                  <Text style={localStyles.gpsButtonText}>{locating ? "Locating..." : "Use GPS"}</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={localStyles.mapCardWrapper}>
              {Platform.OS === "web" ? (
                <iframe id="leaflet-iframe" srcDoc={leafletHTML} style={{ width: "100%", height: "100%", border: "none" }} title="Map" />
              ) : (
                <WebView ref={webViewRef} originWhitelist={["*"]} source={{ html: leafletHTML }} onMessage={handleMapMessage} style={{ flex: 1 }} />
              )}
            </View>

            {/* Coordinate Grid UI */}
            <View style={localStyles.coordinatesGrid}>
              <View style={localStyles.coordinateHalf}>
                <Text style={localStyles.coordLabel}>Latitude</Text>
                <View style={[localStyles.coordValueBox, localStyles.latitudeBoxAccent]}>
                  <Ionicons name="git-commit-outline" size={14} color="#0284C7" style={localStyles.coordIcon} />
                  <Text style={[localStyles.coordValueText, localStyles.latitudeTextAccent]}>{latitude}</Text>
                </View>
              </View>
              <View style={localStyles.coordinateHalf}>
                <Text style={localStyles.coordLabel}>Longitude</Text>
                <View style={[localStyles.coordValueBox, localStyles.longitudeBoxAccent]}>
                  <Ionicons name="git-commit-outline" size={14} color="#0284C7" style={localStyles.coordIcon} />
                  <Text style={[localStyles.coordValueText, localStyles.longitudeTextAccent]}>{longitude}</Text>
                </View>
              </View>
            </View>

            {/* SECTION 3: Business Hours */}
            <Text style={localStyles.sectionHeading}>Business Hours</Text>
            <View style={localStyles.card}>
              <Text style={localStyles.fieldLabel}>Timings</Text>
              <View style={[localStyles.inputWrapper, !isEditMode && localStyles.disabledWrapper]}>
                <Ionicons name="time-outline" size={20} color={isEditMode ? "#64748B" : "#94A3B8"} style={localStyles.inputIcon} />
                <TextInput
                  placeholder="e.g., Monday - Sunday 9:00 AM - 6:00 PM"
                  placeholderTextColor="#94A3B8"
                  value={timing}
                  onChangeText={setTiming}
                  editable={isEditMode}
                  style={[localStyles.baseInputOverride, !isEditMode && localStyles.disabledTextOverride]}
                />
              </View>
            </View>

            {/* SECTION 4: Description Details */}
            <Text style={localStyles.sectionHeading}>Description</Text>
            <View style={localStyles.card}>
              <Text style={localStyles.fieldLabel}>About Shop</Text>
              <View style={[localStyles.inputWrapper, !isEditMode && localStyles.disabledWrapper, localStyles.textAreaWrapper]}>
                <TextInput
                  placeholder="Enter details about your shop items..."
                  placeholderTextColor="#94A3B8"
                  value={description}
                  onChangeText={setDescription}
                  editable={isEditMode}
                  multiline={true}
                  numberOfLines={4}
                  style={[localStyles.baseInputOverride, !isEditMode && localStyles.disabledTextOverride, localStyles.textAreaInput]}
                />
              </View>
            </View>

            {/* Action Row Buttons */}
            {isEditMode ? (
              <View style={localStyles.actionRow}>
                {hasExistingProfile ? (
                  <>
                    <TouchableOpacity onPress={() => setIsEditMode(false)} style={[localStyles.actionButtonHalf, localStyles.cancelButtonColor]}>
                      <Text style={localStyles.actionButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleSaveOrUpdate} style={[localStyles.actionButtonHalf, localStyles.saveButtonColor]} disabled={saving}>
                      {saving ? <ActivityIndicator color="white" /> : <Text style={localStyles.actionButtonText}>Save Changes</Text>}
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity onPress={handleSaveOrUpdate} style={[localStyles.fullEditButton, localStyles.saveButtonColor]} disabled={saving}>
                    {saving ? <ActivityIndicator color="white" /> : <Text style={localStyles.fullEditButtonText}>Save Shop Details</Text>}
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <TouchableOpacity onPress={() => setIsEditMode(true)} style={localStyles.fullEditButton}>
                <Ionicons name="create-outline" size={20} color="white" style={{ marginRight: 8 }} />
                <Text style={localStyles.fullEditButtonText}>Edit Shop Details</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ORANGE WARNING BANNER */}
      {warningMessage ? (
        <View style={localStyles.warningBox}>
          <Ionicons name={warningMessage.startsWith("Success") ? "checkmark-circle-outline" : "warning-outline"} size={22} color="#fff" />
          <Text style={localStyles.warningText}>{warningMessage}</Text>
        </View>
      ) : null}

      {/* FIXED BOTTOM NAVIGATION BAR */}
      <BottomNav />
    </View>
  );
}

const localStyles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#F8FAFC' },
  flexContainer: { flex: 1 },
  
  // Clean padding that keeps content viewable without giant empty gutters
  scrollContainer: {
  paddingVertical: 12,
  paddingBottom: 85,
},
  
  contentBody: { paddingHorizontal: 20 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: '#FFFFFF' },
  loadingText: { marginTop: 12, color: "#64748B", fontWeight: "500", fontSize: 15 },
  
  gradientHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 26, width: '100%', elevation: 3 },
  headerCenterContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerTitleText: { fontSize: 20, fontWeight: '700', color: '#2e4466', textAlign: 'center' },
  
  sectionHeading: { fontSize: 16, fontWeight: '700', color: '#1E293B', marginTop: 22, marginBottom: 6 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginTop: 5, marginBottom: 5, shadowColor: '#475569', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 4 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#CBD5E1', borderRadius: 12, marginBottom: 16, paddingHorizontal: 12, backgroundColor: '#FFFFFF' },
  disabledWrapper: { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0' },
  inputIcon: { marginRight: 8 },
  baseInputOverride: { flex: 1, height: 48, fontSize: 15, color: '#0F172A', ...Platform.select({ web: { outlineStyle: 'none' } }) },
  disabledTextOverride: { color: '#64748B', fontWeight: '500' },
  
  textAreaWrapper: { alignItems: 'flex-start', paddingVertical: 10 },
  textAreaInput: { height: 80, textAlignVertical: 'top' },

  mapHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginTop: 20, marginBottom: 4 },
  flexRowAlignCenter: { flexDirection: 'row', alignItems: 'center' },
  mapSectionTitle: { fontWeight: '700', fontSize: 16, color: '#1E293B' },
  mapHelpText: { fontSize: 13, color: '#64748B', marginBottom: 12, lineHeight: 18 },
  
  gpsButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 6, backgroundColor: "#E0F2FE", paddingHorizontal: 10, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: "#BAE6FD" },
  gpsButtonText: { color: '#0284C7', fontWeight: '700', fontSize: 12 },
  mapCardWrapper: { height: 240, width: '100%', borderRadius: 16, overflow: 'hidden', borderWidth: 1.5, borderColor: '#CBD5E1', backgroundColor: '#FFFFFF' },
  
  coordinatesGrid: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, marginBottom: 10 },
  coordinateHalf: { width: '48%' },
  coordLabel: { fontSize: 12, color: '#475569', fontWeight: '700', marginBottom: 6, textTransform: 'uppercase' },
  coordValueBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 8 },
  coordIcon: { marginRight: 5 },
  coordValueText: { fontSize: 14, fontFamily: 'monospace', fontWeight: '700' },
  
  latitudeBoxAccent: { backgroundColor: '#F0F9FF', borderColor: '#BAE6FD' },
  latitudeTextAccent: { color: '#0369A1' },
  longitudeBoxAccent: { backgroundColor: '#F0FDF4', borderColor: '#BAE6FD' },
  longitudeTextAccent: { color: '#0369A1' },
  
  actionRow: { flexDirection: 'row', justifyContent: 'center', width: '100%', marginTop: 25, gap: 12 },
  actionButtonHalf: { flex: 1, maxWidth: '48%', borderRadius: 14, height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  cancelButtonColor: { backgroundColor: '#EF4444' },
  saveButtonColor: { backgroundColor: '#22C55E' },
  actionButtonText: { color: 'white', fontWeight: '700', fontSize: 15 },
  fullEditButton: { width: '100%', flexDirection: 'row', backgroundColor: '#22C55E', borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center', marginTop: 25 },
  fullEditButtonText: { color: 'white', fontWeight: '700', fontSize: 15 },
  searchContainer: { flexDirection: "row", alignItems: "center", marginBottom: 12, marginTop: 10, gap: 8 },
  searchInput: { flex: 1, height: 46, borderWidth: 1.5, borderColor: "#CBD5E1", borderRadius: 12, backgroundColor: "#FFFFFF", paddingHorizontal: 14, fontSize: 14, color: "#0F172A" },
  searchButton: { height: 46, paddingHorizontal: 18, backgroundColor: "#2e4466", borderRadius: 12, justifyContent: "center", alignItems: "center", minWidth: 90 },
  searchButtonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },

  warningBox: {
    position: 'absolute',
    bottom: 85, 
    left: 20,
    right: 20,
    backgroundColor: '#e67e22',
    padding: 14,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 9999,
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  warningText: { color: '#fff', marginLeft: 10, fontSize: 14, fontWeight: '600', flex: 1 },
});