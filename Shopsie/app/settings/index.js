import React, { useEffect, useState, useRef } from "react";
import { API_URLS } from "../../src/services/apiConfig";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Image,
  ScrollView,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";

const SCREEN_WIDTH = Dimensions.get("window").width;

export default function Settings() {
  const router = useRouter();

  const [userData, setUserData] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
  const [activeField, setActiveField] = useState("");
  const [newValueInput, setNewValueInput] = useState("");
  const [usernameStatus, setUsernameStatus] = useState(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // MODAL STATES
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  // ─── TRANSIENT WARNING STATUS BANNER STATE ─────────
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
    return () => {
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const loadData = async () => {
      const stored = await AsyncStorage.getItem("userData");
      if (stored) setUserData(JSON.parse(stored));
    };
    loadData();
  }, []);

  const openUpdateModal = (field) => {
    setActiveField(field);
    if (field !== "password") {
      setNewValueInput(userData[field] || "");
    } else {
      setNewValueInput("");
    }
    setUsernameStatus(null);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setModalVisible(true);
  };

  const checkUsername = async (value) => {
    setNewValueInput(value);
    if (activeField !== "username") return;
    if (!value.trim()) {
      setUsernameStatus(null);
      return;
    }

    try {
      const res = await fetch(`${API_URLS.CHECK_USERNAME}?username=${value}`);
      const data = await res.json();
      setUsernameStatus(data.available ? "available" : "taken");
    } catch {
      setUsernameStatus(null);
    }
  };

  const handleFinalUpdate = async () => {
    if (activeField === "password") return handlePasswordUpdate();

    if (!newValueInput.trim()) {
      return triggerWarningNotification(
        `Warning: ${activeField.charAt(0).toUpperCase() + activeField.slice(1)} field cannot be empty.`,
      );
    }

    if (newValueInput.trim() === userData[activeField]) {
      return triggerWarningNotification(
        `Warning: New value is identical to current ${activeField}.`,
      );
    }

    if (activeField === "username" && usernameStatus === "taken") {
      return triggerWarningNotification("Warning: Username is already taken.");
    }

    try {
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(API_URLS.SETTINGS_UPDATE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: userData.id,
          field: activeField,
          value: newValueInput.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok)
        return triggerWarningNotification(data.error || "Update failed");

      const updated = { ...userData, [activeField]: newValueInput.trim() };
      setUserData(updated);
      await AsyncStorage.setItem("userData", JSON.stringify(updated));

      setModalVisible(false);
      triggerWarningNotification("Success: Profile updated successfully!");
    } catch {
      triggerWarningNotification("Error: Profile attribute update failed");
    }
  };

  const handlePasswordUpdate = async () => {
    if (
      !currentPassword.trim() ||
      !newPassword.trim() ||
      !confirmPassword.trim()
    ) {
      return triggerWarningNotification(
        "Warning: All password input boxes are required.",
      );
    }

    if (currentPassword === newPassword) {
      return triggerWarningNotification(
        "Warning: New password cannot be the same as your current password.",
      );
    }

    if (newPassword !== confirmPassword) {
      return triggerWarningNotification(
        "Warning: New and Confirm passwords do not match.",
      );
    }

    try {
      const token = await AsyncStorage.getItem("token");

      const res = await fetch(API_URLS.SETTINGS_UPDATE_PASSWORD, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: userData.id,
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok)
        return triggerWarningNotification(
          data.error || "Password change failed",
        );

      setModalVisible(false);
      triggerWarningNotification("Success: Password securely updated.");
    } catch {
      triggerWarningNotification(
        "Error: Exception tracking password configuration update.",
      );
    }
  };

  const uploadImageToBackend = async (imageUri) => {
    try {
      const token = await AsyncStorage.getItem("token");
      const formData = new FormData();

      if (Platform.OS === "web") {
        const response = await fetch(imageUri);
        const blob = await response.blob();
        formData.append("profileImage", blob, "profile.jpg");
      } else {
        const filename = imageUri.split("/").pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image`;
        formData.append("profileImage", {
          uri: imageUri,
          name: filename,
          type,
        });
      }

      formData.append("userId", userData.id.toString());
      formData.append("field", "profileImage");
      formData.append("value", "");

      const res = await fetch(API_URLS.SETTINGS_UPDATE, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setUserData(data.user);
        await AsyncStorage.setItem("userData", JSON.stringify(data.user));
        triggerWarningNotification("Success: Profile picture updated!");
      } else {
        triggerWarningNotification(data.error || "Upload failed");
      }
    } catch (err) {
      console.error("Upload Error:", err);
      triggerWarningNotification("Error: File upload task failed");
    }
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted)
      return triggerWarningNotification(
        "Warning: Media library permissions denied",
      );

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) await uploadImageToBackend(result.assets[0].uri);
  };

  const handleLogoutConfirm = async () => {
    setLogoutModalVisible(false);
    await AsyncStorage.clear();
    router.replace("/signin");
  };

  const confirmDeleteAccount = () => {
    setDeleteModalVisible(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      const token = await AsyncStorage.getItem("token");

      const res = await fetch(API_URLS.SETTINGS_DELETE_ACCOUNT, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: userData.id }),
      });

      const data = await res.json();
      if (!res.ok)
        return triggerWarningNotification(
          data.error || "Failed to remove item layout",
        );

      await AsyncStorage.clear();
      setDeleteModalVisible(false);
      router.replace("/signin");
    } catch {
      triggerWarningNotification(
        "Error: Critical failure clearing credentials identity",
      );
    }
  };

  const renderField = (label, field) => (
    <View style={styles.card}>
      <View style={styles.fieldInfo}>
        <Text style={styles.userMetaText}>{label}</Text>
        {field === "password" ? (
          <Text style={styles.cardTitle}>••••••••</Text>
        ) : (
          <Text style={styles.cardTitle}>{userData[field] || "N/A"}</Text>
        )}
      </View>
      <TouchableOpacity
        style={styles.inlineUpdateBtn}
        onPress={() => openUpdateModal(field)}
      >
        <Text style={styles.inlineUpdateText}>Update</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={styles.scrollContainer}>
        <ScrollView
          style={styles.screenScroll}
          contentContainerStyle={styles.screenContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Aligned Header Section */}
          <View style={styles.headerContainer}>
            <TouchableOpacity
              onPress={() =>
                router.canGoBack()
                  ? router.back()
                  : router.navigate("/dashboardcustomer")
              }
              style={styles.headerSide}
            >
              <Ionicons name="chevron-back" size={28} color="#2e4466" />
            </TouchableOpacity>
            <View style={styles.headerTitleWrapper}>
              <Text style={styles.sectionTitle}>Shopsie Settings</Text>
            </View>
            <View style={{ width: 28 }} />
          </View>
          <Text
            style={[
              styles.cardSubText,
              { marginBottom: 16, textAlign: "center" },
            ]}
          >
            Manage your profile details and preferences
          </Text>

          {/* Profile Pic Section */}
          <View style={styles.avatarWrapper}>
            <View style={styles.imageContainer}>
              <Image
                source={{
                  uri:
                    userData?.profileImage ||
                    "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
                }}
                style={styles.avatar}
              />
              <TouchableOpacity onPress={pickImage} style={styles.addBtn}>
                <Text style={styles.addBtnText}>+</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.userNameHeader}>
              {userData?.username || "User Name"}
            </Text>
            <Text style={styles.userEmailHeader}>{userData?.email || ""}</Text>
          </View>

          {/* Fields List */}
          {renderField("Username", "username")}
          {renderField("Email", "email")}
          {renderField("Password", "password")}

          {/* Bottom Action Flow */}
          <View style={{ marginTop: 16 }}>
            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={() => setLogoutModalVisible(true)}
            >
              <Text style={styles.logoutBtnText}>Logout</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={confirmDeleteAccount}
            >
              <Text style={styles.deleteBtnText}>Delete Account</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.forgotPasswordWrapper}
              onPress={() =>
                router.push({
                  pathname: "/forgot-password",
                  params: { email: userData?.email || "" },
                })
              }
            >
              <Text style={styles.forgotPasswordLink}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* UPDATE MODAL */}
        <Modal
          visible={modalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={localStyles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={localStyles.modalBox}
            >
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={localStyles.closeCornerBtn}
              >
                <Text style={localStyles.closeX}>✕</Text>
              </TouchableOpacity>

              {activeField === "password" ? (
                <>
                  <Text style={localStyles.modalTitle}>Update Password</Text>
                  <Text style={localStyles.modalSubtitle}>
                    Please enter your modern security credentials
                  </Text>

                  <TextInput
                    style={styles.input}
                    placeholder="Current Password"
                    placeholderTextColor="#94a3b8"
                    secureTextEntry
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="New Password"
                    placeholderTextColor="#94a3b8"
                    secureTextEntry
                    value={newPassword}
                    onChangeText={setNewPassword}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm New Password"
                    placeholderTextColor="#94a3b8"
                    secureTextEntry
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                  />
                </>
              ) : (
                <>
                  <Text style={localStyles.modalTitle}>
                    Update{" "}
                    {activeField.charAt(0).toUpperCase() + activeField.slice(1)}
                  </Text>
                  <Text style={localStyles.modalSubtitle}>
                    Change your identity attributes below
                  </Text>

                  <TextInput
                    style={styles.input}
                    value={newValueInput}
                    onChangeText={checkUsername}
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="none"
                  />

                  {activeField === "username" && usernameStatus && (
                    <Text
                      style={[
                        styles.messageText,
                        usernameStatus === "available"
                          ? styles.statusAvailable
                          : styles.statusTaken,
                      ]}
                    >
                      Username is {usernameStatus}
                    </Text>
                  )}
                </>
              )}

              <View style={localStyles.shareButtonsRow}>
                <TouchableOpacity
                  style={[
                    localStyles.modalBtn,
                    { backgroundColor: "#f06543", marginRight: 10 },
                  ]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={localStyles.modalBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[localStyles.modalBtn, { backgroundColor: "#16a34a" }]}
                  onPress={handleFinalUpdate}
                >
                  <Text style={localStyles.modalBtnText}>Save</Text>
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>

        {/* LOGOUT CONFIRM MODAL */}
        <Modal
          visible={logoutModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setLogoutModalVisible(false)}
        >
          <View style={localStyles.modalOverlay}>
            <View style={localStyles.modalBox}>
              <TouchableOpacity
                onPress={() => setLogoutModalVisible(false)}
                style={localStyles.closeCornerBtn}
              >
                <Text style={localStyles.closeX}>✕</Text>
              </TouchableOpacity>

              <Text style={localStyles.modalTitle}>Logout?</Text>
              <Text style={localStyles.modalSubtitle}>
                Are you sure you want to securely log out of your session?
              </Text>

              <View style={localStyles.shareButtonsRow}>
                <TouchableOpacity
                  onPress={() => setLogoutModalVisible(false)}
                  style={[
                    localStyles.modalBtn,
                    { backgroundColor: "#f06543", marginRight: 10 },
                  ]}
                >
                  <Text style={localStyles.modalBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleLogoutConfirm}
                  style={[localStyles.modalBtn, { backgroundColor: "#2e4466" }]}
                >
                  <Text style={localStyles.modalBtnText}>Logout</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* DELETE CONFIRM MODAL */}
        <Modal
          visible={deleteModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setDeleteModalVisible(false)}
        >
          <View style={localStyles.modalOverlay}>
            <View style={localStyles.modalBox}>
              <TouchableOpacity
                onPress={() => setDeleteModalVisible(false)}
                style={localStyles.closeCornerBtn}
              >
                <Text style={localStyles.closeX}>✕</Text>
              </TouchableOpacity>

              <Text style={localStyles.modalTitle}>Delete Account?</Text>
              <Text style={localStyles.modalSubtitle}>
                Are you sure you want to permanently delete your account? This
                action cannot be undone.
              </Text>

              <View style={localStyles.shareButtonsRow}>
                <TouchableOpacity
                  onPress={() => setDeleteModalVisible(false)}
                  style={[
                    localStyles.modalBtn,
                    { backgroundColor: "#2e4466", marginRight: 10 },
                  ]}
                >
                  <Text style={localStyles.modalBtnText}>Keep Account</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleDeleteConfirm}
                  style={[localStyles.modalBtn, { backgroundColor: "#b91c1c" }]}
                >
                  <Text style={localStyles.modalBtnText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* FLOATING TRANSIENT NOTIFICATION LAYER */}
        {warningMessage ? (
          <View style={localStyles.warningBox}>
            <Ionicons
              name={
                warningMessage.startsWith("Success")
                  ? "checkmark-circle-outline"
                  : "warning-outline"
              }
              size={22}
              color="#fff"
            />
            <Text style={localStyles.warningText}>{warningMessage}</Text>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: "#f7f9fc",
    paddingHorizontal: 24,
    paddingTop: 10,
  },
  screenScroll: {
    flex: 1,
  },
  screenContent: {
    paddingTop: 2,
    paddingBottom: 40,
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
    marginBottom: 4,
  },
  headerSide: {
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitleWrapper: {
    flex: 1,
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#2e4466",
  },
  cardSubText: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: "500",
  },
  avatarWrapper: {
    alignItems: "center",
    marginBottom: 20,
    backgroundColor: "#ffffff",
    paddingVertical: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#dbe5f1",
    shadowColor: "#2e4466",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  imageContainer: { position: "relative" },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: "#eef4fe",
    backgroundColor: "#c2ccdb",
  },
  addBtn: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#16a34a",
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#ffffff",
    elevation: 3,
  },
  addBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginTop: -2,
  },
  userNameHeader: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
    marginTop: 8,
  },
  userEmailHeader: {
    fontSize: 13,
    color: "#7c8aa0",
    fontWeight: "500",
    marginTop: 2,
  },
  card: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#dbe5f1",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    elevation: 2,
  },
  fieldInfo: {
    flex: 1,
  },
  userMetaText: {
    color: "#7c8aa0",
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
  },
  inlineUpdateBtn: {
    backgroundColor: "#eef4fe",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d4e0ef",
  },
  inlineUpdateText: {
    color: "#2e4466",
    fontSize: 13,
    fontWeight: "700",
  },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#d8e1ee",
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginBottom: 14,
    fontSize: 15,
    color: "#1e293b",
    backgroundColor: "#ffffff",
  },
  logoutBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: "#2e4466",
    elevation: 3,
  },
  logoutBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  deleteBtn: {
    backgroundColor: "#b91c1c",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    elevation: 3,
  },
  deleteBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  forgotPasswordWrapper: {
    alignSelf: "center",
    padding: 8,
    marginTop: 8,
  },
  forgotPasswordLink: {
    color: "#16a34a",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  messageText: {
    width: "100%",
    textAlign: "center",
    fontWeight: "600",
    fontSize: 13,
    marginBottom: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    overflow: "hidden",
  },
  statusAvailable: {
    color: "#15803D",
    backgroundColor: "#d1fae5",
  },
  statusTaken: {
    color: "#B91C1C",
    backgroundColor: "#FEE2E2",
  },
});

const localStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 15,
  },
  modalBox: {
    width: "85%",
    backgroundColor: "#fff",
    borderRadius: 22,
    paddingTop: 20,
    paddingBottom: 25,
    paddingHorizontal: 20,
    alignItems: "center",
    position: "relative",
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
  modalTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111",
    marginTop: 10,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 15,
    color: "#666",
    marginTop: 10,
    marginBottom: 25,
    textAlign: "center",
  },
  shareButtonsRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 5,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
  },
  modalBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
    textAlign: "center",
  },
  warningBox: {
    position: "absolute",
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: "#E67E22",
    padding: 14,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 9999,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  warningText: {
    color: "#fff",
    marginLeft: 10,
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
});
