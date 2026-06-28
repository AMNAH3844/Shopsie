import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { API_URLS } from '../../src/services/apiConfig';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Animated,
  KeyboardAvoidingView
} from "react-native";
import React, { useState, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
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

  // const API_URL = "http://172.20.140.250:5000/api/auth";

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

    // 1. Precise Basic Empty Field Validations
    if (!signUpData.username.trim()) {
      triggerToast("Empty field: Username cannot be blank");
      return;
    }
    if (!signUpData.email.trim()) {
      triggerToast("Empty field: Email cannot be blank");
      return;
    }
    if (!signUpData.password) {
      triggerToast("Empty field: Password cannot be blank");
      return;
    }

    // 2. Structured Username/Password format conditions -> Unified single notification text
   if (signUpData.password.length < 5) {
  triggerToast("Password must be at least 5 characters long.");
  return;
}

if (signUpData.password !== signUpData.confirmPassword) {
  triggerToast("Passwords do not match.");
  return;
}

    // Rider Branch Class Validations
    if (selectedRole === "rider") {
      if (!signUpData.phoneNo.trim()) {
        triggerToast("Empty field: Phone number required");
        return;
      }
      if (!signUpData.cnicFront || !signUpData.cnicBack || !signUpData.vehicleDoc) {
        triggerToast("Missing documents: All files required");
        return;
      }
    }

    // Shopkeeper Class Validations
    if (selectedRole === "shopkeeper" && !signUpData.shopName.trim()) {
      triggerToast("Empty field: Shop Name required");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("username", signUpData.username.trim()); // exact case preservation
      formData.append("email", signUpData.email.trim().toLowerCase());
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
  return (
 <View style={{ flex: 1 }}>
  <KeyboardAvoidingView
    style={{ flex: 1 }}
    behavior={Platform.OS === "ios" ? "padding" : "height"}
    keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
  >
    <ScrollView
      style={styles.scrollContainer}
      contentContainerStyle={{
        flexGrow: 1,
        paddingBottom: 40,
      }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >



        <View style={styles.container}>
          <View style={[styles.header, styles.riderHeader]}>
            <Text style={[styles.logo]}>🛍️</Text>
            <Text style={[styles.title, styles.riderTitle]}>Shop. Smile. Repeat.</Text>
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
                onChangeText={(t) => setSignUpData({ ...signUpData, username: t })}
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
                onChangeText={(t) => setSignUpData({ ...signUpData, password: t })}
              />
              <TextInput
                style={styles.input}
                placeholder="Confirm Password"
                placeholderTextColor="#000000"
                secureTextEntry
                autoCapitalize="none"
                value={signUpData.confirmPassword}
                onChangeText={(t) => setSignUpData({ ...signUpData, confirmPassword: t })}
              />

              {selectedRole === "rider" && (
                <>
                  <TextInput
                    style={styles.input}
                    placeholder="Phone Number"
                    placeholderTextColor="#000000"
                    keyboardType="phone-pad"
                    value={signUpData.phoneNo}
                    onChangeText={(t) => setSignUpData({ ...signUpData, phoneNo: t })}
                  />

                  {["cnicFront", "cnicBack", "vehicleDoc"].map((f, i) => (
                    <TouchableOpacity key={i} style={styles.uploadButton} onPress={() => pickImage(f)}>
                      <Text style={styles.uploadText}>
                        {signUpData[f]
                          ? `✓ ${f.replace(/([A-Z])/g, " $1")} Uploaded`
                          : `📷 Upload ${f.replace(/([A-Z])/g, " $1")}`}
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
                  onChangeText={(t) => setSignUpData({ ...signUpData, shopName: t })}
                />
              )}
            </View>

            <TouchableOpacity style={[styles.button, styles.riderButton]} onPress={handleSignUp}>
              {loading ? <ActivityIndicator color="#0a0c47" /> : <Text style={styles.buttonText}>SIGN UP</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push("/signin")}>
              <Text style={styles.link}>
                Already have an Account? <Text style={styles.linkBold}>Sign In</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
            </ScrollView>
    </KeyboardAvoidingView>

      {alertVisible && (
        <Animated.View style={[customStyles.orangeToastContainer, { opacity: fadeAnim }]}>
          <Ionicons name="alert-circle" size={20} color="white" />
          <Text style={customStyles.orangeToastText}>{alertMessage}</Text>
        </Animated.View>
      )}
    </View>
  );
}

// 🎨 IN-LINE STYLES SHEET FOR ERROR OVERLAYS
const customStyles = {
  
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
    zIndex: 99999
  },
  orangeToastText: {
    color: "white",
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 10,
    flex: 1
  }
};