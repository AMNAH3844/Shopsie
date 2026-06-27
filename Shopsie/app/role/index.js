import { useRouter } from "expo-router";
import { useState, useRef } from "react";
import { Text, TouchableOpacity, View, ScrollView, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import styles from "../styles/Authstyle";

export default function Roleselection() {
  const [selectedRole, setSelectedRole] = useState("");
  const router = useRouter();

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

    // Auto dismiss after 3.5 seconds
    setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setAlertVisible(false));
    }, 3500);
  };

  const handleSubmit = () => {
    if (!selectedRole) {
      triggerToast("Please select a role before submitting");
      return;
    }
    
    router.push({ pathname: "/signup", params: { selectedRole } });
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={{ paddingTop: 60 }}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.logo}>🛍️</Text>
            <Text style={styles.title}>Choose your role</Text>
          </View>

          <View style={styles.form}>
            {[
              { role: "customer", icon: "👤", text: "Customer" },
              { role: "rider", icon: "🏍️", text: "Rider" },
              { role: "shopkeeper", icon: "🏪", text: "Shopkeeper" },
            ].map(({ role, icon, text }) => (
              <TouchableOpacity
                key={role}
                style={[
                  styles.roleCard,
                  selectedRole === role && styles.roleCardSelected,
                ]}
                onPress={() => setSelectedRole(role)}
              >
                <View style={styles.roleLeft}>
                  <Text style={styles.roleIcon}>{icon}</Text>
                  <Text style={styles.roleText}>{text}</Text>
                </View>

                {/* Circle indicator */}
                <View
                  style={[
                    styles.radioOuter,
                    selectedRole === role && styles.radioOuterSelected,
                  ]}
                >
                  {selectedRole === role && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>
            ))}
            
            <TouchableOpacity
              style={styles.button}
              onPress={handleSubmit}
            >
              <Text style={styles.buttonText}>SUBMIT</Text>
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
  }
};