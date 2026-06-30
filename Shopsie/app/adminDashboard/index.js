import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  TextInput,
  Modal,
  Dimensions,
  Platform,
  BackHandler,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import styles from "../styles/dashboardAdmin";
import { API_URLS } from "../../src/services/apiConfig";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";

const API = API_URLS.ADMIN;
const UPLOADS = API_URLS.UPLOADS;
const SCREEN_WIDTH = Dimensions.get("window").width;
const DEFAULT_IMAGE = "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";

function ConfirmationModal({
  confirmModal,
  suspensionReason,
  setSuspensionReason,
  closeConfirmModal,
  handleConfirmAction,
  styles,
}) {
  return (
    <Modal
      animationType="fade"
      transparent
      visible={confirmModal.visible}
      onRequestClose={closeConfirmModal}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalBox}>
          <TouchableOpacity
            onPress={closeConfirmModal}
            style={styles.closeCornerBtn}
          >
            <Ionicons name="close" size={24} color="#94a3b8" />
          </TouchableOpacity>

          <Text style={styles.confirmModalTitle}>{confirmModal.title}</Text>

          <Text style={styles.modalSubtitle}>{confirmModal.message}</Text>

          {confirmModal.reasonRequired && (
            <>
              <TextInput
                style={[
                  styles.input,
                  {
                    width: "100%",
                    alignSelf: "stretch",
                    minHeight: 96,
                    textAlignVertical: "top",
                    marginBottom: 0,
                    paddingHorizontal: 12,
                  },
                ]}
                placeholder="Reason for suspension"
                placeholderTextColor="#94a3b8"
                multiline={true}
                autoFocus={false}
                blurOnSubmit={false}
                autoCorrect={false}
                spellCheck={false}
                maxLength={800}
                value={suspensionReason}
                onChangeText={(text) => setSuspensionReason(text)}
              />

              <Text
                style={[
                  styles.reportMeta,
                  {
                    textAlign: "right",
                    margin: 4,
                  },
                ]}
              >
                {suspensionReason.length}/800
              </Text>
            </>
          )}

          <View style={styles.shareButtonsRow}>
            <TouchableOpacity
              style={styles.cancelModalBtn}
              onPress={closeConfirmModal}
            >
              <Text style={styles.cancelModalText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={
                confirmModal.isDanger
                  ? styles.dangerModalBtn
                  : styles.successModalBtn
              }
              onPress={handleConfirmAction}
            >
              <Text style={styles.dangerModalText}>
                {confirmModal.confirmText}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function AdminDashboard() {
  const router = useRouter();

  const [activeScreen, setActiveScreen] = useState("dashboard");
  const [adminUsername, setAdminUsername] = useState("Admin");
  const [adminProfileImage, setAdminProfileImage] = useState(DEFAULT_IMAGE);
  const [stats, setStats] = useState(null);
  const [riders, setRiders] = useState([]);
  const [users, setUsers] = useState([]);
  const [shopReports, setShopReports] = useState([]);
  const [reportWarnings, setReportWarnings] = useState([]);
  const [currentAdminId, setCurrentAdminId] = useState(null);
  const [message, setMessage] = useState("");
  const [adminNotifications, setAdminNotifications] = useState([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const [reportCount, setReportCount] = useState(0);
  const [warningMessage, setWarningMessage] = useState("");
  const [suspensionReason, setSuspensionReason] = useState("");

  const [formUsername, setFormUsername] = useState("");
  const [formPassword, setFormPassword] = useState("");

  const [imageModal, setImageModal] = useState(false);
  const [images, setImages] = useState([]);
  const [imageIndex, setImageIndex] = useState(0);
  const [confirmModal, setConfirmModal] = useState({
    visible: false,
    title: "",
    message: "",
    confirmText: "Confirm",
    onConfirm: null,
    isDanger: false,
    reasonRequired: false,
    reasonText: "",
  });

  /* ================= INTERCEPT MOBILE BACK BUTTON ================= */
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (activeScreen !== "dashboard") {
          setActiveScreen("dashboard");
          return true;
        }
        return false;
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );

      return () => subscription.remove();
    }, [activeScreen]),
  );

  const getProfileImageUri = (image) => {
    if (!image) return null;
    if (
      image.startsWith("http") ||
      image.startsWith("data:") ||
      image.startsWith("file:")
    )
      return image;

    const normalized = image.replace(/\\/g, "/").replace(/^\/+/, "");
    const cleanPath = normalized.startsWith("uploads/")
      ? normalized.replace("uploads/", "")
      : normalized;

    return `${UPLOADS}/${cleanPath}`;
  };

  const openConfirmModal = ({
    title,
    message: modalMessage,
    confirmText,
    onConfirm,
    isDanger = false,
    reasonRequired = false,
  }) => {
    setSuspensionReason("");

    setConfirmModal({
      visible: true,
      title,
      message: modalMessage,
      confirmText,
      onConfirm,
      isDanger,
      reasonRequired,
      reasonText: "",
    });
  };

  const closeConfirmModal = () => {
    setConfirmModal((prev) => ({ ...prev, visible: false }));
  };

  const handleConfirmAction = async () => {
    const action = confirmModal.onConfirm;
    const reason = suspensionReason.trim();

    if (confirmModal.reasonRequired && !reason) {
      showWarning("Please write a reason");
      return;
    }

    if (!action) return;

    try {
      setConfirmModal((prev) => ({ ...prev, visible: false }));
      await action(reason);
    } catch (err) {
      console.log("Confirm action error:", err);
      showWarning("Something went wrong");
    }
  };

  const approveShopRevert = async (shopkeeperId) => {
    const headers = await getAuthHeaders();
    const res = await fetch(
      `${API}/shopkeepers/${shopkeeperId}/approve-revert`,
      {
        method: "PATCH",
        headers,
      },
    );

    const data = await res.json();

    if (!res.ok) {
      showWarning(data.message || "Approval failed");
      return;
    }

    showMessage("Shop restored successfully ✅");
    loadShopReports();
    loadReportWarnings();
    loadAdminNotifications();
  };

  /* ================= AUTH HEADER ================= */
  const getAuthHeaders = async () => {
    const token = await AsyncStorage.getItem("token");
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  };

  /* ================= LOAD ADMIN INFO ================= */
  useEffect(() => {
    const loadAdmin = async () => {
      const data = await AsyncStorage.getItem("userData");
      if (data) {
        const parsedData = JSON.parse(data);
        setCurrentAdminId(parsedData.id);
        setAdminUsername(parsedData.username || "Admin");
        setAdminProfileImage(
          getProfileImageUri(parsedData.profileImage) || DEFAULT_IMAGE,
        );
      }
    };
    loadAdmin();
    loadReportWarnings();
    loadAdminNotifications();
    loadReportCount();
  }, []);

  useEffect(() => {
    if (activeScreen !== "dashboard") return;

    const interval = setInterval(() => {
      if (!confirmModal.visible) {
        loadReportCount();
        loadAdminNotifications();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [activeScreen]);

  const showMessage = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 3000);
  };

  const showWarning = (msg) => {
    setWarningMessage(msg);
    setTimeout(() => {
      setWarningMessage("");
    }, 3000);
  };

  /* ================= API CALLS ================= */
  const loadStats = async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API}/stats`, { headers });
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.log("Stats error:", err);
    }
  };

  const loadUsers = async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API}/users`, { headers });
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.log("Users error:", err);
    }
  };

  const loadShopReports = async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API}/shop-reports`, { headers });
      const data = await res.json();
      setShopReports(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log("Shop reports error:", err);
      setShopReports([]);
    }
  };

  const loadReportCount = async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API}/report-notification-count`, { headers });
      const data = await res.json();
      setReportCount(data.count || 0);
    } catch (err) {
      console.log("Report count error:", err);
    }
  };

  const loadReportWarnings = async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API}/shop-report-warnings`, { headers });
      const data = await res.json();
      setReportWarnings(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log("Report warnings error:", err);
      setReportWarnings([]);
    }
  };

  const markReportNotificationsAsRead = async () => {
    try {
      const headers = await getAuthHeaders();
      await fetch(`${API}/report-notifications/read-all`, {
        method: "PATCH",
        headers,
      });
      setReportCount(0);
    } catch (err) {
      console.log("Mark report notifications read error:", err);
    }
  };

  const loadAdminNotifications = async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(API_URLS.ADMIN_NOTIFICATIONS, { headers });
      const data = await res.json();

      if (Array.isArray(data)) {
        setAdminNotifications(data);
        setNotificationCount(data.filter((n) => !n.isRead).length);
      }
    } catch (err) {
      console.log("Admin notifications error:", err);
    }
  };

  const suspendShopkeeper = async (shopkeeperId, reason) => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API}/shopkeepers/${shopkeeperId}/suspend`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();

      if (!res.ok) {
        showWarning(data.message || "Could not suspend shopkeeper");
        return;
      }

      showMessage("Shopkeeper suspended and hidden");
      loadShopReports();
      loadReportWarnings();
    } catch (err) {
      console.log("Suspend shopkeeper error:", err);
      showWarning("Could not suspend shopkeeper");
    }
  };

  const loadPendingRiders = async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API}/pending-riders`, { headers });
      const data = await res.json();

      if (Array.isArray(data)) {
        setRiders(data);
      } else {
        setRiders([]);
      }
    } catch (err) {
      console.log("Riders error:", err);
      setRiders([]);
    }
  };

  const updateRiderStatus = async (id, status) => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API}/update-rider/${id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        showMessage(`Rider ${status} successfully`);
        loadPendingRiders();
      } else {
        const errorData = await res.json();
        showWarning(errorData.message || "Failed to update status");
      }
    } catch (err) {
      console.log("Update rider error:", err);
      showWarning("Network error occurred");
    }
  };

  const createAdmin = async (username, password) => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API}/create-admin`, {
        method: "POST",
        headers,
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        const serverMsg = (data.message || "").toLowerCase();
        if (
          serverMsg.includes("exist") ||
          serverMsg.includes("already taken") ||
          serverMsg.includes("registered")
        ) {
          showWarning("Username exist");
        } else {
          showWarning(data.message || "Error creating admin");
        }
        return;
      }

      showMessage("Admin created successfully ✅");
      loadUsers();

      setFormUsername("");
      setFormPassword("");
    } catch (err) {
      console.log("Create admin error:", err);
      showWarning("Network error while creating admin");
    }
  };

  const removeAdmin = async (id) => {
    if (id === currentAdminId) {
      showWarning("You cannot remove yourself");
      return;
    }

    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API}/remove-admin/${id}`, {
        method: "DELETE",
        headers,
      });

      const data = await res.json();

      if (!res.ok) {
        showWarning(data.message || "Failed to remove admin");
        return;
      }

      showMessage("Admin removed successfully");
      loadUsers();
    } catch (err) {
      console.log("Remove admin error:", err);
      showWarning("Network error while removing admin");
    }
  };

  /* ================= HELPERS & TITLES ================= */
  const getHeaderTitle = () => {
    if (activeScreen === "filter") return "Filter Users";
    if (activeScreen === "riders") return "Rider Requests";
    if (activeScreen === "admins") return "Admin Management";
    if (activeScreen === "stats") return "Platform Stats";
    if (activeScreen === "shopReports") return "Shopkeeper Reports";
    return "SHOPSIE";
  };

  const formatReportTitle = (title) =>
    title === "OTHER_REASON" ? "Other reason" : "Shop doesn't exist";

  const formatDateTime = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Unknown time";
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  };

  const warningShopkeeperIds = reportWarnings.map((w) => w.shopkeeperId);

  const markNotificationsAsRead = async () => {
    try {
      const headers = await getAuthHeaders();
      await fetch(API_URLS.ADMIN_NOTIFICATIONS_READ_ALL, {
        method: "PATCH",
        headers,
      });
      setNotificationCount(0);
      setAdminNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true })),
      );
    } catch (err) {
      console.log("Mark read error:", err);
    }
  };

  /* ================= SUB-COMPONENTS ================= */
  const Header = () =>
    activeScreen === "dashboard" ? (
      <LinearGradient
        colors={["#eef4fe", "#2e4466"]}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 0 }}
        style={styles.header}
      >
        <Text style={styles.logo}>SHOPSIE</Text>

        <View style={styles.icons}>
          <TouchableOpacity onPress={() => router.push("/notifications")}>
            <Ionicons name="notifications" size={24} color="#2e4466" />

            {notificationCount > 0 && (
              <View
                style={{
                  position: "absolute",
                  top: -8,
                  right: -6,
                  minWidth: 18,
                  height: 18,
                  borderRadius: 9,
                  backgroundColor: "#EF4444",
                  alignItems: "center",
                  justifyContent: "center",
                  paddingHorizontal: 4,
                }}
              >
                <Text
                  style={{ color: "#fff", fontSize: 10, fontWeight: "800" }}
                >
                  {notificationCount > 9 ? "9+" : notificationCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() =>
              router.push({
                pathname: "/settings",
                params: { role: "admin" },
              })
            }
          >
            <Ionicons name="settings" size={24} color="#2e4466" />
          </TouchableOpacity>
        </View>
      </LinearGradient>
    ) : (
      <LinearGradient
        colors={["#eef4fe", "#2e4466"]}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 0 }}
        style={[styles.header, styles.linkedHeader]}
      >
        <TouchableOpacity
          onPress={() => setActiveScreen("dashboard")}
          style={styles.headerSide}
        >
          <Ionicons name="chevron-back" size={28} color="#eef4fe" />
        </TouchableOpacity>

        <Text style={styles.pageHeaderTitle}>{getHeaderTitle()}</Text>
        <View style={styles.headerSide} />
      </LinearGradient>
    );

  const DashboardView = () => (
    <>
      <View style={styles.profileCard}>
        <Image
          source={{ uri: adminProfileImage }}
          style={styles.profileImage}
        />
        <Text style={styles.username}>{adminUsername}</Text>
      </View>

      <View style={styles.dashboardWrapper}>
        <View style={styles.boxRow}>
          <TouchableOpacity
            style={styles.box}
            onPress={() => {
              loadUsers();
              setActiveScreen("filter");
            }}
          >
            <Ionicons name="filter-outline" size={35} color="white" />
            <Text style={styles.boxText}>Filter Users</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.box}
            onPress={() => {
              loadPendingRiders();
              setActiveScreen("riders");
            }}
          >
            <MaterialCommunityIcons name="bike-fast" size={35} color="white" />
            <Text style={styles.boxText}>Rider Requests</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.boxRow}>
          <TouchableOpacity
            style={styles.box}
            onPress={() => {
              loadStats();
              setActiveScreen("stats");
            }}
          >
            <Ionicons name="stats-chart-outline" size={35} color="white" />
            <Text style={styles.boxText}>Platform Stats</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.box}
            onPress={() => {
              loadUsers();
              setActiveScreen("admins");
            }}
          >
            <MaterialCommunityIcons
              name="account-cog-outline"
              size={35}
              color="white"
            />
            <Text style={styles.boxText}>Admin Management</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.wideBox}
          onPress={() => {
            loadShopReports();
            setActiveScreen("shopReports");
          }}
        >
          <Ionicons name="flag-outline" size={24} color="#2e4466" />
          <Text style={styles.wideBoxText}>View Shopkeeper Reports</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const FilterUsersView = () => {
    const [filterType, setFilterType] = useState("username");
    const [query, setQuery] = useState("");

    const roleOptions = ["rider", "customer", "shopkeeper", "admin"];
    const filtered = users.filter((u) => {
      if (filterType === "username")
        return u.username?.toLowerCase().includes(query.toLowerCase());
      if (filterType === "role")
        return u.role?.toLowerCase().includes(query.toLowerCase());
      return false;
    });

    const getInitials = (name = "") =>
      name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() || "U";

    return (
      <ScrollView
        style={styles.screenScroll}
        contentContainerStyle={styles.screenContent}
      >
        <View style={styles.dropdown}>
          {["username", "role"].map((t) => (
            <TouchableOpacity
              key={t}
              style={[
                styles.dropdownItem,
                filterType === t && styles.dropdownItemActive,
              ]}
              onPress={() => {
                setFilterType(t);
                setQuery("");
              }}
            >
              <Text
                style={[
                  styles.dropdownText,
                  filterType === t && styles.dropdownTextActive,
                ]}
              >
                {t.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {filterType === "role" ? (
          <View style={styles.dropdown}>
            {roleOptions.map((r) => (
              <TouchableOpacity
                key={r}
                style={[
                  styles.dropdownItem,
                  query === r && styles.dropdownItemActive,
                ]}
                onPress={() => setQuery(r)}
              >
                <Text
                  style={[
                    styles.dropdownText,
                    query === r && styles.dropdownTextActive,
                  ]}
                >
                  {r.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <TextInput
            style={styles.input}
            placeholder="Search username..."
            placeholderTextColor="#94a3b8"
            value={query}
            onChangeText={setQuery}
          />
        )}

        {filtered.length === 0 ? (
          <Text style={styles.emptyText}>No Users Found</Text>
        ) : (
          filtered.map((u) => (
            <View key={u.id} style={styles.userCard}>
              <View style={styles.userInfo}>
                {getProfileImageUri(u.profileImage) ? (
                  <Image
                    source={{ uri: getProfileImageUri(u.profileImage) }}
                    style={styles.userAvatarImage}
                  />
                ) : (
                  <View style={styles.userAvatar}>
                    <Text style={styles.userAvatarText}>
                      {getInitials(u.username)}
                    </Text>
                  </View>
                )}
                <View>
                  <Text style={styles.userNameText}>{u.username}</Text>
                  <Text style={styles.userMetaText}>Registered user</Text>
                </View>
              </View>
              <Text
                style={[
                  styles.roleBadge,
                  u.role === "admin" && styles.roleBadgeAdmin,
                  u.role === "shopkeeper" && styles.roleBadgeShopkeeper,
                  u.role === "rider" && styles.roleBadgeRider,
                  u.role === "customer" && styles.roleBadgeCustomer,
                ]}
              >
                {u.role}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    );
  };

  const RiderRequestsView = () => (
    <ScrollView
      style={styles.screenScroll}
      contentContainerStyle={styles.screenContent}
    >
      {riders.length === 0 ? (
        <Text style={styles.emptyText}>No Rider Requests Found</Text>
      ) : (
        riders.map((r) => {
          const docs = [
            r.cnicFrontPhoto ? `${UPLOADS}/${r.cnicFrontPhoto}` : null,
            r.cnicBackPhoto ? `${UPLOADS}/${r.cnicBackPhoto}` : null,
            r.vehicleDocument ? `${UPLOADS}/${r.vehicleDocument}` : null,
          ].filter(Boolean);

          return (
            <View key={r.id} style={styles.card}>
              <Text style={styles.cardTitle}>{r.user?.username}</Text>
              <Text style={styles.cardSubText}>{r.user?.email}</Text>

              <View style={styles.docRow}>
                {docs.map((img, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => {
                      setImages(docs);
                      setImageIndex(i);
                      setImageModal(true);
                    }}
                  >
                    {Platform.OS === "web" ? (
                      <img
                        src={img}
                        alt="doc"
                        style={{
                          width: 110,
                          height: 110,
                          objectFit: "cover",
                          borderRadius: 10,
                          border: "2px solid #ddd",
                          backgroundColor: "#f5f5f5",
                        }}
                      />
                    ) : (
                      <Image
                        source={{ uri: img }}
                        style={styles.docImg}
                        resizeMode="cover"
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              <View
                style={[
                  styles.actionRow,
                  {
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    marginTop: 12,
                  },
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.approveBtn,
                    { flex: 1, justifyContent: "center", alignItems: "center" },
                  ]}
                  onPress={() =>
                    openConfirmModal({
                      title: "Approve Rider",
                      message:
                        "Are you sure you want to approve this rider request?",
                      confirmText: "Approve",
                      isDanger: false,
                      onConfirm: () => updateRiderStatus(r.id, "approved"),
                    })
                  }
                >
                  <Text style={styles.actionText}>Approve</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.rejectBtn,
                    { flex: 1, justifyContent: "center", alignItems: "center" },
                  ]}
                  onPress={() =>
                    openConfirmModal({
                      title: "Reject Rider",
                      message:
                        "Are you sure you want to reject this rider? This will delete the account.",
                      confirmText: "Reject",
                      isDanger: true,
                      onConfirm: () => updateRiderStatus(r.id, "rejected"),
                    })
                  }
                >
                  <Text style={styles.actionText}>Reject</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}

      <Modal
        visible={imageModal}
        animationType="fade"
        transparent
        onRequestClose={() => setImageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <SafeAreaView
            style={{
              flex: 1,
              width: "100%",
              backgroundColor: "rgba(0,0,0,0.95)",
              justifyContent: "center",
            }}
          >
            <View
              style={[
                styles.imageHeader,
                {
                  paddingHorizontal: 16,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                },
              ]}
            >
              <TouchableOpacity onPress={() => setImageModal(false)}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
              <Text
                style={[styles.imageCounter, { color: "#fff", fontSize: 16 }]}
              >
                {imageIndex + 1} / {images.length}
              </Text>
            </View>

            <ScrollView horizontal pagingEnabled>
              {images.map((img, i) =>
                Platform.OS === "web" ? (
                  <img
                    key={i}
                    src={img}
                    alt="zoom"
                    style={{
                      width: SCREEN_WIDTH,
                      height: "80vh",
                      objectFit: "contain",
                    }}
                  />
                ) : (
                  <Image
                    key={i}
                    source={{ uri: img }}
                    style={styles.fullImage}
                    resizeMode="contain"
                  />
                ),
              )}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </ScrollView>
  );

  const StatsView = () => (
    <ScrollView
      style={styles.screenScroll}
      contentContainerStyle={styles.screenContent}
    >
      {stats && (
        <>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total Users</Text>
            <Text style={styles.statValue}>{stats.totalUsers}</Text>
          </View>

          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Pending Riders</Text>
            <Text style={styles.statValue}>{stats.pendingRiders}</Text>
          </View>
        </>
      )}
    </ScrollView>
  );

  const ShopReportsView = () => (
    <ScrollView
      style={styles.screenScroll}
      contentContainerStyle={styles.screenContent}
    >
      {shopReports.length === 0 ? (
        <Text style={styles.emptyText}>No Shop Reports Found</Text>
      ) : (
        shopReports.map((report) => (
          <View key={report.id} style={styles.reportCard}>
            <View style={styles.reportHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>
                  {report.shopkeeper?.shopDetails?.shopName ||
                    report.shopkeeper?.shopName ||
                    "Shop"}
                </Text>
                <Text style={styles.cardSubText}>
                  Reported by: {report.reporter?.username || "Unknown user"}
                </Text>
              </View>
              <Text style={styles.reportTitleBadge}>
                {formatReportTitle(report.title)}
              </Text>
            </View>

            <Text style={styles.reportMeta}>
              Reason: {report.reason || "No extra reason provided."}
            </Text>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 6,
              }}
            >
              <Text style={[styles.reportMeta, { flex: 1, marginRight: 12 }]}>
                Time and date: {formatDateTime(report.createdAt)}
              </Text>

              {warningShopkeeperIds.includes(report.shopkeeperId) &&
                !report.shopkeeper?.isSuspended && (
                  <TouchableOpacity
                    style={styles.warningSuspendBtn}
                    onPress={() =>
                      openConfirmModal({
                        title: "Suspend Shopkeeper",
                        message:
                          "Suspend this shopkeeper account? The shop data will stay in the database but will be hidden from customers and riders.",
                        confirmText: "Suspend",
                        isDanger: true,
                        reasonRequired: true,
                        onConfirm: (reason) =>
                          suspendShopkeeper(report.shopkeeperId, reason),
                      })
                    }
                  >
                    <Ionicons
                      name="ban-outline"
                      size={16}
                      color="#fff"
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.warningSuspendText}>
                      Suspend Shopkeeper
                    </Text>
                  </TouchableOpacity>
                )}
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );

  const BottomNav = () => (
    <View style={styles.bottomNav}>
      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => setActiveScreen("dashboard")}
      >
        <Ionicons name="home" size={22} color="white" />
        <Text style={styles.navText}>Home</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => {
          loadUsers();
          setActiveScreen("admins");
        }}
      >
        <MaterialCommunityIcons
          name="account-cog-outline"
          size={22}
          color="white"
        />
        <Text style={styles.navText}>Admins</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.tabItem}
        onPress={async () => {
          loadShopReports();
          loadReportWarnings();
          await markReportNotificationsAsRead();
          setActiveScreen("shopReports");
        }}
      >
        <View style={{ position: "relative" }}>
          <Ionicons name="flag-outline" size={22} color="white" />
          {reportCount > 0 && (
            <View
              style={{
                position: "absolute",
                top: -8,
                right: -10,
                minWidth: 18,
                height: 18,
                borderRadius: 9,
                backgroundColor: "#EF4444",
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: 4,
              }}
            >
              <Text style={{ color: "#fff", fontSize: 10, fontWeight: "800" }}>
                {reportCount > 9 ? "9+" : reportCount}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.navText}>Reports</Text>
      </TouchableOpacity>
    </View>
  );

  /* ================= MAIN RENDER ================= */
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={styles.scrollContainer}>
        <Header />
        {activeScreen === "dashboard" && <DashboardView />}
        {activeScreen === "filter" && <FilterUsersView />}
        {activeScreen === "riders" && <RiderRequestsView />}
        {activeScreen === "admins" && (
          <AdminManagementView
            users={users}
            currentAdminId={currentAdminId}
            formUsername={formUsername}
            setFormUsername={setFormUsername}
            formPassword={formPassword}
            setFormPassword={setFormPassword}
            openConfirmModal={openConfirmModal}
            createAdmin={createAdmin}
            removeAdmin={removeAdmin}
            showWarning={showWarning}
            styles={styles}
          />
        )}
        {activeScreen === "stats" && <StatsView />}
        {activeScreen === "shopReports" && <ShopReportsView />}

        <ConfirmationModal
          confirmModal={confirmModal}
          suspensionReason={suspensionReason}
          setSuspensionReason={setSuspensionReason}
          closeConfirmModal={closeConfirmModal}
          handleConfirmAction={handleConfirmAction}
          styles={styles}
        />

        {/* ================= FLOATING TOAST NOTIFICATIONS ================= */}
        {warningMessage !== "" && (
          <View style={styles.warningBox}>
            <Ionicons name="warning-outline" size={22} color="#fff" />
            <Text style={styles.warningText}>{warningMessage}</Text>
          </View>
        )}

        {message !== "" && (
          <View style={styles.warningBox}>
            <Ionicons name="checkmark-circle-outline" size={22} color="#fff" />
            <Text style={styles.warningText}>{message}</Text>
          </View>
        )}

        <BottomNav />
      </View>
    </SafeAreaView>
  );
}

/* ================= EXTRACTED INDEPENDENT SUB-COMPONENTS ================= */
function AdminManagementView({
  users,
  currentAdminId,
  formUsername,
  setFormUsername,
  formPassword,
  setFormPassword,
  openConfirmModal,
  createAdmin,
  removeAdmin,
  showWarning,
  styles,
}) {
  const admins = users.filter((u) => u.role === "admin");

  return (
    <ScrollView
      style={styles.screenScroll}
      contentContainerStyle={styles.screenContent}
    >
      {admins.map((a) => (
        <View
          key={a.id}
          style={[
            styles.card,
            {
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            },
          ]}
        >
          <Text style={styles.cardTitle}>{a.username}</Text>

          {a.id !== currentAdminId && (
            <TouchableOpacity
              style={styles.removeAdminBtn}
              onPress={() => {
                openConfirmModal({
                  title: "Remove Admin",
                  message: `Are you sure you want to remove ${a.username} from admins?`,
                  confirmText: "Remove",
                  isDanger: true,
                  onConfirm: () => removeAdmin(a.id),
                });
              }}
            >
              <Text style={styles.actionText}>Remove Admin</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}

      <View style={styles.card}>
        <TextInput
          style={styles.input}
          placeholder="Admin Username"
          placeholderTextColor="#94a3b8"
          value={formUsername}
          onChangeText={setFormUsername}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#94a3b8"
          secureTextEntry
          value={formPassword}
          onChangeText={setFormPassword}
        />

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => {
            if (!formUsername.trim() || !formPassword.trim()) {
              showWarning("Please fill all fields");
              return;
            }

            if (formPassword.length < 5) {
              showWarning("Password must be at least 5 characters long");
              return;
            }

            openConfirmModal({
              title: "Create Admin Account",
              message: `Do you want to create "${formUsername}" as an admin account?`,
              confirmText: "Create",
              isDanger: false,
              onConfirm: () => createAdmin(formUsername, formPassword),
            });
          }}
        >
          <Text style={styles.primaryBtnText}>Create Admin</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
