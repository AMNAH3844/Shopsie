import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Animated,
  StyleSheet,
} from "react-native";
import { ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { API_URLS } from "../../src/services/apiConfig";
import styles from "../styles/Authstyle";

export default function Signup() {
  const router = useRouter();
  const { selectedRole } = useLocalSearchParams();
  const [loading, setLoading] = useState(false);

  const [signUpData, setSignUpData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    phoneNo: "",
    shopName: "",
    cnicFront: null,
    cnicBack: null,
    vehicleDoc: null,
  });

  // Orange Toast Alert states
  const [alertMessage, setAlertMessage] = useState("");
  const [alertVisible, setAlertVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const triggerToast = (msg) => {
    setAlertMessage(msg);
    setAlertVisible(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setAlertVisible(false));
    }, 3500);
  };

  const appendImage = async (formData, key, asset) => {
    if (!asset) return;
    if (Platform.OS === "web") {
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      formData.append(key, blob, `${key}.jpg`);
    } else {
      formData.append(key, {
        uri: asset.uri,
        name: `${key}.jpg`,
        type: "image/jpeg",
      });
    }
  };

  const pickImage = async (field) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      setSignUpData({ ...signUpData, [field]: result.assets[0] });
    }
  };

  const handleSignUp = async () => {
    if (!selectedRole) {
      triggerToast("Role context configuration missing");
      return;
    }

    if (!signUpData.username.trim()) {
      triggerToast("Empty field: Username cannot be blank");
      return;
    }

    // Email basic and format validation
    const emailTrimmed = signUpData.email.trim().toLowerCase();
    if (!emailTrimmed) {
      triggerToast("Empty field: Email cannot be blank");
      return;
    }

    // Checks if email matches exactly standard text followed by @gmail.com
    const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
    if (!gmailRegex.test(emailTrimmed)) {
      triggerToast("Invalid format: Must be a valid @gmail.com address.");
      return;
    }

    if (!signUpData.password) {
      triggerToast("Empty field: Password cannot be blank");
      return;
    }

    if (signUpData.password.length < 5) {
      triggerToast("Password must be at least 5 characters long.");
      return;
    }
    if (signUpData.password !== signUpData.confirmPassword) {
      triggerToast("Passwords do not match.");
      return;
    }

    if (selectedRole === "rider") {
      if (!signUpData.phoneNo.trim()) {
        triggerToast("Empty field: Phone number required");
        return;
      }
      if (
        signUpData.phoneNo.includes("-") ||
        signUpData.phoneNo.includes(".")
      ) {
        triggerToast(
          "Invalid format: Phone number cannot contain negative signs or decimals",
        );
        return;
      }
      if (signUpData.phoneNo.length !== 11) {
        triggerToast("Invalid Phone Number: Must be exactly 11 digits long.");
        return;
      }
      if (
        !signUpData.cnicFront ||
        !signUpData.cnicBack ||
        !signUpData.vehicleDoc
      ) {
        triggerToast("Missing documents: All files required");
        return;
      }
    }

    if (selectedRole === "shopkeeper" && !signUpData.shopName.trim()) {
      triggerToast("Empty field: Shop Name required");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("username", signUpData.username.trim());
      formData.append("email", emailTrimmed);
      formData.append("password", signUpData.password);
      formData.append("role", selectedRole);

      if (selectedRole === "rider") {
        formData.append("phoneNo", signUpData.phoneNo.trim());
        await appendImage(formData, "cnicFront", signUpData.cnicFront);
        await appendImage(formData, "cnicBack", signUpData.cnicBack);
        await appendImage(formData, "vehicleDoc", signUpData.vehicleDoc);
      }

      if (selectedRole === "shopkeeper") {
        formData.append("shopName", signUpData.shopName.trim());
      }

      const res = await fetch(API_URLS.AUTH_SIGNUP, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        router.replace("/signin");
      } else {
        triggerToast(data.message || "Incorrect Username or Password");
      }
    } catch (err) {
      console.log(err);
      triggerToast("Network communication cluster timed out.");
    } finally {
      setLoading(false);
    }
  };

  const formatLabel = (str) => {
    if (str.startsWith("cnic")) {
      return "CNIC " + str.replace("cnic", "");
    }
    return str.replace(/([A-Z])/g, " $1");
  };

  return (
    <SafeAreaView style={customStyles.safeAreaRoot}>
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={customStyles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.container, customStyles.fixedContainer]}>
          <View style={[styles.header, styles.riderHeader]}>
            <Text style={styles.logo}>🛍️</Text>
            <Text style={[styles.title, styles.riderTitle]}>
              Shop. Smile. Repeat.
            </Text>
          </View>

          <View style={styles.form}>
            <View style={[styles.formCard, styles.riderForm]}>
              <TextInput
                style={styles.input}
                placeholder="Username"
                placeholderTextColor="#000000"
                autoCapitalize="none"
                autoCorrect={false}
                value={signUpData.username}
                onChangeText={(t) =>
                  setSignUpData({ ...signUpData, username: t })
                }
              />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#000000"
                keyboardType="email-address"
                autoCapitalize="none"
                value={signUpData.email}
                onChangeText={(t) => setSignUpData({ ...signUpData, email: t })}
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#000000"
                secureTextEntry
                autoCapitalize="none"
                value={signUpData.password}
                onChangeText={(t) =>
                  setSignUpData({ ...signUpData, password: t })
                }
              />
              <TextInput
                style={styles.input}
                placeholder="Confirm Password"
                placeholderTextColor="#000000"
                secureTextEntry
                autoCapitalize="none"
                value={signUpData.confirmPassword}
                onChangeText={(t) =>
                  setSignUpData({ ...signUpData, confirmPassword: t })
                }
              />

              {selectedRole === "rider" && (
                <>
                  <TextInput
                    style={styles.input}
                    placeholder="Phone Number"
                    placeholderTextColor="#000000"
                    keyboardType="phone-pad"
                    maxLength={11}
                    value={signUpData.phoneNo}
                    onChangeText={(t) => {
                      const cleanText = t.replace(/[-.]/g, "");
                      setSignUpData({ ...signUpData, phoneNo: cleanText });
                    }}
                  />

                  {["cnicFront", "cnicBack", "vehicleDoc"].map((f, i) => (
                    <TouchableOpacity
                      key={i}
                      style={styles.uploadButton}
                      onPress={() => pickImage(f)}
                    >
                      <Text style={styles.uploadText}>
                        {signUpData[f]
                          ? `✓ ${formatLabel(f)} Uploaded`
                          : `📷 Upload ${formatLabel(f)}`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  <Text style={styles.riderNote}>
                    * Your profile will be reviewed by admin before activation.
                  </Text>
                </>
              )}

              {selectedRole === "shopkeeper" && (
                <TextInput
                  style={styles.input}
                  placeholder="Shop Name"
                  placeholderTextColor="#000000"
                  value={signUpData.shopName}
                  onChangeText={(t) =>
                    setSignUpData({ ...signUpData, shopName: t })
                  }
                />
              )}
            </View>

            <TouchableOpacity
              style={[styles.button, styles.riderButton]}
              onPress={handleSignUp}
            >
              {loading ? (
                <ActivityIndicator color="#0a0c47" />
              ) : (
                <Text style={styles.buttonText}>SIGN UP</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push("/signin")}>
              <Text style={styles.link}>
                Already have an Account?{" "}
                <Text style={styles.linkBold}>Sign In</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {alertVisible && (
        <Animated.View
          style={[customStyles.orangeToastContainer, { opacity: fadeAnim }]}
        >
          <Ionicons name="alert-circle" size={20} color="white" />
          <Text style={customStyles.orangeToastText}>{alertMessage}</Text>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const customStyles = StyleSheet.create({
  safeAreaRoot: {
    flex: 1,
    backgroundColor: "#3f5375",
  },
  scrollContent: {
    flexGrow: 1,
  },
  fixedContainer: {
    padding: 20,
    minHeight: "100%",
    justifyContent: "flex-start",
    paddingTop: 40,
  },
  orangeToastContainer: {
    position: "absolute",
    bottom: 50,
    left: 20,
    right: 20,
    backgroundColor: "#E67E22",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
    zIndex: 99999,
  },
  orangeToastText: {
    color: "white",
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 10,
    flex: 1,
  },
});
