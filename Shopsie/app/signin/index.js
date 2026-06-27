import { useState, useEffect, useRef, useCallback } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { API_URLS } from '../../src/services/apiConfig';
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import styles from "../styles/Authstyle";

export default function Signin() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(false);

  const [loginData, setLoginData] = useState({
    username: "",
    password: "",
  });

  // Orange Toast Alert states
  const [alertMessage, setAlertMessage] = useState("");
  const [alertVisible, setAlertVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const triggerToast = useCallback((msg) => {
    setAlertMessage(msg);
    setAlertVisible(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Auto dismiss after 3.5 seconds
    setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setAlertVisible(false));
    }, 3500);
  }, [fadeAnim]);

  useEffect(() => {
    if (params.resetSuccess === "1") {
      triggerToast("Your password has been reset successfully.");
    }
  }, [params.resetSuccess, triggerToast]);

  // const API_URL = "http://172.20.140.250:5000/api/auth";

  const handleSignin = async () => {
    // 1. Precise Empty Field Checks
    if (!loginData.username.trim()) {
      triggerToast("Empty field: Username cannot be blank");
      return;
    }
    if (!loginData.password) {
      triggerToast("Empty field: Password cannot be blank");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(API_URLS.AUTH_SIGNIN, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: loginData.username.trim(), // preserves strict typed casing
          password: loginData.password
        }),
      });

      const data = await res.json();

      if (!res.ok) {
  console.log("Login Error:", data);

  triggerToast(
    data.message || "Login failed"
  );

  return;
}

      // Check case validation matching explicitly on the client side to be 100% secure
      if (data.user && data.user.username !== loginData.username.trim()) {
        triggerToast("Incorrect Username or Password");
        setLoading(false);
        return;
      }

      // SAVE USER SYSTEM TOKENS & METADATA
      await AsyncStorage.setItem("token", data.token);
      await AsyncStorage.setItem("role", data.user.role);

      await AsyncStorage.setItem(
        "userData",
        JSON.stringify({
          id: data.user.id,
          username: data.user.username,
          email: data.user.email || "",
          role: data.user.role,
          profileImage: data.user.profileImage || "",
        })
      );

      if (data.user && data.user.shopName) {
        await AsyncStorage.setItem("registrationShopName", data.user.shopName);
      }

      // DYNAMIC ROUTING NAVIGATION BASED ON ACCOUNT CLASS
      if (data.user.role === "admin") {
        router.replace("/adminDashboard");
      } else if (data.user.role === "shopkeeper") {
        router.replace("/shopkeeperDashboard");
      } else if (data.user.role === "rider") {
        router.replace("/riderDashboard");
      } else {
        router.replace("/customerDashboard");
      }

    } catch (err) {
      console.error(err);
      triggerToast("Network error connecting to backend cluster.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={{ paddingTop: 60 }} // 💡 Adds padding inside the scrolling view to safely push your header down
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.logo}>🛍️</Text>
            <Text style={styles.title}>Welcome Back!</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.formCard}>
              <TextInput
                style={styles.input}
                placeholder="Username"
                placeholderTextColor="#000"
                autoCapitalize="none"
                autoCorrect={false}
                value={loginData.username}
                onChangeText={(t) => setLoginData({ ...loginData, username: t })}
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#000"
                secureTextEntry
                autoCapitalize="none"
                value={loginData.password}
                onChangeText={(t) => setLoginData({ ...loginData, password: t })}
              />
            </View>

            {/* Sign In Button */}
            <TouchableOpacity style={styles.button} onPress={handleSignin}>
              {loading ? (
                <ActivityIndicator color="#0a0c47" />
              ) : (
                <Text style={styles.buttonText}>SIGN IN</Text>
              )}
            </TouchableOpacity>

            {/* Create Account Link */}
            <TouchableOpacity onPress={() => router.push("/role")}>
              <Text style={styles.link}>
                Don’t have an account?{" "}
                <Text style={styles.linkBold}>Create Account</Text>
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push("/forgot-password")}>
              <Text style={[styles.link, customStyles.forgotPasswordLink]}>
                Forgot Password?
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* ⚠️ ORANGE TOAST MODAL SYSTEM NOTIFICATION BAR */}
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
  },
  forgotPasswordLink: {
    color: "#a8f0e6",
    fontWeight: "700",
    marginTop: 10,
    textAlign: "center"
  }
};
