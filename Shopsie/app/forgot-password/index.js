import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { API_URLS } from "../../src/services/apiConfig";

export default function ForgotPassword() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [emailLocked, setEmailLocked] = useState(false);
  const [showLockedMessage, setShowLockedMessage] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [sendingLoading, setSendingLoading] = useState(false);

  // Warning toast states
  const [toastMessage, setToastMessage] = useState("");
  const [showToast, setShowToast] = useState(false);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2500);
  };

  useEffect(() => {
    const loadKnownAccount = () => {
      const paramUsername =
        typeof params.username === "string" ? params.username : "";

      if (paramUsername) {
        setUsername(paramUsername);
      }

      // Always require username lookup first
      setEmail("");
      setEmailLocked(false);
      setShowLockedMessage(false);
    };

    loadKnownAccount();
  }, [params.username]);

  const handleLockedEmailPress = () => {
    if (!emailLocked) return;
    setShowLockedMessage(true);
  };

  const handleLookupEmail = async () => {
    if (!username.trim()) {
      triggerToast("Username is required");
      return;
    }

    setLookupLoading(true);

    try {
      const res = await fetch(API_URLS.LOOKUP_RESET_EMAIL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        triggerToast(data.message || "No account found for this username");
        return;
      }

      setEmail(data.email || "");
      setEmailLocked(true);
      setShowLockedMessage(false);
    } catch (error) {
      console.error(error);
      triggerToast("Network error connecting to backend cluster.");
    } finally {
      setLookupLoading(false);
    }
  };

  const handleSendResetEmail = async () => {
    if (!emailLocked || !email.trim()) {
      triggerToast("Find your account email first");
      return;
    }

    setSendingLoading(true);

    try {
      const res = await fetch(API_URLS.FORGOT_PASSWORD, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        triggerToast(data.message || "Unable to send reset email");
        return;
      }

      // Show success variant or route directly after notification
      triggerToast("Reset email sent! Redirecting...");
      setTimeout(() => {
        router.replace("/signin");
      }, 2000);
    } catch (error) {
      console.error(error);
      triggerToast("Network error connecting to backend cluster.");
    } finally {
      setSendingLoading(false);
    }
  };

  const busy = lookupLoading || sendingLoading;

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Forgot Password</Text>

        <Text style={styles.subtitle}>
          Enter your username to find the email saved with your account.
        </Text>

        {!emailLocked && (
          <TextInput
            style={styles.input}
            placeholder="Username"
            placeholderTextColor="#555"
            autoCapitalize="none"
            autoCorrect={false}
            value={username}
            onChangeText={setUsername}
          />
        )}

        <TouchableOpacity activeOpacity={1} onPress={handleLockedEmailPress}>
          <TextInput
            style={[styles.input, styles.lockedInput]}
            placeholder="Account Email"
            placeholderTextColor="#555"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={false}
            value={email}
            onPressIn={handleLockedEmailPress}
          />
        </TouchableOpacity>

        {showLockedMessage && (
          <Text style={styles.errorText}>
            Email entered while signup can only change from settings.
          </Text>
        )}

        {!emailLocked ? (
          <TouchableOpacity
            style={[styles.button, busy && styles.buttonDisabled]}
            onPress={handleLookupEmail}
            disabled={busy}
          >
            {lookupLoading ? (
              <ActivityIndicator color="#0a0c47" />
            ) : (
              <Text style={styles.buttonText}>Find Account Email</Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.button, busy && styles.buttonDisabled]}
            onPress={handleSendResetEmail}
            disabled={busy}
          >
            {sendingLoading ? (
              <ActivityIndicator color="#0a0c47" />
            ) : (
              <Text style={styles.buttonText}>Send Reset Email</Text>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.link}>Back</Text>
        </TouchableOpacity>
      </ScrollView>

      {showToast && (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>{toastMessage}</Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#3f5375",
  },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  title: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    color: "#eef3f8",
    fontSize: 14,
    marginBottom: 24,
    textAlign: "center",
  },
  input: {
    backgroundColor: "#e6e6e6",
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  lockedInput: {
    color: "#444",
    backgroundColor: "#dfe5ef",
  },
  errorText: {
    color: "#ff4d4d",
    fontSize: 12,
    marginBottom: 12,
    textAlign: "center",
  },
  button: {
    backgroundColor: "#FFD60A",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 18,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#0a0c47",
    fontWeight: "700",
  },
  link: {
    color: "#a8f0e6",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  warningBox: {
    position: "absolute",
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: "#e67e22",
    padding: 14,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  warningText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
});