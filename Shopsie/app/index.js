import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function Welcome() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Shopsie</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push("/signin")}
      >
        <Text style={styles.buttonText}>SIGN IN?</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push("/role")}>
        <Text style={styles.signupText}>Create New Account?</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center", 
    backgroundColor: "#3f5375", // Deep Slate Blue
    padding: 20, 
  },
  title: { 
    fontSize: 24, 
    marginBottom: 30, 
    fontWeight: "700", 
    color: "#fff", // White text
  },
  button: { 
    width: "100%", // Full width matching your form cards
    backgroundColor: "#FFD60A", // Vibrant Yellow Accent
    padding: 15, 
    borderRadius: 12, // Standard layout border radius
    alignItems: "center", 
    marginBottom: 20, 
  },
  buttonText: { 
    color: "#0a0c47", // Deep Navy text on yellow
    fontSize: 16, 
    fontWeight: "700", 
  },
  signupText: { 
    color: "#a8f0e6", // Mint/Teal link accent for high visibility
    fontSize: 14, 
    fontWeight: "600",
  },
});